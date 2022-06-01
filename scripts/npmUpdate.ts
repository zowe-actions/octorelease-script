/**
 * Copyright 2022 Octorelease Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fs from "fs";
import * as exec from "@actions/exec";
import { IContext, IProtectedBranch } from "@octorelease/core";
import { utils as gitUtils } from "@octorelease/git";
import * as utils from "../src/utils";

const updateDetails: string[] = [];
let resolutions: Record<string, string> = {};

interface IProtectedBranchWithDeps extends IProtectedBranch {
    dependencies: string[] | Record<string, string>;
    devDependencies: string[] | Record<string, string>;
}

function getDependencies(branch: IProtectedBranchWithDeps, dev: boolean) {
    const dependencies = dev ? branch.devDependencies : branch.dependencies;
    if (!Array.isArray(dependencies)) {
        return dependencies || {};
    }

    const dependencyMap = {};
    for (const pkgName of dependencies) {
        dependencyMap[pkgName] = branch.channel || "latest";
    }

    return dependencyMap;
}

async function updateDependency(pkgName: string, pkgTag: string, dev: boolean): Promise<void> {
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    const dependencies = packageJson[dev ? "devDependencies" : "dependencies"] || {};
    const currentVersion = dependencies[pkgName];
    // TODO What if current version has caret or tilde in front?

    if (resolutions[pkgName] == null) {
        resolutions[pkgName] = (await exec.getExecOutput("npm",
            ["view", `${pkgName}@${pkgTag}`, "version"])).stdout.trim();
    }
    const latestVersion = resolutions[pkgName];

    if (currentVersion !== latestVersion) {
        const npmArgs = dev ? ["--save-dev"] : ["--save-prod", "--save-exact"];
        await exec.exec("npm", ["install", `${pkgName}@${latestVersion}`, ...npmArgs]);
        updateDetails.push(`${pkgName}: ${currentVersion} -> ${latestVersion}`);
    }
}

export default async function (context: IContext): Promise<void> {
    const branchConfig = context.branch as IProtectedBranchWithDeps;
    if (branchConfig.dependencies == null && branchConfig.devDependencies == null) {
        return;
    }

    const pluralize = require("pluralize");
    const dependencies = getDependencies(branchConfig, false);
    const devDependencies = getDependencies(branchConfig, true);
    const changedFiles = ["package.json", "package-lock.json"];
    context.logger.info(`Checking for updates to ${pluralize("dependency", Object.keys(dependencies).length, true)} ` +
        `and ${pluralize("dev dependency", Object.keys(devDependencies).length, true)}`);

    const artifactName = utils.getArtifactName("resolutions");
    const resolutionsCached = await utils.readArtifactJson<typeof resolutions>(artifactName);
    if (resolutionsCached != null) {
        resolutions = resolutionsCached;
        if (Object.keys(resolutions).length === 0) {
            return;
        }
    }

    if (branchConfig.dependencies != null) {
        for (const [pkgName, pkgTag] of Object.entries(dependencies)) {
            await updateDependency(pkgName, pkgTag, false);
        }
    }

    if (branchConfig.devDependencies) {
        for (const [pkgName, pkgTag] of Object.entries(devDependencies)) {
            await updateDependency(pkgName, pkgTag, true);
        }
    }

    if (resolutionsCached == null) {
        await utils.writeArtifactJson(artifactName, resolutions);
    }

    if (updateDetails.length > 0) {
        if (fs.existsSync("lerna.json")) {
            changedFiles.push("**/package.json");
            const dependencyList = [...Object.keys(dependencies), ...Object.keys(devDependencies)];

            await exec.exec("npx", ["-y", "--", "syncpack", "fix-mismatches", "--dev", "--prod", "--filter",
                dependencyList.join("|")]);
            await exec.exec("git", ["checkout", "package-lock.json"]);
            await exec.exec("npm", ["install"]);
        }

        if (context.env.GIT_COMMITTER_NAME !== null && context.env.GIT_COMMITTER_EMAIL !== null) {
            await gitUtils.gitConfig(context);
            await gitUtils.gitAdd(...changedFiles);
            await gitUtils.gitCommit("Update dependencies [ci skip]\n\n" + updateDetails.join("\n"));
        }
    }
}
