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
import * as core from "@actions/core";
import { IContext } from "@octorelease/core";
import * as utils from "../src/utils";

export default async function (context: IContext): Promise<void> {
    const artifactName = utils.getArtifactName("lock");
    const lockFile = await utils.readArtifactJson(artifactName);
    if (lockFile == null) {
        await utils.writeArtifactJson(artifactName, {});
    } else {
        context.logger.warn("Skipping Sonar scan because it already ran");
        return;
    }

    const sonarArgs: { [key: string]: any } = {};
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    sonarArgs["sonar.projectVersion"] = packageJson.version;
    sonarArgs["sonar.links.ci"] =
        `https://github.com/${(context.ci as any).slug}/actions/runs/${(context.ci as any).build}`;

    const pr = await utils.findCurrentPr();
    if (pr != null) {
        sonarArgs["sonar.pullrequest.key"] = pr.number;
        sonarArgs["sonar.pullrequest.branch"] = pr.head.ref;
        sonarArgs["sonar.pullrequest.base"] = pr.base.ref;
    } else {
        sonarArgs["sonar.branch.name"] = context.ci.branch as string;
    }

    context.logger.info("Sonar scan arguments:\n" + JSON.stringify(sonarArgs, null, 2));
    core.setOutput("result", Object.entries(sonarArgs).map(([k, v]) => `-D${k}=${v}`).join("\n"));
}
