import type * as NChain from "../types";

type PromptOptions = {
	onArtifact: (key: string, value: string) => void;
	onResponse: (prompt: Prompt) => void;
	send: (message: NChain.Message) => Promise<string>;
	getArtifact: (key: string) => string;
};

export class Prompt {
	#message: NChain.Message = { role: "user", content: "" };
	#key: string = "";
	#executed = false;
	#incognito = false;
	#response?: string;
	#label: string = "Prompt";

	constructor(private actions: PromptOptions) {}

	public get executed() {
		return this.#executed;
	}

	public get label() {
		return this.#label;
	}

	public set label(value: string) {
		this.setLabel(value);
	}

	public get response() {
		return this.#response;
	}

	public get key(): string {
		return this.#key;
	}

	public get isIncognito(): boolean {
		return this.#incognito;
	}

	public get message(): NChain.Message {
		return {
			...this.#message,
			content: this.replaceArtifacts(this.#message.content),
		};
	}

	public incognito(): Prompt {
		this.#incognito = true;
		return this;
	}

	public prompt(input: NChain.UserInput): Prompt {
		this.#message.content =
			typeof input === "string" ? input : input.join("\n");
		return this;
	}

	public section(name: string, content: NChain.UserInput): Prompt {
		const slug = name
			.trim()
			.toLowerCase()
			.replace(/[^\w]+/g, "_")
			.replace(/^_+|_+$/g, "");

		const text =
			typeof content === "string" ? content : content.join("\n");
		this.#message.content += `\n\n<${slug}>\n${text}\n</${slug}>\n\n`;
		return this;
	}

	public saveAs(key: string): Prompt {
		this.#key = key;
		return this;
	}

	private replaceArtifacts(content: string): string {
		return content.replace(/{{([\w_-]+)}}/g, (match, key) => {
			const artifact = this.actions.getArtifact(key);
			if (!artifact) return match;
			return typeof artifact === "string"
				? artifact
				: JSON.stringify(artifact);
		});
	}

	// Allow setting label in a chainable way
	public setLabel(value: string) {
		this.#label = value;
		return this;
	}

	private async onResponse(output: string): Promise<string> {
		this.actions.onResponse(this);
		if (this.#key) {
			this.actions.onArtifact(this.#key, output);
		}
		return output;
	}

	public async send(): Promise<string> {
		const response = await this.actions.send(this.message);
		this.#response = response;
		this.#executed = true;
		return this.onResponse(response);
	}

	public toJSON() {
		return {
			key: this.#key,
			label: this.#label,
			isIncognito: this.#incognito,
			executed: this.#executed,
			message: this.#message,
			response: this.#response,
		};
	}
}
