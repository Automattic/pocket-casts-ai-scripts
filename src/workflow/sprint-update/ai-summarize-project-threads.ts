import { openai } from "@/lib/ai/presets";
import { PostWithComments } from "@/lib/wpcom/types";
import { htmlToMarkdown } from "@/lib/utilities";
import pMap from "p-map";
import { v } from "@/lib/ai/nchain";

export type ProjectThreadWithSummary = Awaited<
	ReturnType<typeof summarizeSingleProjectThread>
>;

async function summarizeSingleProjectThread(thread: PostWithComments) {
	const result = await openai("smart")
		.insert(
			"project_thread",
			[
				`<project_thread>`,
				`	<project_thread_id>${thread.id}</project_thread_id>`,
				`	<project_thread_title>${thread.title.rendered}</project_thread_title>`,
				`	<project_thread_content>${htmlToMarkdown(thread.content.rendered)}</project_thread_content>`,
				`	<project_thread_date>${thread.date_gmt}</project_thread_date>`,
				...(thread.comments?.flatMap((comment) => {
					return [
						`	<project_thread_comment>`,
						`		<project_thread_comment_date>${comment.date_gmt}</project_thread_comment_date>`,
						`		<project_thread_comment_id>${comment.id}</project_thread_comment_id>`,
						`		<project_thread_comment_author>${comment.author_name}</project_thread_comment_author>`,
						`		<project_thread_comment_content>${htmlToMarkdown(comment.content.rendered)}</project_thread_comment_content>`,
						`	</project_thread_comment>`,
					];
				}) || []),
				`</project_thread>`,
			].join("\n"),
		)
		.prompt((p) =>
			p
				.setLabel("Project Thread Summary")
				.incognito()
				.saveAs("project_thread_summary")
				.prompt([
					"1 - Get the current status of the project. Valid statuses are:",
					"- In Planning",
					"- In Production",
					"- In Progress",
					"- In Staging",
					"- On Hold",
					"2 - Extract the latest project updates. Summarize them if they are too long.",
					"3 - Remove 'Project Thread' from the title.",
					"4 - Summarize the latest updates and what the project is about according to the following format",
				])
				.section("format", [
					"Project Status: {status}",
					"# Title",
					"### Latest Updates",
					"- {1 sentence summary of update #1}",
					"- {1 sentence summary of update #2}",
					"- {repeat for each update}",
					"# Summary",
					"{2 sentence summary of the current state of the project}",
				])
				.section("example", [
					"Project Status: In Progress",
					"# UI Redesign",
					"## Latest Updates",
					"- 15-03-2024: Added a new seek bar for touch input",
					"- 11-03-2024: Removed the play button from the player",
					"- 09-03-2024: Improved search functionality",
					"- 04-03-2024: Changed the play button color to match the theme",
					"## Summary",
					"Completed redesign of the player interface. This involved refactoring React components and adding a new seek bar for touch input.",
				])
				.section("project_thread", "{{project_thread}}"),
		)
		.format(
			v.object({
				title: v.string("Title of the project thread"),
				summary: v.string(
					"Extract the summary of the project thread",
				),
				status: v.string("Current status of the project"),
				updates: v.array(
					v.object({
						date: v.string("Date of the update"),
						summary: v.string("Summary of the update"),
					}),
				),
			}),
		)
		.process();
	return {
		...thread,
		ai: result,
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
