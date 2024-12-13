import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

interface Preferences {
	autoproxxy: string;
	debug: boolean;
	GITHUB_TOKEN: string;
}

const CONFIG_FILE = join(homedir(), ".config", "sprint-update", "config.json");

export function getPreferences(): Preferences {
	return {
		autoproxxy: Bun.env.autoproxxy || "socks5h://localhost:5555",
		debug: Bun.env.debug === "true",
		GITHUB_TOKEN: Bun.env.GITHUB_TOKEN || "",
	};
}
