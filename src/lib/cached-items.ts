import { Cache } from "@raycast/api";

export interface CachedItem {
	/**
	 * How the item should be labeled in the cached results.
	 */
	label: string;

	/**
	 * The query that was used to search for this item.
	 */
	data: string;
}

export class CachedItems {
	private cache = new Cache();
	private data: CachedItem[];
	private key: string;

	constructor(key: string) {
		this.key = key;
		this.data = [];
		const data = this.cache.get(this.key);
		if (data) {
			this.data = JSON.parse(data);
		}
	}

	private save() {
		// Limit data to 50 items
		const data = this.data.slice(0, 50);
		this.cache.set(this.key, JSON.stringify(data));
	}

	public update(label: string, data: string) {
		console.log("Updating cache with", label, data);
		// delete existing
		this.data = this.data.filter((entry) => entry.data !== data);
		this.data.unshift({ label, data: data });
		this.save();
	}

	public get() {
		return this.data;
	}
}
