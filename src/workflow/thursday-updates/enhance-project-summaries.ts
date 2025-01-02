import { openai } from "@pocket-ai/lib/ai/presets";
import type { ProjectThreadWithSummary } from "./ai-summarize-project-threads";
import type { PullRequestWithSummary } from "./ai-summarize-pull-requests";
import { v } from "@pocket-ai/lib/ai/nchain";

export async function reviewProjectSummary(
	thread: ProjectThreadWithSummary,
	pullRequests: PullRequestWithSummary[],
): Promise<{
	needsUpdate: boolean;
	suggestions?: string[];
	relevantPRs: PullRequestWithSummary[];
}> {
	const relevantPRs = pullRequests.filter(pr => {
		// Basic text matching to find potentially relevant PRs
		const threadTitle = thread.ai.title.toLowerCase();
		const prTitle = pr.title.toLowerCase();
		const prBody = pr.body?.toLowerCase() || "";

		return prTitle.includes(threadTitle) ||
			prBody.includes(threadTitle) ||
			prTitle.includes(thread.ai.about.toLowerCase()) ||
			(pr.ai.references || []).some(ref =>
				ref.link.includes(thread.link) ||
				ref.label.includes(thread.ai.title)
			);
	});

	if (relevantPRs.length === 0) {
		return { needsUpdate: false, relevantPRs: [] };
	}

	console.log(`${relevantPRs.length} relevant PRs found for thread`, thread.ai.title);

	// Sort PRs by date for chronological analysis
	const sortedPRs = relevantPRs.sort((a, b) =>
		new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
	);

	const aiThread = openai("smart")
		.insert(
			"project_thread",
			[
				`<project_thread>`,
				`    <project_thread_title>${thread.ai.title}</project_thread_title>`,
				`    <project_thread_status>${thread.ai.status}</project_thread_status>`,
				`    <project_thread_about>${thread.ai.about}</project_thread_about>`,
				`    <project_thread_summary>${thread.ai.summary}</project_thread_summary>`,
				`    <project_thread_date>${thread.date_gmt}</project_thread_date>`,
				`    <project_thread_updates>`,
				...(thread.ai.updates?.map(update => [
					`        <update>`,
					`            <date>${update.date}</date>`,
					`            <summary>${update.summary}</summary>`,
					`        </update>`,
				]).flat() || []),
				`    </project_thread_updates>`,
				`    <latest_update_date>${thread.ai.updates?.[0]?.date || thread.date_gmt}</latest_update_date>`,
				`</project_thread>`,
			].join("\n"),
		)
		.insert(
			"pull_requests",
			[
				`<pull_requests>`,
				...sortedPRs.map(pr => [
					`    <pull_request>`,
					`        <title>${pr.title}</title>`,
					`        <state>${pr.state}</state>`,
					`        <merged>${'merged' in pr ? pr.merged : false}</merged>`,
					`        <summary>${pr.ai.summary}</summary>`,
					`        <url>${pr.html_url}</url>`,
					`        <created_at>${pr.created_at}</created_at>`,
					`        <updated_at>${pr.updated_at}</updated_at>`,
					`        <merged_at>${'merged_at' in pr ? pr.merged_at : null}</merged_at>`,
					`    </pull_request>`,
				].join("\n")),
				`</pull_requests>`,
			].join("\n"),
		)
		.prompt((p) =>
			p
				.setLabel("Fact Check")
				.incognito()
				.saveAs("fact_check")
				.prompt([
					"I need you to review this project thread summary and its updates against the pull request data.",
					"Please check for:",
					"1. Chronological accuracy - are events described in the correct order?",
					"2. Status accuracy - does the thread status match the PR states?",
					"3. Missing information - are there significant PR updates not reflected in the thread?",
					"4. Outdated information - are there statements that contradict more recent PR activity?",
					"",
					"Based on your review, does this summary need updates? Please answer yes or no and explain why.",
				])
				.section("project_thread", "{{project_thread}}")
				.section("pull_requests", "{{pull_requests}}")
				.section("example", [
					"Yes, this summary needs updates. The project thread shows the feature as 'In Progress', but all PRs have been merged to production. Additionally, there are recent accessibility improvements that aren't mentioned in the summary.",
				].join("\n"))
		);

	await aiThread.process();
	const factCheck = await aiThread.getFormattedArtifact(
		"fact_check",
		v.object({
			should_update: v.boolean("Whether the summary needs updates"),
			reason: v.string("Explanation for why updates are needed or not"),
		})
	);

	if (!factCheck.should_update) {
		console.log("\n\nNo updates needed for", thread.ai.title);
		console.log("Reason:", factCheck.reason);
		return { needsUpdate: false, relevantPRs: sortedPRs };
	}

	console.log("\n\nUpdates needed for", thread.ai.title);
	console.log("Reason:", factCheck.reason);

	// If we need updates, get suggestions
	aiThread
		.prompt((p) =>
			p
				.setLabel("Improvement Suggestions")
				.incognito()
				.saveAs("suggestions")
				.prompt([
					"Based on your fact check, please provide specific suggestions for improving the summary.",
					"Focus on:",
					"1. Chronological corrections - what events need reordering?",
					"2. Status updates - what status changes need to be reflected?",
					"3. Missing information - what significant PR updates should be added?",
					"4. Outdated information - what statements need to be updated?",
					"Provide each suggestion as a clear, actionable item.",
				])
				.section("project_thread", "{{project_thread}}")
				.section("pull_requests", "{{pull_requests}}")
				.section("example", [
					"- Update status to 'In Production' as all PRs are now merged",
					"- Add information about the dark mode feature that was merged last week",
					"- Remove outdated reference to pending code review",
				].join("\n"))
		);

	await aiThread.process();
	const suggestions = await aiThread.getFormattedArtifact(
		"suggestions",
		v.array(v.string("A suggestion for improving the summary"))
	);

	return {
		needsUpdate: factCheck.should_update,
		suggestions,
		relevantPRs: sortedPRs,
	};
}

export async function enhanceProjectSummaries(
	projectThreads: ProjectThreadWithSummary[],
	pullRequests: PullRequestWithSummary[],
): Promise<ProjectThreadWithSummary[]> {
	return await Promise.all(projectThreads.map(async (thread) => {
		const review = await reviewProjectSummary(thread, pullRequests);

		if (!review.needsUpdate) {
			return thread;
		}

		// If we need updates, create a new thread with the review suggestions
		const enhancedThread = openai("smart")
			.insert(
				"original_thread",
				[
					`<project_thread>`,
					`    <project_thread_title>${thread.ai.title}</project_thread_title>`,
					`    <project_thread_status>${thread.ai.status}</project_thread_status>`,
					`    <project_thread_about>${thread.ai.about}</project_thread_about>`,
					`    <project_thread_summary>${thread.ai.summary}</project_thread_summary>`,
					`    <project_thread_updates>`,
					...(thread.ai.updates?.map(update => [
						`        <update>`,
						`            <date>${update.date}</date>`,
						`            <summary>${update.summary}</summary>`,
						`        </update>`,
					]).flat() || []),
					`    </project_thread_updates>`,
				].join("\n"),
			)
			.insert(
				"review_suggestions",
				[
					`<suggestions>`,
					...(review.suggestions || []).map(suggestion =>
						`    <suggestion>${suggestion}</suggestion>`
					),
					`</suggestions>`,
				].join("\n"),
			)
			.insert(
				"pull_requests",
				[
					`<pull_requests>`,
					...review.relevantPRs.map(pr => [
						`    <pull_request>`,
						`        <title>${pr.title}</title>`,
						`        <state>${pr.state}</state>`,
						`        <merged>${'merged' in pr ? pr.merged : false}</merged>`,
						`        <summary>${pr.ai.summary}</summary>`,
						`        <url>${pr.html_url}</url>`,
						`        <created_at>${pr.created_at}</created_at>`,
						`        <updated_at>${pr.updated_at}</updated_at>`,
						`        <merged_at>${'merged_at' in pr ? pr.merged_at : null}</merged_at>`,
						`    </pull_request>`,
					].join("\n")),
					`</pull_requests>`,
				].join("\n"),
			)
			.prompt((p) =>
				p
					.setLabel("Enhanced Summary")
					.incognito()
					.saveAs("enhanced_summary")
					.prompt([
						"Create an enhanced project summary that addresses the review suggestions.",
						"Follow these guidelines:",
						"1. Maintain the original writing style and tone",
						"2. Incorporate the chronological improvements",
						"3. Update status information to reflect current state",
						"4. Add missing significant developments",
						"5. Remove or update outdated information",
						"6. Keep the summary concise (1-2 sentences) and factual",
					])
					.section("original_thread", "{{original_thread}}")
					.section("review_suggestions", "{{review_suggestions}}")
					.section("pull_requests", "{{pull_requests}}")
			)
			.format(
				v.object({
					summary: v.string("Fact-checked summary of the project"),
					status: v.string("Current status of the project"),
				})
			);

		await enhancedThread.process();
		const enhanced = await enhancedThread.getFormattedArtifact(
			"enhanced_summary",
			v.object({
				summary: v.string("Enhanced summary of the project"),
				status: v.string("Current status of the project"),
			})
		);

		console.log("\n\n\n\nFact Check Update: ", review);
		console.log("\nOriginal Summary: ", thread.ai.summary);
		console.log("\nEnhanced Summary: ", enhanced.summary);


		return {
			...thread,
			ai: {
				...thread.ai,
				summary: enhanced.summary,
				status: enhanced.status,
			},
		};
	}));
}
