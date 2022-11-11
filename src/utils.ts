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

export async function downloadArtifact(workflowId: string, commitSha: string, artifactName: string,
    extractPath?: string): Promise<void> {
    const octokit = github.getOctokit(core.getInput("github-token") || process.env.GITHUB_TOKEN as string);
    const lastSuccessfulRunId = (await octokit.rest.actions.listWorkflowRuns({
        ...github.context.repo,
        workflow_id: workflowId,
        status: "success",
        per_page: 1,
        head_sha: commitSha
    })).data.workflow_runs[0].id;
    const artifactInfo = (await octokit.rest.actions.listWorkflowRunArtifacts({
        ...github.context.repo,
        run_id: lastSuccessfulRunId
    })).data.artifacts.find((a) => a.name === artifactName);
    if (artifactInfo == null) {
        throw new Error(`Could not find artifact ${artifactName} for run ID ${lastSuccessfulRunId}`);
    }
    const artifactRaw = Buffer.from((await octokit.rest.actions.downloadArtifact({
        ...github.context.repo,
        artifact_id: artifactInfo.id,
        archive_format: "zip"
    })).data as any);
    if (extractPath != null) {
        fs.mkdirSync(extractPath, { recursive: true });
    }
    await promisify(pipeline)(Readable.from(artifactRaw),
        require("unzip-stream").Extract({ path: extractPath ?? process.cwd() }));
}

export async function findCurrentPr(): Promise<any | undefined> {
    const octokit = github.getOctokit(core.getInput("github-token") || process.env.GITHUB_TOKEN as string);
    const result = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        ...github.context.repo,
        commit_sha: github.context.sha
    });
    return result.data.find(pr => pr.state === "open" && github.context.payload.ref === `refs/heads/${pr.head.ref}`);
}
