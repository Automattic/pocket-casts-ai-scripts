import { PullRequestWithSummary } from "./ai-summarize-pull-requests";

export function formatPRLink(pr: PullRequestWithSummary): string {
	let status = "Opened";
	if (pr.state === "closed") {
		status = "merged" in pr && pr.merged ? "Merged" : "Closed";
	}
	return `${status}: [${pr.title}](${pr.html_url})`;
}
