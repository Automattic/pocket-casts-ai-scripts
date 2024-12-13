import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export class Cache {
	private cacheDir: string;

	constructor() {
		this.cacheDir = join(homedir(), ".cache", "sprint-update");
		if (!existsSync(this.cacheDir)) {
			mkdirSync(this.cacheDir, { recursive: true });
		}
	}

	private getCachePath(key: string): string {
		return join(this.cacheDir, `${key}.json`);
	}

	get(key: string): string | undefined {
		const path = this.getCachePath(key);
		if (!existsSync(path)) {
			return undefined;
		}

		try {
			const data = JSON.parse(readFileSync(path, "utf-8"));
			if (data.expiry && Date.now() > data.expiry) {
				return undefined;
			}
			return data.value;
		} catch {
			return undefined;
		}
	}

	set(key: string, value: string, ttl?: number): void {
		const path = this.getCachePath(key);
		const data = {
			value,
			expiry: ttl ? Date.now() + ttl : undefined,
		};
		writeFileSync(path, JSON.stringify(data));
	}
}
