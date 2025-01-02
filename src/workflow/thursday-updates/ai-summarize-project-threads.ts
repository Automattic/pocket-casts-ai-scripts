import { openai } from "@pocket-ai/lib/ai/presets";
import type { PostWithComments } from "@pocket-ai/lib/wpcom/types";
import { htmlToMarkdown } from "@pocket-ai/lib/utilities";
import pMap from "p-map";
import { v } from "@pocket-ai/lib/ai/nchain";

export type ProjectThreadWithSummary = Awaited<
	ReturnType<typeof summarizeSingleProjectThread>
>;

async function summarizeSingleProjectThread(projectThread: PostWithComments) {
	const thread = openai("smart")
		.insert(
			"project_thread",
			[
				`<project_thread>`,
				`	<project_thread_id>${projectThread.id}</project_thread_id>`,
				`	<project_thread_title>${projectThread.title.rendered}</project_thread_title>`,
				`	<project_thread_content>${htmlToMarkdown(projectThread.content.rendered)}</project_thread_content>`,
				`	<project_thread_date>${projectThread.date_gmt}</project_thread_date>`,
				`</project_thread>`,
			].join("\n"),
		)
		.insert(
			"project_thread_comments",
			[
				...(projectThread.comments?.flatMap((comment) => {
					return [
						`	<project_update>`,
						`		<update_date>${comment.date_gmt}</update_date>`,
						`		<update_content>${htmlToMarkdown(comment.content.rendered)}</update_content>`,
						`	</project_update>`,
					];
				}) || []),
			].join("\n"),
		)
		.prompt((p) =>
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
		)
		.prompt((p) =>
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
		)
		.prompt((p) =>
			p
				.setLabel("Project Summary")
				.saveAs("project_summary")
				.incognito()
				.prompt([
					"Create a high-level summary of the project's progress.",
					"1. Review all updates and summarize in 1-2 sentences.",
					"2. Start directly with the main information; avoid introductory phrases.",
					"3. Focus on significant user-facing updates and current state.",
				])
				.section("about_project", "{{project_info}}")
				.section("project_updates", "{{project_update_summary}}")
				.section("example",
					[
						"Final visual adjustments are pending.",
						"Implemented core features and user testing is scheduled for next month."
					]
				)
		);

	await thread.process();

	const projectInfo = await thread.getFormattedArtifact("project_info", v.object({
		title: v.string("Title of the project thread"),
		status: v.string("Current status of the project"),
		about: v.string("About the project"),
	}));

	const projectUpdates = await thread.getFormattedArtifact("project_update_summary", v.array(
		v.object({
			date: v.string("Date of the update"),
			summary: v.string("Summary of the update"),
		}),
	));

	const projectSummary = await thread.getArtifact("project_summary");

	return {
		...projectThread,
		ai: {
			...projectInfo,
			updates: projectUpdates,
			summary: projectSummary,
		},
	};
}

export async function summarizeProjectThreads(
	projectUpdates: PostWithComments[],
): Promise<ProjectThreadWithSummary[]> {
	const summaries = await pMap(
		projectUpdates,
		(thread) => summarizeSingleProjectThread(thread),
		{ concurrency: 3 },
	);
	return summaries;
}
