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
import { pipeline, Readable } from "stream";
import { promisify } from "util";
import * as core from "@actions/core";
import * as github from "@actions/github";

export async function downloadArtifact(runId: number, artifactName: string, extractPath?: string): Promise<void> {
    const octokit = github.getOctokit(core.getInput("github-token") || process.env.GITHUB_TOKEN as string);
    core.debug("Gathering artifact information...");
    const artifactInfo = (await octokit.rest.actions.listWorkflowRunArtifacts({
        ...github.context.repo,
        run_id: runId
    })).data.artifacts.find((a) => a.name === artifactName);
    if (artifactInfo == null) {
        throw new Error(`Could not find artifact ${artifactName} for run ID ${runId}`);
    }
    core.debug(`Artifact information:\n${JSON.stringify(artifactInfo)}`);
    core.debug("Downloading artifact...");
    const artifactRaw = Buffer.from((await octokit.rest.actions.downloadArtifact({
        ...github.context.repo,
        artifact_id: artifactInfo.id,
        archive_format: "zip"
    })).data as any);
    if (extractPath != null) {
        fs.mkdirSync(extractPath, { recursive: true });
    }
    core.debug("Downloading artifact...");
    await promisify(pipeline)(Readable.from(artifactRaw),
        require("unzip-stream").Extract({ path: extractPath ?? process.cwd() }));
}

export async function findCurrentPr(state = "open"): Promise<any | undefined> {
    core.debug("Gather information about current pull request");
    const octokit = github.getOctokit(core.getInput("github-token") || process.env.GITHUB_TOKEN as string);
    core.debug(`Looking through ${state?.toUpperCase() ?? ""} pull requests`);
    if (github.context.payload.workflow_run == null) {
        const prs = (await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
            ...github.context.repo,
            commit_sha: github.context.sha
        })).data.filter(pr => !state || pr.state === state);
        core.debug(`Found ${prs.length} ${state?.toUpperCase() ?? ""} pull request(s)`);
        return prs.find(pr => github.context.payload.ref === `refs/heads/${pr.head.ref}`) || prs[0];
    } else {
        const [owner, repo] = github.context.payload.workflow_run.head_repository.full_name.split("/", 2);
        const repoName = github.context.payload.workflow_run.repository.full_name;
        const prs = (await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
            owner, repo,
            commit_sha: github.context.payload.workflow_run.head_sha
        })).data.filter(pr => (!state || pr.state === state) && pr.base.repo.full_name === repoName);
        core.debug(`Found ${prs.length} ${state?.toUpperCase() ?? ""} pull request(s) in: ${repoName}`);
        return prs.find(pr => pr.head.ref === github.context.payload.workflow_run.head_branch) || prs[0];
    }
}
