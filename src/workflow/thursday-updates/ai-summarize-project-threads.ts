import { openai } from "@pocket-ai/lib/ai/presets";
import type { PostWithComments } from "@pocket-ai/lib/wpcom/types";
import { htmlToMarkdown } from "@pocket-ai/lib/utilities";
import pMap from "p-map";
import { v } from "@pocket-ai/lib/ai/nchain";
import type { PullRequestWithSummary } from "./ai-summarize-pull-requests";


export type ProjectThreadWithSummary = Awaited<
	ReturnType<typeof summarizeSingleProjectThread>
>;

async function reviewProjectUpdate(
	thread: PostWithComments,
	pullRequests: PullRequestWithSummary[],
	summary: string,
	updates: string,
	threadXml: string,
	commentsXml: string,
): Promise<{
	needsUpdate: boolean;
	relevantPRs: PullRequestWithSummary[];
	suggestions: string;
}> {
	const relevantPRs = pullRequests.filter(pr => {
		// Basic text matching to find potentially relevant PRs
		const threadTitle = thread.title.rendered.toLowerCase();
		const prTitle = pr.title.toLowerCase();
		const prBody = pr.body?.toLowerCase() || "";
		const threadContent = thread.content.rendered.toLowerCase();

		return prTitle.includes(threadTitle) ||
			prBody.includes(threadTitle) ||
			threadContent.includes(prTitle) ||
			(pr.ai.references || []).some(ref =>
				ref.link.includes(thread.link)
			);
	});

	if (relevantPRs.length === 0) {
		return {
			needsUpdate: false,
			relevantPRs: [],
			suggestions: "No updates needed.",
		};
	}


	// Sort PRs by date for chronological analysis
	const sortedPRs = relevantPRs.sort((a, b) =>
		new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
	);

	const reviewer = openai("smart")
		.system("You are a fact-checker that is reviewing a project summary and making sure that the output is accurate and up-to-date.")
		.insert("project_thread", threadXml)
		.insert("project_thread_comments", commentsXml)
		.insert("pull_requests", JSON.stringify(sortedPRs))
		.insert("current_summary", summary)
		.insert("current_updates", updates);

	reviewer.prompt(p => {
		p.setLabel("Review")
			.saveAs("review")
			.prompt([
				"Analyze the project summary and updates.",
				"Consider:",
				"1. Are there important status updates in the PRs not reflected in the summary?",
				"2. Is the summary accurate and up-to-date?",
				"3. Is there crucial information missing from the summary?",
				"",
				"If updates are needed, provide specific suggestions for improvement based on the information available to you.",
				"You should not request adding information that is not available to you.",
				"If no updates are needed, explain why the current summary is sufficient.",
			])
			.section("project_summary", "{{current_summary}}")
			.section("project_updates", "{{current_updates}}")
			.section("pull_requests", "{{pull_requests}}")
			.section("example_no_update_necessary", [
				"The summary correct and covers everything - the Widget Factory was added and tested in PR #1234 and deployed to production in PR #1236.",
			])
			.section("example_update_necessary", [
				"The summary is missing a few things:",
				" - The summary mentions that a PR is open, but the Pull Request has since been merged. We can remove the reference to the PR.",
				" - The summary mentions that iOS added a widget, but there are still open Pull Requests, so this feature is likely not fully complete yet."
			])
		return p;
	});

	await reviewer.process();
	const review = await reviewer.getFormattedArtifact(
		"review",
		v.object({
			should_update: v.boolean("Whether the summary needs to be updated"),
			suggestions: v.string("Suggestions for improvement or explanation of why no updates are needed"),
		})
	);

	return {
		needsUpdate: review.should_update,
		relevantPRs: sortedPRs,
		suggestions: review.suggestions,
	};
}

async function summarizeSingleProjectThread(
	projectThread: PostWithComments,
	pullRequests: PullRequestWithSummary[] = [],
) {
	const threadXml = [
		`<project_thread>`,
		`	<project_thread_id>${projectThread.id}</project_thread_id>`,
		`	<project_thread_title>${projectThread.title.rendered}</project_thread_title>`,
		`	<project_thread_content>${htmlToMarkdown(projectThread.content.rendered)}</project_thread_content>`,
		`	<project_thread_date>${projectThread.date_gmt}</project_thread_date>`,
		`</project_thread>`,
	].join("\n");

	const commentsXml = [
		...(projectThread.comments?.flatMap((comment) => {
			return [
				`	<project_update>`,
				`		<update_date>${comment.date_gmt}</update_date>`,
				`		<update_content>${htmlToMarkdown(comment.content.rendered)}</update_content>`,
				`	</project_update>`,
			];
		}) || []),
	].join("\n");

	// Start with a clean thread for initial summary
	const summarizer = openai("smart")
		.insert("project_thread", threadXml)
		.insert("project_thread_comments", commentsXml)
		.insert("writing_rules", [
			"Prioritize user facing changes and current state of the project",
			"Avoid introductory phrases",
			"Avoid including engineering work specific details unless they're mission critical to user facing changes:",
			"  - Pull Request merge status",
			"  - Pull Request dates",
			"  - Pull Request numbers",
			"Avoid including engineering jargon"
		].join("\n"));

	// Initial prompts for basic information
	summarizer.prompt((p) =>
		p
			.setLabel("Project Information")
			.saveAs("project_info")
			.incognito()
			.prompt([
				"Extract the basic project information:",
				"1. Determine the current status of the project from the following options:",
				"   - In Planning",
				"   - In Production",
				"   - In Progress",
				"   - In Staging",
				"   - On Hold",
				"2. Remove 'Project Thread' from the title.",
				"3. Provide a concise summary of what the project is about.",
			])
			.section("project_thread", "{{project_thread}}")
			.section("example", [
				"Title: Rainbow Theme Generator",
				"Status: In Progress",
				"About: An experimental feature to automatically generate color themes based on user's listening history and mood preferences.",
			].join("\n"))
	);

	summarizer.prompt((p) =>
		p
			.setLabel("Project Updates")
			.saveAs("project_update_summary")
			.incognito()
			.prompt([
				"Extract and summarize each update from the project thread:",
				"1. List updates in chronological order.",
				"2. For each update, provide the date and a brief summary (1-2 sentences).",
				"3. Use direct language.",
				"4. Focus on concrete changes and progress without unnecessary details.",
				"5. If the update is from a team, include the team name in the summary.",
			])
			.section("about_project", "{{project_info}}")
			.section("project_updates", "{{project_thread_comments}}")
			.section("example", [
				"2024-03-15: Android Team: Added bookmarks for user episodes on Android.",
				"2024-03-10: iOS Team: Integrated tracking for missing call-to-actions.",
				"2024-03-05: Completed user preference analysis.",
				"2024-02-28: iOS Team: Added new features to the iOS app.",
			].join("\n"))
	);

	summarizer.prompt((p) =>
		p
			.setLabel("Project Summary")
			.saveAs("project_summary")
			.prompt([
				"Create a high-level summary of the project's progress.",
				"1. Review all updates and summarize in 1-2 sentences.",
				"2. Start directly with the main information; avoid introductory phrases.",
				"3. Focus on significant user-facing updates and current state.",
			])
			.section("about_project", "{{project_info}}")
			.section("project_updates", "{{project_update_summary}}")
			.section("writing_rules", '{{writing_rules}}')
			.section("example", [
				"Final visual adjustments are pending.",
				"Implemented core features and user testing is scheduled for next month.",
			].join("\n"))
	);

	await summarizer.process();

	const projectSummary = summarizer.getArtifact<string>("project_summary");

	if (!projectSummary) {
		throw new Error("No project summary found");
	}

	// Now review the summary with PR information
	const review = await reviewProjectUpdate(
		projectThread,
		pullRequests,
		projectSummary,
		summarizer.getArtifact<string>("project_update_summary"),
		threadXml,
		commentsXml
	);

	// If we need to update and have suggestions, add PR information and reprocess
	if (review.needsUpdate && review.suggestions && review.suggestions.length > 0) {
		summarizer.prompt((p) =>
			p
				.setLabel("Project Summary rewrite")
				.saveAs("project_summary")
				.prompt([
					"That's a really good review, I like the format and style of the summary!",
					"We've cross-checked the summary with information from pull requests and added a few suggestions.",
					"",
					"As a reminder, this summary is supposed to be 1-2 sentences that cover user facing changes and current state of the project",
					"Please use the provided suggestions below to improve the summary.",
					"Keep in mind that the suggestions are just suggestions. You should incoorporate the helpful information and ignore the unhelpful/misguided information.",
				])
				.section("writing_rules", '{{writing_rules}}')
				.section("current_summary", "{{project_summary}}")
				.section("suggestions", review.suggestions)
		);

		await summarizer.process();
	}

	// Get the final summaries (either updated or original)
	const finalProjectInfo = await summarizer.getFormattedArtifact("project_info", v.object({
		title: v.string("Title of the project thread"),
		status: v.string("Current status of the project"),
	}));

	return {
		...projectThread,
		ai: {
			...finalProjectInfo,
			summary: summarizer.getArtifact("project_summary"),
		},
	};
}

export async function summarizeProjectThreads(
	projectUpdates: PostWithComments[],
	pullRequests: PullRequestWithSummary[] = [],
): Promise<ProjectThreadWithSummary[]> {
	const summaries = await pMap(
		projectUpdates,
		(thread) => summarizeSingleProjectThread(thread, pullRequests),
		{ concurrency: 3 },
	);
	return summaries;
}
