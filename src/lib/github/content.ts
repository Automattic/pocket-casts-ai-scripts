import { getOctokit } from "./octokit";
import type { Octokit } from "octokit";
import { getPullRequest } from "./pull-requests";
import { getIssue } from "./issues";
import type { Repository } from "./octokit";
import type { Endpoints } from "@octokit/types";
import { logger } from "../logger";

type FileContent = {
	content: string;
	decodedContent: string;
	[key: string]: unknown;
};

type GitHubResponse =
	| { type: "pr"; data: PullRequest }
	| { type: "issue"; data: Issue }
	| { type: "file"; data: FileContent };

type PullRequest =
	Endpoints["GET /repos/{owner}/{repo}/pulls/{pull_number}"]["response"]["data"];
type Issue =
	Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}"]["response"]["data"];

type GitHubError = Error & {
	status?: number;
};

/**
 * Fetch file content from GitHub repository
 */
async function fetchFile(
	octokit: Octokit,
	owner: string,
	repo: string,
	path?: string,
	ref?: string,
): Promise<{ type: "file"; data: FileContent } | null> {
	if (!path || !ref) {
		throw new Error("Path and branch are required for file content");
	}

	logger().info(`[GitHub API] Fetching content from ${owner}/${repo}/${path}`);
	const { data } = await octokit.rest.repos.getContent({
		owner,
		repo,
		path,
		ref,
	});

	if ("content" in data && typeof data.content === "string") {
		return {
			type: "file",
			data: {
				...data,
				decodedContent: Buffer.from(
					data.content,
					"base64",
				).toString("utf-8"),
			},
		};
	}
	return null;
}

/**
 * Given a GitHub meta object, return the content.
 * This can be a GitHub issue, PR, or file.
 */
export async function getGithubContent(
	meta: Repository,
): Promise<GitHubResponse> {
	const octokit = await getOctokit();

	try {
		switch (meta.type) {
			case "pull":
			case "pulls": {
				if (!meta.number) {
					throw new Error("Pull request number is required");
				}
				const pr = await getPullRequest({
					number: meta.number,
					owner: meta.owner,
					repo: meta.repo,
				});
				if (!pr) {
					throw new Error("Pull request not found");
				}
				return { type: "pr", data: pr };
			}

			case "issues": {
				if (!meta.number) {
					throw new Error("Issue number is required");
				}
				const issue = await getIssue({
					...meta,
					number: meta.number,
					owner: meta.owner,
					repo: meta.repo,
				});
				if (!issue) {
					throw new Error(`Issue #${meta.number} not found`);
				}
				return { type: "issue", data: issue };
			}

			case "blob": {
				const fileData = await fetchFile(
					octokit,
					meta.owner,
					meta.repo,
					meta.path,
					meta.branch,
				);
				if (!fileData) {
					throw new Error("Not a file or file content is empty");
				}
				return fileData;
			}

			case "repo":
			default:
				throw new Error(
					"Repository URLs are not supported directly",
				);
		}
	} catch (error: unknown) {
		if (
			error instanceof Error &&
			"status" in error &&
			(error as GitHubError).status === 404
		) {
			throw new Error(
				`Content not found in ${meta.owner}/${meta.repo}`,
			);
		}
		throw error;
	}
}
