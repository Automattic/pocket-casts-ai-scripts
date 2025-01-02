import { openai } from "@pocket-ai/lib/ai/presets";
import type { ProjectThreadWithSummary } from "./ai-summarize-project-threads";
import type { PullRequestWithSummary } from "./ai-summarize-pull-requests";
import { v } from "@pocket-ai/lib/ai/nchain";

export async function enhanceProjectSummaries(
    projectThreads: ProjectThreadWithSummary[],
    pullRequests: PullRequestWithSummary[],
): Promise<ProjectThreadWithSummary[]> {
    return await Promise.all(projectThreads.map(async (thread) => {
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
            console.log("No relevant PRs found for thread", thread.ai.title);
            return thread;
        }

        console.log(`${relevantPRs.length} relevant PRs found for thread`, thread.ai.title);

        // Sort PRs by date
        const sortedPRs = relevantPRs.sort((a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

        const enhancedSummary = await openai("smart")
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
                    .setLabel("Enhanced Project Summary")
                    .incognito()
                    .saveAs("enhanced_summary")
                    .prompt([
                        "Create an enhanced project summary by combining the project thread information with the pull request data.",
                        "Consider the chronological order of events:",
                        "1. Compare dates of project updates with PR dates (created, updated, merged).",
                        "2. If a project update mentions a PR status that's older than the PR's current state, use the most recent state.",
                        "3. If there are no project updates after significant PR activity, include those updates.",
                        "4. For projects with no recent thread updates but active PRs:",
                        "   - Focus on PR progress since the last thread update",
                        "   - Highlight any completed work that hasn't been reflected in the thread",
                        "5. Keep the summary concise (1-2 sentences) and factual.",
                        "6. Start with the most recent significant development.",
                    ])
                    .section("project_thread", "{{project_thread}}")
                    .section("pull_requests", "{{pull_requests}}")
                    .section("example", [
                        "Core features were merged to production on March 15th. Recent PRs (March 18-20) added dark mode support and fixed accessibility issues, awaiting final review.",
                    ].join("\n"))
            )
            .format(
                v.object({
                    summary: v.string("Enhanced summary of the project"),
                    lastUpdated: v.string("Date of the most recent activity (PR or thread update)"),
                })
            )
            .process();

        return {
            ...thread,
            ai: {
                ...thread.ai,
                summary: enhancedSummary.summary,
                lastUpdated: enhancedSummary.lastUpdated,
            },
        };
    }));
}
