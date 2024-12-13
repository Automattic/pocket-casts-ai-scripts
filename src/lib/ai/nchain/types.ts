export interface Adapter<T extends string> {
	readonly availableModels: Record<T, string>;
	use: (model: T) => this;
	chat(messages: Message[], systemPrompt: string): Promise<string>;
}

export interface Message {
	role: "user" | "assistant";
	content: string;
}

export type UserInput = string | string[];
