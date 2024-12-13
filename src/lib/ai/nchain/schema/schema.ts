import type { Validation } from "./schema.types";
import { Thread } from "../index";

/**
 * Format a value according to a schema using AI
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function format<T extends Validation<any, any, any>>(
	adapter: Thread<any, any>,
	value: string,
	schema: T,
): Promise<ReturnType<T["parse"]>> {
	const thread = adapter
		.system([
			"You are a formatter that takes in data and a JSON like schema describing the desired output.",
			"Your task is to transform the data to match the schema.",
			"Your response is ONLY VALID JSON with no additional text.",
		])
		.insert("schema", schema.desc || "unknown schema")
		.insert("example", schema.example())
		.insert("value", value)
		.prompt((p) =>
			p
				.section("Schema:", "{{schema}}")
				.section("Example", "{{example}}")
				.section("Transform to match schema", "{{value}}"),
		);

	const response = await thread.process();
	try {
		return schema.parse(response);
	} catch (e) {
		/**
		 * Very rarely, but AI will sometimes return invalid JSON.
		 * This is a fallback to try to fix the error.
		 */
		const attempt2 = thread.prompt((p) => {
			p.prompt([
				"There was an error parsing the JSON. Please fix the error and return the correct JSON.",
				"Your response is ONLY VALID JSON with no additional text.",
				"Please try again:",
			])
				.section("error", e instanceof Error ? e.message : String(e))
				.section("response", response)
				.section("Schema", schema.desc || "unknown schema")
				.section("Transform to match schema", "{{value}}");
		});
		return schema.parse(await attempt2.process());
	}
}
