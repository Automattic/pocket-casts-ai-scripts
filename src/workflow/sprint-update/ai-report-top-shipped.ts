import { openai } from "@/lib/ai/presets";
import type { PullRequestWithSummary } from "./ai-summarize-pull-requests";

const examples = [
	`On web we implemented Up Next queue sorting and released the Up Next shuffle feature.`,
	[
		`- [Playback 2024](https://pocketcastsp2.wordpress.com/2024/10/02/project-thread-end-of-year-2024/) is in production`,
		`- [Up Next Shuffle](https://pocketcastsp2.wordpress.com/2024/10/21/project-thread-up-next-shuffle/) is in production`,
		`- [Manage Downloads](https://pocketcastsp2.wordpress.com/2024/10/25/project-thread-manage-downloaded-episodes/) is in production`,
		`- [Custom Playback Settings](https://pocketcastsp2.wordpress.com/2024/10/07/project-thread-local-global-playback-settings/) is in production`,
	].join("\n"),
	[
		`- Kids Profile fake door experiment is in production (7.71)`,
		`- Reimagined sharing and clip sharing is in beta (7.72)`,
		`- Displaying Podcast Index transcripts is in beta (7.72)`,
	],
	[
		`- Give Ratings is now available in beta`,
		`- Lifetime members rename to Champions is in beta on mobile and live on web`,
		`- We've rolled out a series of usability and UX improvements for [Blaze](https://blaze.pocketcasts.com/), featuring a new summer promotional banner, updated preview images, smoother animations in dropdowns and mock previews, and an enhanced overall application layout`,
	].join("\n"),
];

export async function aiReportTopShipped(
	projectUpdates: string,
	pullRequests: PullRequestWithSummary[],
): Promise<string> {
	return await openai("smart")
		.insert("project_updates", projectUpdates)
		.insert(
			"pull_requests",
			[
				`<pull_requests>`,
				...pullRequests
					.filter((pr) => "merged" in pr && pr.merged === true)
					.map((pr) => [
						`<pull_request>`,
						`	<pr_number>#${pr.number}</pr_number>`,
						`	<pr_title>${pr.title}</pr_title>`,
						`	<pr_summary>${pr.ai.summary}</pr_summary>`,
						`	<pr_url>${pr.html_url}</pr_url>`,
						`</pull_request>`,
					]),
				`</pull_requests>`,
			].join("\n\n"),
		)
		.system([
			`<role>`,
			`You're a product manager on Pocket Casts - an app for podcast listening.`,
			`</role>`,
			``,
			`<persona>`,
			`You always think user first and prioritize user experience.`,
			`You know a lot about podcast tech and all of Pocket Casts' features.`,
			`You know the ins and outs of Pocket Casts' features (trim silence, variable speed, cross-platform sync).`,
			`You understand podcast trends and what other apps are doing.`,
			`You know how people use podcasts and what they want.`,
			`You're familiar with how we compare to Spotify, Apple Podcasts, and others.`,
			`</persona>`,
			``,
			`<writing_rules>`,
			`- Follow AP Style for product updates.`,
			`- Write updates in a clear, direct style:`,
			`- Use simple past tense (Added, Fixed, Updated)`,
			`- Start sentences with action verbs`,
			`- Keep technical terms but avoid jargon`,
			`- Write like you're updating a colleague`,
			`- Don't write about benefits to the user or use words like enhancement, vital, game changer, massive`,
			`- Write in a way that is easily understood by a wide audience, targeting a Gunning Fog index of 12.`,
			`</writing_rules>`,
		])
		.prompt((p) => {
			p.setLabel("Top Shipped")
				.incognito()
				.saveAs("top_shipped")
				.prompt([
					"You're given a summary of all project updates and a list of pull requests that have been merged.",
					"Your task is to write a brief summary of the top features that have been shipped",
					"This will be included in a larger report for the upper management team.",
					"Please keep it concise and to the point.",
					"At most feature 5 items that were shipped.",
					"You can include less, we only care about the most important updates.",
				])
				.section("project_updates", "{{project_updates}}")
				.section("pull_requests", "{{pull_requests}}")
				.section(
					"output_examples",
					examples
						.flatMap((example, i) => {
							return [
								`<example_${1 + i}>`,
								example,
								`</example_${1 + i}>`,
							];
						})
						.join("\n\n"),
				);
			return p;
		})
		.process();
}
