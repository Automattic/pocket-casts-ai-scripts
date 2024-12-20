export const repositorySources: Record<string, string[]> = {
	Android: ["https://github.com/Automattic/pocket-casts-android"],
	iOS: ["https://github.com/Automattic/pocket-casts-ios"],
	Web: [
		"https://github.com/Automattic/pocket-casts-webplayer",
		"https://github.com/Automattic/pocket-casts-desktop",
		"https://github.com/Automattic/pocket-casts-paid-placements",
		"https://github.com/a8cteam51/pocket-casts-main",
	],
	Backend: [
		"https://github.com/Automattic/pocket-casts-sync-api",
		"https://github.com/Automattic/pocket-casts-node-server",
		"https://github.com/Automattic/pocket-casts-sync-analytics",
		"https://github.com/Automattic/pocket-casts-server-scripts",
		"https://github.com/Automattic/pocket-casts-ratings-task",
		"https://github.com/Automattic/pocket-casts-collage-image",
		"https://github.com/Automattic/pocket-casts-admin-web",
		"https://github.com/Automattic/pocket-casts-static-assets",
		"https://github.com/Automattic/pocket-casts-speaker-integration",
		"https://github.com/Automattic/pocket-casts-image-caching",
		"https://github.com/Automattic/pocket-casts-cloud-infrastructure",
		"https://github.com/Automattic/pocket-casts-sharing-service",
	],
} as const;
