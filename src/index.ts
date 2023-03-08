#!/usr/bin/env node

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

import * as path from "path";
import * as core from "@actions/core";
import { utils as coreUtils } from "@octorelease/core";
import { loadScript, RELEASE_SCRIPTS } from "./loader";
import * as utils from "./utils";

async function run(): Promise<void> {
    try {
        const scriptName = core.getInput("script");
        const workingDir = core.getInput("working-dir");
        if (workingDir) {
            core.debug(`Changing working directory to '${workingDir}'`);
            process.chdir(path.resolve(workingDir));
        }

        const prBranch = (await utils.findCurrentPr())?.base.ref;
        const context = await coreUtils.buildContext({
            branch: prBranch,
            force: !RELEASE_SCRIPTS.includes(scriptName)
        });
        if (context == null) {
            core.warning("Current branch is not targeting a release branch, exiting now");
            process.exit();
        }
        context.logger.pluginName = scriptName;
        await loadScript(scriptName)(context);
    } catch (error) {
        if (error instanceof Error) {
            core.error(error.stack || error.message);
        }
        core.setFailed(error as Error);
    }
}

run();
