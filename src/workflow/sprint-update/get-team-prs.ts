import type { PullRequestWithSummary } from "./ai-summarize-pull-requests";
import { formatPRLink } from "./utilities";

function formatTeamUpdates(team: string, prs: PullRequestWithSummary[]): string {
	const sections: string[] = [];

	sections.push(`### ${team}\n`);

	if (prs.length > 0) {
		for (const pr of prs) {
			sections.push(`- ${formatPRLink(pr)}`);
		}
	}

	return sections.join("\n");
}

export async function getTeamPRs(
	reports: { team: string; pullRequests: PullRequestWithSummary[] }[],
): Promise<string> {
	return reports
		.map((r) => formatTeamUpdates(r.team, r.pullRequests))
		.join("\n\n");
}
