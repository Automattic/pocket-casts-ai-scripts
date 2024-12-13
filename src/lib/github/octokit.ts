import { getPreferences } from "../../preferences";
import { Octokit } from "@octokit/rest";
import { retry } from "@octokit/plugin-retry";
import { throttling } from "@octokit/plugin-throttling";
import fetch from "node-fetch";
import type { Require } from "../wpcom/types";

// Extended interface for parsed GitHub URLs
export type Repository = {
	url: string;
	owner: string;
	repo: string;
	type: "pull" | "pulls" | "issues" | "blob" | "repo";
	number?: number;
	branch?: string;
	path?: string;
};

/**
 * Parses a full GitHub URL into its components
 */
function parseGitHubURL(url: URL): Repository {
	const pathParts = url.pathname.split("/").filter(Boolean);

	if (pathParts.length < 2) {
		throw new Error(
			"Invalid GitHub URL: URL must include owner and repository",
		);
	}

	const [owner, repo, type, ...rest] = pathParts;

	if (!owner || !repo) {
		throw new Error("Invalid GitHub URL: Missing required URL components");
	}

	// If no type is specified, treat it as a repository URL
	if (!type) {
		return {
			url: `https://github.com/${owner}/${repo}`,
			owner,
			repo,
			type: "repo",
		};
	}

	if (!["pull", "pulls", "issues", "blob", "repo"].includes(type)) {
		throw new Error(`Unsupported GitHub content type: ${type}`);
	}

	if (type === "blob") {
		if (rest.length < 2) {
			throw new Error(
				"Invalid file URL: Missing path or branch information",
			);
		}
		const [branch, ...pathParts] = rest;
		return {
			url: `https://github.com/${owner}/${repo}/blob/${branch}/${pathParts.join("/")}`,
			owner,
			repo,
			type,
			branch,
			path: pathParts.join("/"),
		};
	}

	const number = parseInt(rest[0], 10);
	if (isNaN(number)) {
		throw new Error("Invalid URL: Missing or invalid number");
	}

	return {
		url: `https://github.com/${owner}/${repo}/${type}/${number}`,
		owner,
		repo,
		type: type as "pull" | "pulls" | "issues",
		number,
	};
}

/**
 * Resolves a repository string into a ParsedGitHubURL
 * Accepts formats: "owner/repo" or full GitHub URLs
 */
export function getRepo<R extends keyof Repository = never>(
	input: string,
	requireFields: R[] = [],
): Require<Repository, R> {
	let repository: Repository;

	try {
		// If it's already a URL, parse it directly
		if (input.includes("github.com")) {
			repository = parseGitHubURL(new URL(input));
		} else {
			// If it's in owner/repo format, convert to URL and parse
			const [owner, repo] = input.split("/");
			if (!owner || !repo) {
				throw new Error();
			}
			repository = parseGitHubURL(
				new URL(`https://github.com/${owner}/${repo}`),
			);
		}
		if (
			requireFields.length > 0 &&
			!requireFields.every((key) => repository[key] !== undefined)
		) {
			throw new Error(
				`Missing required fields: ${requireFields.join(", ")}`,
			);
		}
		return repository as Repository & Require<Repository, R>;
	} catch {
		throw new Error(
			'Invalid repository format. Use "owner/repo" or full GitHub URL',
		);
	}
}

const BackoffKit = Octokit.plugin(retry, throttling);

export async function getOctokit() {
	const { GITHUB_TOKEN } = getPreferences();

	if (!GITHUB_TOKEN) {
		throw new Error(
			"GitHub token not found. Please set GITHUB_TOKEN in config or environment.",
		);
	}

	return new BackoffKit({
		auth: GITHUB_TOKEN,
		request: {
			fetch: fetch,
		},
		throttle: {
			onRateLimit: async (retryAfter, options, octokit, retryCount) => {
				console.log(
					`[GitHub API] Rate limit reached for ${options.method} ${options.url}. ${retryCount < 2 ? `Retrying in ${retryAfter}s...` : "Max retries reached."}`,
				);
				if (retryCount < 2) {
					await new Promise((resolve) =>
						setTimeout(resolve, retryAfter * 1000),
					);
					return true;
				}
				return false;
			},
			onSecondaryRateLimit: async (retryAfter, options) => {
				console.log(
					`[GitHub API] Secondary rate limit for ${options.method} ${options.url}. Retrying in ${retryAfter}s...`,
				);
				await new Promise((resolve) =>
					setTimeout(resolve, retryAfter * 1000),
				);
				return true;
			},
		},
	});
}
