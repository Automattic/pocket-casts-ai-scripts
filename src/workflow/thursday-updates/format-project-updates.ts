import type { ProjectThreadWithSummary } from "./ai-summarize-project-threads";

export async function formatProjectUpdates(
	projectThreads: ProjectThreadWithSummary[],
): Promise<string> {
	const sections: string[] = [];

	for (const thread of projectThreads) {
		sections.push(
			`### ${thread.ai.title} – ${thread.ai.status} [(link)](${thread.guid.rendered})`,
		);
		sections.push(thread.ai.summary);
		for (const update of thread.ai.updates) {
			sections.push(`- ${update.date}: ${update.summary}`);
		}
		sections.push("");
	}

	return sections.join("\n\n");
}
