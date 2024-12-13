import Anthropic from "@anthropic-ai/sdk";
import type * as NChain from "../types";

const AvailableModels = {
	"claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
	"claude-3-5-haiku": "claude-3-5-haiku-20241022",
	"claude-3-opus": "claude-3-opus-20240229",
	"claude-3-sonnet": "claude-3-sonnet-20240229",
	"claude-3-haiku": "claude-3-haiku-20240307",
};
type AnthropicModel = keyof typeof AvailableModels;

export class AnthropicAdapter implements NChain.Adapter<AnthropicModel> {
	private client: Anthropic;
	readonly availableModels = AvailableModels;
	#model: AnthropicModel;

	constructor(apiKey: string) {
		this.#model = "claude-3-haiku";
		this.client = new Anthropic({ apiKey });
	}

	async chat(messages: NChain.Message[], system: string): Promise<string> {
		const result = await this.client.messages.create({
			max_tokens: 4096,
			system: system,
			messages: messages,
			model: this.model,
		});

		return result.content[0].type === "text"
			? result.content[0].text.trim()
			: "";
	}

	get model() {
		return this.availableModels[this.#model];
	}

	public use(model: AnthropicModel) {
		this.#model = model;
		return this;
	}
}
