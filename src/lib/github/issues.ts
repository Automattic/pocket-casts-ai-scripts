import type { Require } from "../wpcom/types";
import { getOctokit } from "./octokit";
import type { Repository } from "./octokit";
import type { Endpoints } from "@octokit/types";
import { logger } from "../logger";

type Issue =
	Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}"]["response"]["data"];
type IssueComment =
	Endpoints["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"]["response"]["data"][0];

interface FetchOptions {
	dateRange: {
		startDate: Date;
		endDate: Date;
	};
	state?: "open" | "closed" | "all";
}

/**
 * Get a single issue by number
 */
export async function getIssue(
	meta: Require<Repository, "owner" | "repo" | "number">,
): Promise<Issue | null> {
	const octokit = await getOctokit();
	try {
		logger().info(
			`[GitHub API] Fetching issue #${meta.number} from ${meta.owner}/${meta.repo}`,
		);
		const { data } = await octokit.rest.issues.get({
			owner: meta.owner,
			repo: meta.repo,
			issue_number: meta.number,
		});
		return data;
	} catch (error: unknown) {
		if ((error as { status?: number })?.status === 404) {
			return null;
		}
		throw error;
	}
}

/**
 * Get comments for an issue
 */
export async function getIssueComments(
	meta: Require<Repository, "owner" | "repo" | "number">,
): Promise<IssueComment[]> {
	const octokit = await getOctokit();
	const { data } = await octokit.rest.issues.listComments({
		owner: meta.owner,
		repo: meta.repo,
		issue_number: meta.number,
	});
	return data;
}

/**
 * Get issues for a repository with optional filtering
 */
export async function getIssues(
	meta: Pick<Repository, "owner" | "repo">,
	options: FetchOptions,
): Promise<Issue[]> {
	const octokit = await getOctokit();
	const { dateRange, state = "all" } = options;

	const startDate = dateRange.startDate.toISOString().split("T")[0];
	const endDate = dateRange.endDate.toISOString().split("T")[0];
	const dateQuery = `updated:${startDate}..${endDate}`;

	const stateQuery = state === "all" ? "" : `is:${state}`;
	const query = `is:issue repo:${meta.owner}/${meta.repo} ${dateQuery} ${stateQuery}`.trim();
	logger().info(`[GitHub API] Query: ${query}`);

	try {
		const { data } = await octokit.search.issuesAndPullRequests({
			q: query,
			sort: "updated",
			order: "desc",
			per_page: 100,
		});

		logger().info(
			`[GitHub API] Found ${data.items.length} issues from ${meta.owner}/${meta.repo}`,
		);

		return data.items as Issue[];
	} catch (error) {
		logger().error(`[GitHub API] Error searching issues:`, error);
		throw error;
	}
}
