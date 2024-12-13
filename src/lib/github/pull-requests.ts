import { type Require } from "../wpcom/types";
import { getOctokit, type Repository } from "./octokit";
import { type components } from "@octokit/openapi-types";
import { logger } from "../logger";

type PullRequestComment =
	components["schemas"]["pull-request-review-comment"];
type IssueSearchResultItem =
	components["schemas"]["issue-search-result-item"];

/**
 * Fetch a single pull request by number
 */
export async function getPullRequest(
	meta: Require<Repository, "owner" | "repo" | "number">,
) {
	const octokit = await getOctokit();
	try {
		logger().info(`[GitHub API] Fetching PR #${meta.number} from ${meta.owner}/${meta.repo}`);
		const { data } = await octokit.rest.pulls.get({
			owner: meta.owner,
			repo: meta.repo,
			pull_number: meta.number,
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
 * Get pull request review comments
 */
export async function getPullRequestComments(
	meta: Pick<Repository, "owner" | "repo" | "number">,
): Promise<PullRequestComment[]> {
	const octokit = await getOctokit();
	const { data } = await octokit.rest.pulls.listReviewComments({
		owner: meta.owner,
		repo: meta.repo,
		pull_number: meta.number!,
	});
	return data;
}

/**
 * Get pull requests for one or more repositories with optional filtering
 */
type QueryOptions = {
	dateRange: {
		startDate: Date;
		endDate: Date;
	};
	query?: string | string[];
};
export async function getPullRequests(
	meta:
		| Pick<Repository, "owner" | "repo">
		| Array<Pick<Repository, "owner" | "repo">>,
	options: QueryOptions,
): Promise<(IssueSearchResultItem & { merged?: boolean })[]> {
	const octokit = await getOctokit();
	const { dateRange, query = ["is:pr", "-author:app/dependabot"] } =
		options;

	const startDate = dateRange.startDate.toISOString().split("T")[0];
	const endDate = dateRange.endDate.toISOString().split("T")[0];
	const dateQuery = `updated:${startDate}..${endDate}`;

	const repositories = Array.isArray(meta) ? meta : [meta];
	const repoQuery = repositories
		.map((repo) => `repo:${repo.owner}/${repo.repo}`)
		.join(" ");

	const baseQueryParts = [
		...(typeof query === "string" ? [query] : query),
		dateQuery,
		repoQuery,
	];

	// Query for all PRs first
	const allQuery = [...baseQueryParts].join(" ").trim();

	// Query just for merged PRs
	const mergedQuery = [...baseQueryParts, "is:merged"].join(" ").trim();

	try {
		const allPRs = await octokit.search.issuesAndPullRequests({
			q: allQuery,
			sort: "updated",
			order: "desc",
			per_page: 100,
		});

		const mergedPRs = await octokit.search.issuesAndPullRequests({
			q: mergedQuery,
			sort: "updated",
			order: "desc",
			per_page: 100,
		});

		// Create a Set of merged PR numbers
		const mergedPRNumbers = new Set(
			mergedPRs.data.items.map((pr) => pr.number),
		);

		// Add merged status to all PRs
		const results = allPRs.data.items.map((pr) => ({
			...pr,
			merged: mergedPRNumbers.has(pr.number),
		}));

		const repoCount = repositories.length;
		logger().info(`[GitHub API] Found ${results.length} PRs from ${repoCount} repositories`);

		logger().debug("Merged PR numbers:", [...mergedPRNumbers]);

		return results;
	} catch (error) {
		logger().error(`[GitHub API] Error searching PRs:`, error);
		throw error;
	}
}
