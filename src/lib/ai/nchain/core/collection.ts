import { WSServer } from "../debugger/ws-server";

export type CollectionChange = {
	action: "push" | "clear";
	entries: unknown[];
};

export type CollectionEvent = {
	collection: string;
	action: "push" | "clear";
	entries: unknown[];
	changes: CollectionChange;
};

export class Collection<T> {
	private debugger = WSServer.getInstance();

	constructor(public readonly name: string) {}

	/**
	 * When Incognito mode is on, new messages aren't stored in the history.
	 */
	public incognito = false;
	#entries: T[] = [];

	get entries() {
		return this.#entries;
	}

	private dispatch(event: CollectionEvent) {
		this.debugger.dispatch("collection", event);
	}

	push(...entries: T[]) {
		if (!this.incognito) {
			this.#entries.push(...entries);
			this.dispatch({
				collection: this.name,
				action: "push",
				entries: this.#entries,
				changes: {
					action: "push",
					entries,
				},
			});
		}
	}

	get(index: number): T {
		return this.#entries[index];
	}

	get length() {
		return this.#entries.length;
	}

	unshift(...entries: T[]) {
		if (!this.incognito) {
			this.#entries.unshift(...entries);
			this.dispatch({
				collection: this.name,
				action: "push",
				entries: this.#entries,
				changes: {
					action: "push",
					entries,
				},
			});
		}
	}

	filter(predicate: (entry: T) => boolean) {
		const prevEntries = [...this.#entries];
		this.#entries = this.#entries.filter(predicate);

		if (prevEntries.length !== this.#entries.length) {
			const removedEntries = prevEntries.filter(
				(entry) => !this.#entries.includes(entry),
			);
			this.dispatch({
				collection: this.name,
				action: "push",
				entries: this.#entries,
				changes: {
					action: "push",
					entries: removedEntries,
				},
			});
		}
		return this;
	}

	delete(index: number) {
		const deleted = this.#entries.splice(index, 1);
		this.dispatch({
			collection: this.name,
			action: "push",
			entries: this.#entries,
			changes: {
				action: "push",
				entries: deleted,
			},
		});
		return deleted;
	}

	clear() {
		const clearedEntries = [...this.#entries];
		this.#entries = [];
		this.dispatch({
			collection: this.name,
			action: "clear",
			entries: [],
			changes: {
				action: "clear",
				entries: clearedEntries,
			},
		});
	}
}
