import { wpcomRequest } from "../wpcom/wpcom";
import { autocache } from "../utilities";
import crypto from "crypto";
export const WPCOM_MODELS = [
	"llama3-8b",
	"llama3-70b",
	"gpt-3.5-turbo",
	"gpt-4-turbo",
	"gpt-4o",
	"gpt-4o-mini",
] as const;
export type WPCOM_MODEL = (typeof WPCOM_MODELS)[number];

export type ChatCompletionResponse = {
	model: string;
	object: string;
	id: string;
	created: number;
	system_fingerprint: string;
	choices: Array<{
		finish_reason: string;
		index: number;
		message: {
			content: string;
		};
		logprobs: null | unknown;
	}>;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
};

export type AI_Message = {
	role: "system" | "user" | "assistant";
	content: string;
};

export async function aiAPI(
	payload: AI_Message[],
	model: WPCOM_MODEL = "llama3-8b",
): Promise<ChatCompletionResponse> {
	try {
		return await wpcomRequest<ChatCompletionResponse>(
			`wpcom/v2/internal/ai/chat`,
			{
				method: "POST",
				body: JSON.stringify({
					feature: "alfredmattic",
					model,
					payload: JSON.stringify(payload),
				}),
			},
		);
	} catch (error) {
		// Sleep for 5 seconds before retrying
		await new Promise((resolve) => setTimeout(resolve, 5000));

		return await wpcomRequest<ChatCompletionResponse>(
			`wpcom/v2/internal/ai/chat`,
			{
				method: "POST",
				body: JSON.stringify({
					feature: "alfredmattic",
					model,
					payload: JSON.stringify(payload),
				}),
			},
		);
	}
}

export async function cachedAiAPI(
	payload: AI_Message[],
	model: WPCOM_MODEL = "llama3-8b",
) {
	// Ensure cache key consistency because
	// autocache is going to return a JSON parsed object
	payload = JSON.parse(JSON.stringify(payload));
	// md5 hash of only user messages
	const hash = crypto
		.createHash("md5")
		.update(
			payload
				.filter((msg) => msg.role === "user")
				.map((msg) => msg.content.trim())
				.join("\n"),
		)
		.digest("hex")
		.slice(0, 8);
	return autocache(`${model}_${hash}`, 1000 * 60 * 60 * 24, () =>
		aiAPI(payload, model),
	);
}
