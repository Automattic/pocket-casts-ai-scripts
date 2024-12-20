import { openai } from "@pocket-ai/lib/ai/presets";
import pMap from "p-map";
import type { components } from "@octokit/openapi-types";
import { v } from "@pocket-ai/lib/ai/nchain";

export type PullRequestWithSummary = Awaited<
	ReturnType<typeof summarizePullRequest>
>;

async function summarizePullRequest(
	pullRequest: components["schemas"]["issue-search-result-item"],
) {
	const { summary, references } = await openai("fast")
		.insert(
			"pull_request",
			[
				`<pull_request>`,
				`	<pr_number>#${pullRequest.number}</pr_number>`,
				`	<pr_title>${pullRequest.title}</pr_title>`,
				`	<pr_description>${pullRequest.body || ""}</pr_description>`,
				`	<pr_author>${pullRequest.user?.login || "unknown"}</pr_author>`,
				`	<pr_state>${pullRequest.state}</pr_state>`,
				`	<pr_url>${pullRequest.url}</pr_url>`,
				`</pull_request>`,
			].join("\n"),
		)
		.prompt((p) =>
			p
				.setLabel("Pull Request Summary")
				.incognito()
				.saveAs("pull_request_summary")
				.prompt([
					"Extract the most important information about this pull request.",
					"Create a concise summary following the specified format.",
					"Look for and include any references to:",
					"- External links (documentation, articles, etc.)",
					"- Referenced GitHub issues or PRs (e.g., 'Fixes #123', 'Related to #456')",
					"- Dependent or blocking PRs",
					"- Instantly describe only the changes.",
					"- Start summary with an action verb.",
				])
				.section("reference handling", [
					"Always resolve references to links. Given that you know the URL of the pull request, if #123 is mentioned, you can infer the github URL based on the current PR's repository.",
				])
				.section("format", [
					"# Summary",
					"{1-2 sentence description of the changes}",
					"### References",
					"- Related PRs",
					"- Project links",
					"- Zendesk links",
					"- Links to discussions or internal documentation",
				])
				.section("example", [
					"# Add Dark Mode Support",
					"Implements a new dark mode theme system with automatic detection of system preferences and manual toggle option.",
					"### References",
					"- Depends on [#120](https://github.com/MyOrg/MyRepo/pull/120)",
					"- Fixes [#115](https://github.com/MyOrg/MyRepo/pull/115)",
					"- [Project Thread](https://myteamp2.wordpress.com/2024/12/12/integrating-dark-mode-into-the-app)",
					"- [Zendesk Issue 123](https://myorg.zendesk.com/agent/tickets/123)",
				])
				.section("pull_request", "{{pull_request}}"),
		)
		.format(
			v.object({
				summary: v.string("Pull request summary"),
				references: v.array(
					v.object({
						link: v.string("Link to the reference"),
						label: v.string("Description of the reference"),
					}),
				),
			}),
		)
		.process();

	return {
		...pullRequest,
		ai: {
			summary,
			references,
		},
	};
}

export async function summarizePullRequests(
	pullRequests: components["schemas"]["issue-search-result-item"][],
): Promise<PullRequestWithSummary[]> {
	const summaries = await pMap(
		pullRequests,
		(pr) => summarizePullRequest(pr),
		{ concurrency: 3 },
	);
	return summaries;
}
