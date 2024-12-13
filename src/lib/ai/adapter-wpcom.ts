import type * as NChain from "./nchain/types";
import { AI_Message, cachedAiAPI, type WPCOM_MODEL } from "@ai/wpcom-ai";

const AvailableModels = {
	"llama3-8b": "llama3-8b",
	"llama3-70b": "llama3-70b",
	"gpt-3.5-turbo": "gpt-3.5-turbo",
	"gpt-4-turbo": "gpt-4-turbo",
	"gpt-4o": "gpt-4o",
	"gpt-4o-mini": "gpt-4o-mini",
} as const;

export class WPCOMAdapter implements NChain.Adapter<WPCOM_MODEL> {
	readonly availableModels = AvailableModels;
	#model: WPCOM_MODEL;

	constructor() {
		this.#model = "llama3-8b";
	}

	async chat(
		messages: NChain.Message[],
		system: string,
	): Promise<string> {
		const aiMessages: AI_Message[] = [
			{ role: "system", content: system },
			...messages,
		];
		const result = await cachedAiAPI(aiMessages, this.model);
		return result.choices[0].message.content.trim();
	}

	get model() {
		return this.availableModels[this.#model];
	}

	public use(model: WPCOM_MODEL) {
		this.#model = model;
		return this;
	}
}
