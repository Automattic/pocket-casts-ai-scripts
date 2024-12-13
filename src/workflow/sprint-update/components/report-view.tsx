import { ActionPanel, Action, Detail, Clipboard } from "@raycast/api";
import { marked } from "marked";
import { copyAsRichText } from "@/lib/utilities";
import type { ProgressStep } from "../types";

interface ReportViewProps {
	markdown?: string;
	isLoading: boolean;
	progress?: ProgressStep;
	error?: Error;
}

export function ReportView({
	markdown,
	isLoading,
	progress,
	error,
}: ReportViewProps) {
	if (error) {
		return (
			<Detail
				markdown={`# Error Generating Report\n\n${error.message}`}
				isLoading={false}
			/>
		);
	}

	if (!markdown) {
		return (
			<Detail
				markdown={getProgressMarkdown(progress)}
				isLoading={isLoading}
			/>
		);
	}

	return (
		<Detail
			markdown={[
				"",
				markdown,
				"\n",
				"Press ⏎ to copy as markdown, ⌘⏎ to copy as rich text",
			].join("\n")}
			actions={
				<ActionPanel>
					<Action
						title="Copy as Markdown"
						onAction={() => Clipboard.copy(markdown)}
						shortcut={{ modifiers: [], key: "return" }}
					/>
					<Action
						title="Copy as Rich Text"
						onAction={async () => {
							marked.setOptions({
								gfm: true,
								breaks: true,
							});
							const html = await marked.parse(markdown);
							copyAsRichText({
								html,
								text: markdown,
							});
						}}
						shortcut={{ modifiers: ["cmd"], key: "return" }}
					/>
				</ActionPanel>
			}
		/>
	);
}

function getProgressMarkdown(progress?: ProgressStep) {
	if (!progress) {
		return "# Initializing...";
	}

	const steps = [
		"Loading Pull Requests",
		"Analyzing Pull Requests",
		"Loading Project Threads",
		"Generating Summaries",
		"Formatting Report",
		"Complete",
	];

	const stepsMarkdown = steps
		.map((step, index) => {
			const stepNumber = index + 1;
			const isCurrentStep = stepNumber === progress.step;
			const isDone = stepNumber < progress.step;

			return `${isDone ? "✓" : isCurrentStep ? "→" : "○"} ${step}${
				isCurrentStep && progress.detail
					? `\n   ${progress.detail}`
					: ""
			}`;
		})
		.join("\n\n");

	return `# Generating Sprint Update\n\n${progress.message}\n\n${stepsMarkdown}`;
}
