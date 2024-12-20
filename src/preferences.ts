interface Preferences {
	autoproxxy_uri: string;
	debug: boolean;
	GITHUB_TOKEN: string;
}

export function getPreferences(): Preferences {

	/**
	 * Defining `AUTOPROXXY_PORT` will use default localhost and the given port
	 */
	const proxyPort = Bun.env.AUTOPROXXY_PORT || 8080;
	/**
	 * You can define `AUTOPROXXY_URI` to use a custom proxy URL
	 */
	const autoproxxy_uri = Bun.env.AUTOPROXXY_URI || `socks5h://localhost:${proxyPort}`;
	const debug = Bun.env.debug === "true";
	const GITHUB_TOKEN = Bun.env.GITHUB_TOKEN || "";

	return {
		autoproxxy_uri,
		debug,
		GITHUB_TOKEN,
	};
}
