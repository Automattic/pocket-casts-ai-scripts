/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as NChain from "../types";
import { Collection } from "./collection";
import { Prompt } from "./prompt";
import type { Validation, ValidationOutput } from "../schema/schema.types";
import { format } from "../schema/schema";
import { debug } from "../debugger/ws-server";

type Entry = {
	role: "user" | "assistant";
	content: string;
};

export type ThreadHook<T> = (thread: Thread<any, any>) => Promise<T>;

export type QueueItem = {
	label: string;
	executed: boolean;
} & (
	| {
			type: "prompt";
			content: Prompt;
	  }
	| {
			type: "system";
			content: string;
	  }
	| {
			type: "switch_adapter";
			content: string;
	  }
	| {
			type: "hook";
			content: ThreadHook<any>;
			result?: unknown;
	  }
);

export class Thread<Adapter extends NChain.Adapter<any>, Output = string> {
	/**
	 * Keep track of the thread
	 */
	#history: Collection<Entry>;

	/**
	 * Keep track of the queue of items to execute.
	 */
	#queue = new Collection<QueueItem>("queue");

	/**
	 * Artifacts can be produced and consumed by the LLM.
	 * They're accessible in the prompt using "{{key}}" syntax.
	 */
	#artifacts: Map<string, unknown> = new Map();

	#systemPrompt = "You are a helpful AI Assistant.";

	#adapter: Adapter;
	#adapters: Record<string, Adapter>;

	#formatter?: ThreadHook<any>;

	#lastResult?: Output;

	constructor(
		adapter: keyof typeof adapters,
		adapters: Record<"smart" | "fast", Adapter>,
	) {
		this.#adapters = adapters;
		this.#history = new Collection("history");
		this.#adapter = adapters[adapter];
	}

	public incognito(enabled = true) {
		this.#history.incognito = enabled;
		return this;
	}

	public get history() {
		return this.#history;
	}

	private messages(filter: NChain.Message["role"]): NChain.Message[] {
		return this.#history.entries.filter(
			(message) => message.role === filter,
		);
	}

	public get(
		relPosition = 1,
		filter: NChain.Message["role"] = "assistant",
	): NChain.Message {
		const messages = this.messages(filter);
		const index = messages.length - relPosition;
		return messages[index];
	}

	system(prompt: NChain.UserInput): Thread<Adapter, Output> {
		this.#queue.filter((item) => !(item.type === "system"));

		this.#queue.unshift({
			type: "system",
			label: "System Prompt",
			content: Array.isArray(prompt) ? prompt.join("\n") : prompt,
			executed: false,
		});
		return this;
	}

	/**
	 * Set a variable, also known as "artifact"
	 * that's accessible in the prompt using "{{key}}" syntax.
	 */
	public insert(key: string, value: string): Thread<Adapter, Output> {
		this.#artifacts.set(key, value);
		debug("set_artifact", { key, value });
		return this;
	}

	public getArtifact<T = unknown>(key: string): T {
		return this.#artifacts.get(key) as T;
	}

	/**
	 * Threads themselves only keep track of things.
	 * Prompts are the only way to interact with the LLM.
	 */
	public prompt(
		input: NChain.UserInput | ((p: Prompt) => void),
	): Thread<Adapter, Output> {
		const prompt = new Prompt({
			onResponse: (prompt) => {
				if (!prompt.isIncognito && prompt.response) {
					this.#history.push(
						{ role: "user", content: prompt.message.content },
						{ role: "assistant", content: prompt.response },
					);
				}
				return prompt.response;
			},
			send: (message) => {
				const entries: NChain.Message[] = [
					...this.#history.entries,
					message,
				];
				return this.#adapter.chat(entries, this.#systemPrompt);
			},
			onArtifact: (key, value) => this.insert(key, value),
			getArtifact: (key) => this.getArtifact(key),
		});

		if (typeof input === "function") {
			input(prompt);
		} else {
			prompt.prompt(input);
		}

		this.#queue.push({
			type: "prompt",
			content: prompt,
			label: prompt.label,
			executed: false,
		});

		return this;
	}

	public retry(): Thread<Adapter, Output> {
		const lastExecutedIndex = [...this.#queue.entries]
			.reverse()
			.findIndex(
				(item) =>
					item.executed &&
					(item.type === "prompt" || item.type === "hook"),
			);

		if (lastExecutedIndex === -1) {
			throw new Error("No previous prompt or hook to retry");
		}

		const itemIndex = this.#queue.length - 1 - lastExecutedIndex;
		const item = this.#queue.get(itemIndex);

		item.executed = false;
		if (item.type === "hook") {
			item.result = undefined;
		}

		return this;
	}

	public use(adapter: string): Thread<Adapter, Output> {
		this.#queue.push({
			type: "switch_adapter",
			label: `Use ${adapter}`,
			content: adapter,
			executed: false,
		});
		return this;
	}

	public hook<T>(
		label: string,
		hook: ThreadHook<T>,
	): Thread<Adapter, T> {
		this.#queue.push({
			label,
			type: "hook",
			content: hook,
			executed: false,
		});
		return this as unknown as Thread<Adapter, T>;
	}

	private createFormatter<V extends Validation<any, any, any>>(
		validation: V,
	) {
		return async (data: string) =>
			await format(
				new Thread("fast", this.#adapters),
				data,
				validation,
			);
	}

	public format<V extends Validation<any, any, any>>(
		validation: V,
	): Thread<Adapter, ValidationOutput<V>> {
		const formatter = this.createFormatter(validation);
		this.#formatter = async (thread) => {
			const result = thread.getResult();
			return formatter(result);
		};

		return this as unknown as Thread<Adapter, ValidationOutput<V>>;
	}

	public async getFormattedArtifact<V extends Validation<any, any, any>>(
		key: string,
		validation: V,
	) {
		const artifact = this.getArtifact<string>(key);
		const formatter = this.createFormatter(validation);
		return await formatter(artifact);
	}

	public getResult(): Output | undefined {
		return this.#lastResult;
	}

	public async process(
		returnKey?: string,
		steps?: number,
	): Promise<Output> {
		let stepsExecuted = 0;

		for (const item of this.#queue.entries) {
			let result: string | undefined;

			// Don't execute the same step twice, even if `process()` is called multiple times
			if (item.executed) {
				continue;
			}

			// Limit how many steps are executed
			if (steps && stepsExecuted >= steps) {
				break;
			}

			switch (item.type) {
				case "prompt": {
					result = await item.content.send();
					break;
				}

				case "hook": {
					result = await item.content(this);
					break;
				}

				case "system": {
					this.#systemPrompt = item.content;
					break;
				}
				case "switch_adapter": {
					const adapterType = item.content;
					if (!(adapterType in this.#adapters)) {
						throw new Error(
							`Unknown adapter type: ${adapterType}`,
						);
					}
					this.#adapter = this.#adapters[adapterType];
					break;
				}
			}

			if (undefined !== result) {
				// Last result can be a string, but also can be modified
				// by the formatter, so we just have to tell TypeScript
				// that if a string doesn't match `Output`, it's fine here.
				this.#lastResult = result as Output;
			}

			stepsExecuted++;
			item.executed = true;
		}

		// Apply formatter if it exists
		if (this.#formatter) {
			const result = await this.#formatter(this);
			this.#lastResult = result;
			return result;
		}

		if (returnKey) {
			return this.getArtifact(returnKey);
		}

		if (!this.#lastResult) {
			throw new Error(
				"Thread processing failed - thread has no final result.",
			);
		}

		return this.#lastResult;
	}

	public getQueue(): readonly QueueItem[] {
		return this.#queue.entries;
	}

	public getSystemPrompt(): string {
		return this.#systemPrompt;
	}
}
