import OpenAI from "openai";
import type * as NChain from "../types";

const AvailableModels = {
	"gpt-4o": "gpt-4o",
	"gpt-4o-mini": "gpt-4o-mini",
	"gpt-4-turbo": "gpt-4-turbo",
	"gpt-4": "gpt-4",
};
type OpenAIModel = keyof typeof AvailableModels;

export class OpenAIAdapter implements NChain.Adapter<OpenAIModel> {
	private client: OpenAI;
	readonly availableModels = AvailableModels;
	#model: OpenAIModel;

	constructor(apiKey: string) {
		this.#model = "gpt-4o-mini";
		this.client = new OpenAI({ apiKey });
	}

	async chat(messages: NChain.Message[], system: string): Promise<string> {
		const result = await this.client.chat.completions.create({
			model: this.model,
			messages: [{ role: "system", content: system }, ...messages],
			max_tokens: 4096,
		});

		return result.choices[0].message.content?.trim() ?? "";
	}

	get model() {
		return this.availableModels[this.#model];
	}

	public use(model: OpenAIModel) {
		this.#model = model;
		return this;
	}
}
