interface Preferences {
	autoproxxy: string;
	debug: boolean;
	GITHUB_TOKEN: string;
}

export function getPreferences(): Preferences {
	return {
		autoproxxy: Bun.env.autoproxxy || "socks5h://localhost:5555",
		debug: Bun.env.debug === "true",
		GITHUB_TOKEN: Bun.env.GITHUB_TOKEN || "",
	};
}
