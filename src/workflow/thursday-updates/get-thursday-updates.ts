import { getRepo } from "@pocket-ai/lib/github/octokit";
import { getPullRequests } from "@pocket-ai/lib/github/pull-requests";
import { formatReport } from "@pocket-ai/workflow/thursday-updates/format-report";
import { getProjectThreads } from "@pocket-ai/lib/wpcom/posts";
import type { PostWithComments } from "@pocket-ai/lib/wpcom/types";
import { summarizeProjectThreads } from "@pocket-ai/workflow/thursday-updates/ai-summarize-project-threads";
import {
	type PullRequestWithSummary,
	summarizePullRequests,
} from "@pocket-ai/workflow/thursday-updates/ai-summarize-pull-requests";
import { getTeamPRs } from "@pocket-ai/workflow/thursday-updates/get-team-prs";
import { aiReportTopShipped } from "@pocket-ai/workflow/thursday-updates/ai-report-top-shipped";
import ora from "ora";
import { formatProjectUpdates } from "@pocket-ai/workflow/thursday-updates/format-project-updates";
import { autocache } from '@pocket-ai/lib/utilities';
import { repositorySources } from './sources';

export type ProgressStep = {
	step: number;
	totalSteps: number;
	message: string;
	detail?: string;
	isComplete?: boolean;
};

type DateRange = {
	startDate: Date;
	endDate: Date;
};

const fetchPRs = async (sources: string[], dateRange: DateRange) => {
	const repositories = sources.map((source) => getRepo(source));
	const prs = await getPullRequests(repositories, { dateRange });

	return prs.sort(
		(a, b) =>
			new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
	);
};

async function getPullRequestsByTeam(dateRange: DateRange) {
	const result: {
		team: string;
		pullRequests: PullRequestWithSummary[];
	}[] = [];

	for (const team in repositorySources) {
		const repositories = repositorySources[team];
		const prs = await fetchPRs(repositories, dateRange);
		const summary = await summarizePullRequests(prs);
		result.push({
			team,
			pullRequests: summary,
		});
		// Sleep for 5 seconds to avoid rate limiting
		await new Promise((resolve) => setTimeout(resolve, 5000));
	}

	return result;
}

async function getProjectThreadRange(
	p2: string,
	dateRange: DateRange,
): Promise<PostWithComments[]> {
	const projectThreads = await getProjectThreads(p2, { dateRange });

	return projectThreads.map((thread) => {
		return {
			...thread,
			comments: thread.comments?.filter((comment) => {
				const commentDate = new Date(comment.date_gmt);
				return (
					commentDate.getTime() >= dateRange.startDate.getTime() &&
					commentDate.getTime() <= dateRange.endDate.getTime()
				);
			}),
		};
	});
}

export const getThursdayUpdates = async (dateRange: DateRange) => {
	const spinner = ora({
		text: "Starting Pull Request Collection",
		isSilent: false,
		isEnabled: process.stdout.isTTY,
	}).start();
	try {
		spinner.text = `Gathering data from ${Object.values(repositorySources).flat().length} repositories...`;
		const pullRequestsPromise = autocache(
			"pull-requests-by-team",
			1000 * 60 * 60 * 6, // 3 hours
			async () => getPullRequestsByTeam(dateRange),

		);

		spinner.text = "Fetching Project Threads from Pocket Casts P2...";
		const projectThreadsRaw = await autocache(
			"project-threads",
			1000 * 60 * 60 * 1, // 1 hour
			async () => getProjectThreadRange(
				"pocketcastsp2",
				dateRange,
			),
		);

		spinner.text = "Analyzing Project Threads...";
		const projectThreads = await summarizeProjectThreads(projectThreadsRaw);

		spinner.text = "Generating Project Updates...";
		const projectUpdates = await formatProjectUpdates(projectThreads);

		spinner.text = "Processing Pull Requests...";
		const pullRequests = await pullRequestsPromise;

		spinner.text = "Generating Team Updates...";
		const teamPullRequests = await getTeamPRs(pullRequests);

		spinner.text = "Analyzing recently shipped features...";
		const topShipped = await aiReportTopShipped(
			projectUpdates,
			pullRequests.flatMap((p) => p.pullRequests),
		);

		const report = formatReport({
			topShipped,
			projectUpdates,
			teamUpdates: teamPullRequests,
		});

		spinner.succeed("Report generated successfully!");
		return report;
	} catch (error) {
		spinner.fail("Failed to generate report");
		throw error;
	}
};
