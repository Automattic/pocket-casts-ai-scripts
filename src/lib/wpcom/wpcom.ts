import { authorize, getOAuthTokens } from "../oauth";
import type {
	Automatticians,
	MGS_Response,
	P2,
	P2s,
	SearchResult,
} from "./types";
import { autocache } from "../utilities";
import { logger } from "../logger";
import { autoproxxyFetch } from "./autoproxxy";

async function authorizedRequest<T>(
	/**
	 * Depending on whether this is an internal (autoproxxy validated) request
	 * or an external (plain oauth) request, we have to use different fetching functions.
	 *
	 * The autoproxxyFetch is a workaround because Bun only supports HTTP/HTTPS proxies.
	 */
	fetchingFn: typeof fetch | typeof autoproxxyFetch,
	path: string | URL,
	requestArguments?: Record<string, unknown>,
	headers: Record<string, string> = {},
): Promise<T> {
	const tokenSet = await getOAuthTokens();

	if (!tokenSet) {
		await authorize();
	}

	// If an URL object is passed, convert it to a string
	if (typeof path !== "string") {
		path = `${path.pathname}${path.search}`;
	}
	const url = `https://public-api.wordpress.com/${path}`;
	const response = await fetchingFn(url, {
		headers: {
			Authorization: `Bearer ${tokenSet?.accessToken}`,
			"Content-Type": "application/json",
			...headers,
		},
		...requestArguments,
	});

	if (!response.ok) {
		const text = await response.text();
		logger().error(`Failed to fetch "${url}": ${response.statusText}`);
		logger().error("WPCOM: ", text);
		throw new Error(text || response.statusText);
	}

	return (await response.json()) as T;
}

/**
 * A regular WordPress.com Public API Request
 */
export async function wpcomRequest<T>(
	path: string | URL,
	requestArguments?: Record<string, unknown>,
	headers: Record<string, string> = {},
): Promise<T> {
	return await authorizedRequest(fetch, path, requestArguments, headers);
}

/**
 * Internal, Automattician-only WordPress.com API Request
 */
export async function a8cRequest<T>(
	path: string | URL,
	requestArguments?: Record<string, unknown>,
	headers: Record<string, string> = {},
): Promise<T> {
	return await authorizedRequest(autoproxxyFetch, path, requestArguments, headers);
}

export enum SearchSortBy {
	CommentCount = "comment_count",
	Oldest = "oldest",
	Newest = "newest",
	Relevance = "score",
}

const MGS_RESULTS_PAGE_SIZE = 50;

export async function mgs(
	query: string,
	sortBy: SearchSortBy = SearchSortBy.Relevance,
): Promise<SearchResult[]> {
	logger().info("Searching for: " + query);

	const search = await a8cRequest<MGS_Response>(
		`rest/v1.1/internal/search`,
		{
			method: "POST",
			body: JSON.stringify({
				query: query,
				size: MGS_RESULTS_PAGE_SIZE,
			}),
		},
	);

	const results = search.results.hits.map((r): SearchResult => {
		const data = r.fields;

		return {
			id: r._id,
			title: data.title,
			content: data.content
				.trim()
				.replace(/\s\s+/, "")
				.replace("\n", "")
				.substring(0, 255),
			url: `https://${data.url}`,
			raw_date: data.date,
			date: new Date(data.date),
			p2: data.url.split(".")[0],
			comment_count: data.comment_count,
			like_count: data.like_count,
			author: data.author_login,
		};
	});

	logger().info(`Returned ${results.length} for ${query}`);

	if (sortBy === SearchSortBy.Relevance) {
		return results;
	}

	return results.sort((a, b) => {
		if (sortBy === SearchSortBy.Oldest) {
			return a.date.getTime() - b.date.getTime();
		}

		if (sortBy === SearchSortBy.CommentCount) {
			return b.comment_count - a.comment_count;
		}

		return b.date.getTime() - a.date.getTime();
	});
}

export async function matticspace() {
	const a12s = await autocache(
		"automatticians",
		1000 * 60 * 60 * 24,
		async () =>
			await a8cRequest<Automatticians>(
				`wpcom/v2/meetamattician/automatticians`,
			),
	);

	return a12s.automatticians;
}

/**
 * @TODO: This is limited to Alfred APP ID at the moment.
 * P2 list only works in sandboxed mode setting:
 * define( 'A8C_ALFRED_CLENT_ID', 80832 );
 */
export async function p2s(): Promise<P2[]> {
	const sites = await autocache("p2s", 1000 * 60 * 60 * 24, async () => {
		const p2s = await a8cRequest<P2s>(`rest/v1.1/internal/P2s`);

		// fetch the slug out of P2s object keys
		return Object.keys(p2s.list).map((slug): P2 => {
			const p2 = p2s.list[slug];
			p2.slug = slug;
			return p2;
		});
	});

	return sites;
}

export interface SiteData {
	blog_id: number;
	site_url: string;
	domain: string;
	site_type: string;
	jetpack_plugins?: string[];
}

export async function getBlog(
	query: string | number,
): Promise<SiteData | undefined> {
	// Append .wordpress.com if the query doesn't have dots in it
	if (typeof query === "string" && !query.includes(".")) {
		query += ".wordpress.com";
	}

	try {
		return await a8cRequest<SiteData>(`rest/v1.1/internal/site-search`, {
			method: "POST",
			body: JSON.stringify({
				query,
			}),
		});
	} catch (e) {
		if (e instanceof Error && e.message.includes("Site not found")) {
			throw new Error("Site not found");
		}
		throw e;
	}
}
