import { getRepo } from "../../../lib/github/octokit";
import { getPullRequests } from "../../../lib/github/pull-requests";
import { formatReport } from "../format-report";
import { getProjectThreads } from "@/lib/wpcom/posts";
import { PostWithComments } from "@/lib/wpcom/types";
import { summarizeProjectThreads } from "../ai-summarize-project-threads";
import {
	PullRequestWithSummary,
	summarizePullRequests,
} from "../ai-summarize-pull-requests";
import { getTeamPRs } from "../get-team-prs";
import { getProjectUpdateReport } from "../get-project-updates";
import { aiReportTopShipped } from "../ai-report-top-shipped";

export type ProgressStep = {
	step: number;
	totalSteps: number;
	message: string;
	detail?: string;
	isComplete?: boolean;
};

const repositorySources: Record<string, string[]> = {
	Android: ["https://github.com/Automattic/pocket-casts-android"],
	iOS: ["https://github.com/Automattic/pocket-casts-ios"],
	Web: [
		"https://github.com/Automattic/pocket-casts-webplayer",
		"https://github.com/Automattic/pocket-casts-desktop",
		"https://github.com/Automattic/pocket-casts-paid-placements",
		"https://github.com/a8cteam51/pocket-casts-main",
	],
	Backend: [
		"https://github.com/Automattic/pocket-casts-sync-api",
		"https://github.com/Automattic/pocket-casts-node-server",
		"https://github.com/Automattic/pocket-casts-sync-analytics",
		"https://github.com/Automattic/pocket-casts-server-scripts",
		"https://github.com/Automattic/pocket-casts-ratings-task",
		"https://github.com/Automattic/pocket-casts-collage-image",
		"https://github.com/Automattic/pocket-casts-admin-web",
		"https://github.com/Automattic/pocket-casts-static-assets",
		"https://github.com/Automattic/pocket-casts-speaker-integration",
		"https://github.com/Automattic/pocket-casts-image-caching",
		"https://github.com/Automattic/pocket-casts-cloud-infrastructure",
		"https://github.com/Automattic/pocket-casts-sharing-service",
	],
} as const;

type DateRange = {
	startDate: Date;
	endDate: Date;
};

const fetchPRs = async (sources: string[], dateRange: DateRange) => {
	const repositories = sources.map((source) => getRepo(source));
	const prs = await getPullRequests(repositories, { dateRange });

	return prs.sort(
		(a, b) =>
			new Date(b.updated_at).getTime() -
			new Date(a.updated_at).getTime(),
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

	return projectThreads
		.map((thread) => {
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

export const getThursdayUpdates = async (
	dateRange: DateRange,
	onProgress: (progress: ProgressStep) => void,
) => {
	onProgress({
		step: 1,
		totalSteps: 8,
		message: "Starting Pull Request Collection",
		detail: `Gathering data from ${Object.values(repositorySources).flat().length} repositories...`,
	});
	const pullRequestsPromise = getPullRequestsByTeam(dateRange);

	onProgress({
		step: 2,
		totalSteps: 8,
		message: "Fetching Project Threads",
		detail: "Getting updates from Pocket Casts P2...",
	});
	const projectThreadsRaw = await getProjectThreadRange(
		"pocketcastsp2",
		dateRange,
	);

	onProgress({
		step: 3,
		totalSteps: 8,
		message: "Analyzing Project Threads",
		detail: "Summarizing P2 discussions...",
	});
	const projectThreads = await summarizeProjectThreads(projectThreadsRaw);

	onProgress({
		step: 4,
		totalSteps: 8,
		message: "Generating Project Updates",
		detail: "Creating summaries of project activities...",
	});
	const projectUpdates = await getProjectUpdateReport(projectThreads);

	onProgress({
		step: 5,
		totalSteps: 8,
		message: "Processing Pull Requests",
		detail: "Analyzing collected pull requests...",
	});
	const pullRequests = await pullRequestsPromise;

	onProgress({
		step: 6,
		totalSteps: 8,
		message: "Generating Team Updates",
		detail: "Creating team activity summaries...",
	});
	const teamPullRequests = await getTeamPRs(pullRequests);

	onProgress({
		step: 7,
		totalSteps: 8,
		message: "Collecting Shipped Features",
		detail: "Analyzing recently shipped features...",
	});
	const topShipped = await aiReportTopShipped(
		projectUpdates,
		pullRequests.flatMap((p) => p.pullRequests),
	);

	const report = formatReport({
		topShipped,
		projectUpdates,
		teamUpdates: teamPullRequests,
	});

	onProgress({
		step: 8,
		totalSteps: 8,
		message: "Complete",
		detail: "Report ready!",
		isComplete: true,
	});

	return report;
};
