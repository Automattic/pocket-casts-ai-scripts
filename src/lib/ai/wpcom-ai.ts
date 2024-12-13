import { useState } from "react";
import { wpcomRequest } from "../wpcom/wpcom";
import { Cache } from "@raycast/api";
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

export function cacheWithRegistry<T>(namespace: string) {
	const cache = new Cache({ namespace });
	const registryKey = `${namespace}-registry`;
	const getRegistry = () => JSON.parse(cache.get(registryKey) || "[]");

	const set = (key: string, value: T) => {
		cache.set(key, JSON.stringify(value));

		// If this is a new key, add it to the registry
		const registry = getRegistry();
		if (!registry.includes(key)) {
			registry.push(key);
			cache.set(registryKey, JSON.stringify(registry));
		}
	};

	const get = (key: string): T | undefined => {
		try {
			return JSON.parse(cache.get(key) || "");
		} catch (e) {
			return undefined;
		}
	};

	const getAll = (): { id: string; entry: T }[] => {
		const registry = getRegistry();
		return registry.map((key: string) => ({
			id: key,
			entry: get(key),
		}));
	};

	return { get, getAll, set };
}

export function threadName(thread: AI_Message[]) {
	return (
		thread.find((entry) => entry.role === "user")?.content ||
		"New Thread"
	);
}

export function useChatHistory(
	namespace: string,
	key: string,
	systemPrompt?: string,
) {
	const cache = cacheWithRegistry<AI_Message[]>(namespace);

	const [history, setHistory] = useState<AI_Message[]>(
		cache.get(key) || [],
	);

	const addMessage = (message: AI_Message) => {
		setHistory((prev) => {
			const newHistory = [...prev, message];
			cache.set(key, newHistory);
			return newHistory;
		});
		return [...history, message];
	};

	if (systemPrompt && history.length === 0) {
		addMessage({ role: "system", content: systemPrompt });
	}

	return [history, addMessage, setHistory] as const;
}
