import { openai } from "@/lib/ai/presets";
export async function aiMarkdownJanitor(markdown: string) {
	const thread = openai("smart")
		.insert("markdown", markdown)
		.insert(
			"instructions",
			[
				"If there is any duplication between Key Updates and Project Threads, move the entire Project Thread with links to Key Updates.",
				"Do not modify anything else.",
				"Respond only with the cleaned markdown and nothing else.",
				"Parent bullet points should broader than its children, swap them if necessary.",
			].join("\n"),
		)
		.insert(
			"example",
			[
				"",
				"<example_input>",
				"This is the introduction to the report.",
				"## Key Updates",
				"- Rubber Duck Launch",
				"  - [PR 99999](https://github.com/comp/proj/pull/99999) - implementing the rocket",
				"## Project Threads",
				"- [Launching Rubber Ducks](https://example.com/launching-rubber-ducks) - they're flying into space",
				"  - [PR 100](https://github.com/comp/proj/pull/100) - finding the ducks first",
				"- [Duck Lotto](https://example.com/lucky-ducks) - Lucky ducks",
				"  - [PR 200](https://github.com/comp/proj/pull/200) - some work",
				"  - [PR 300](https://github.com/comp/proj/pull/300) - washing the ducks",
				"Changed icon color",
				"- [PR 900](https://github.com/comp/proj/pull/900) - ui improvements",
				"- [PR 950](https://github.com/comp/proj/pull/950) - updated icon pack",
				"Other Updates",
				"- [PR 500](https://github.com/comp/proj/pull/500) - implementing lunch to feed the ducks",
				"</example_input>",
				"",
				"",
				"<example_output>",
				"This is the introduction to the report.",
				"## Key Updates",
				"- [Rubber Duck Launch](https://example.com/launching-rubber-ducks) - they're flying into space",
				"  - [PR 99999](https://github.com/comp/proj/pull/99999) - implementing the rocket",
				"  - [PR 100](https://github.com/comp/proj/pull/100) - finding the ducks first",
				"## Project Threads",
				"- [Duck Lotto](https://example.com/lucky-ducks) - Lucky ducks",
				"  - [PR 200](https://github.com/comp/proj/pull/200) - some work",
				"  - [PR 300](https://github.com/comp/proj/pull/300) - washing the ducks",
				"UI improvements",
				"- [PR 900](https://github.com/comp/proj/pull/900) - Changed icon color",
				"- [PR 950](https://github.com/comp/proj/pull/950) - updated icon pack",
				"Other Updates",
				"- [PR 500](https://github.com/comp/proj/pull/500) - implementing lunch to feed the ducks",
				"</example_output>",
				"",
			].join("\n"),
		)
		.prompt((p) => {
			p.saveAs("suggestions")
				.incognito()
				.prompt([
					"Please analyze the markdown and list any logical errors and inconsistencies.",
					"We must keep the language and tone exactly as it was written.",
					"But we need to fix any issues like:",
					"- Parent bullet points should broader than its children, swap them if necessary.",
					"- If there is any duplication between Key Updates and Project Threads, move the entire Project Thread with links to Key Updates.",
					"- If there's any duplication it should be removed",
					"- etc.",
					"",
					"I've provided two examples of what the input/output difference should look like in a typical scenario.",
					"Your task is to describe the changes necessary to make sure this markdown is also correct.",
					"Make sure to preserve the original markdown as much as possible, be very careful with indentation.",
				])
				.section("markdown", "{{markdown}}")
				.section("example", "{{example}}");
		})
		.system([
			"You are a natural language text processor for Markdown",
			"You do not create new content or respond with any thoughts.",
			"You only take in Markdown as input and produce the Markdown adjusted to user requirements as output.",
			"XML Tags are only used to group content for you to process.",
			"Do not produce XML tags in the output.",
			"Respond with plain, cleaned markdown.",
		])
		.prompt((p) =>
			p
				.prompt([
					"Please reorganize the markdown according to the instructions and suggestions.",
					"{{instructions}}",
				])
				.section("instructions", "{{instructions}}")
				.section("suggestions", "{{suggestions}}")
				.section("markdown", "{{markdown}}")
				.section("example", "{{example}}"),
		);

	await thread.process();
	return thread.getResult();
}
