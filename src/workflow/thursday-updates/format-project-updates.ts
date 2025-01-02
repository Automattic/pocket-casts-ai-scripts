import type { ProjectThreadWithSummary } from "./ai-summarize-project-threads";

export async function formatProjectUpdates(
	projectThreads: ProjectThreadWithSummary[],
): Promise<string> {
	const sections: string[] = [];

	for (const thread of projectThreads) {
		sections.push(
			`### [${thread.ai.title}](${thread.link}) – ${thread.ai.status}`,
		);
		sections.push(thread.ai.summary);
		sections.push("");
	}

	return sections.join("\n\n");
}
