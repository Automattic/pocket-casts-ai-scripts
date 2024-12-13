import { Post, PostComment, PostWithComments, Tag } from "./types";
import { wpcomRequest } from "./wpcom";

function p2ToRest(p2Input: string | URL): URL {
	// Convert string input to URL object
	let url: URL;
	try {
		// If it's already a URL object, use it directly
		if (p2Input instanceof URL) {
			url = p2Input;
		} else {
			// If it doesn't have dots, assume it's a p2 slug
			if (!p2Input.includes(".")) {
				p2Input = `${p2Input}.wordpress.com`;
			}
			// Try to create URL object, adding protocol if needed
			url = new URL(
				p2Input.startsWith("http")
					? p2Input
					: `https://${p2Input}`,
			);
		}
	} catch (e) {
		throw new Error("Invalid P2 URL or slug");
	}

	let result = `wp/v2/sites/${url.host}/posts/`;
	if (url.pathname && url.pathname !== "/") {
		result += `?slug=${url.pathname.replace(/^\/|\/$/g, "")}`;
	}
	return new URL(`https://public-api.wordpress.com/${result}`);
}

type PostQueryConfig = {
	posts_per_page?: number;
	page?: number;
	sticky?: boolean;
	dateRange: {
		startDate: Date;
		endDate: Date;
	};
};

/**
 * Single Post
 */
export async function getPost(url: string): Promise<Post> {
	try {
		const restUrl = p2ToRest(url);
		return await wpcomRequest(restUrl);
	} catch (e) {
		if (e instanceof Error && e.message.includes("Post not found")) {
			throw new Error("Post not found");
		}
		throw e;
	}
}

/**
 * Posts
 * API URL: wp/v2/sites/{site}/posts/
 */
export async function getPosts(
	p2: string,
	config?: PostQueryConfig,
): Promise<Post[]> {
	const restUrl = p2ToRest(p2);
	if (config?.page) {
		restUrl.searchParams.set("page", config.page.toString());
	}
	if (config?.posts_per_page) {
		restUrl.searchParams.set(
			"per_page",
			config.posts_per_page.toString(),
		);
	}
	if (config?.sticky) {
		restUrl.searchParams.set("sticky", config.sticky.toString());
	}
	restUrl.searchParams.set("_embed", "comments");
	return await wpcomRequest(restUrl);
}

/**
 * Comments
 * API URL: wp/v2/sites/{site}/comments?post={post_id}
 */
export async function getComments(
	p2: string,
	postId: number,
): Promise<PostComment[]> {
	const restUrl = p2ToRest(p2);
	restUrl.pathname = restUrl.pathname.replace("/posts/", "/comments/");
	restUrl.searchParams.set("post", postId.toString());
	restUrl.searchParams.set("per_page", "50");
	restUrl.searchParams.set("orderby", "date");
	restUrl.searchParams.set("order", "desc");
	return await wpcomRequest(restUrl);
}

function findTagWithHighestCount(tags: Tag[]): Tag {
	let highestCountTag = tags[0];
	for (const tag of tags) {
		if (tag.count > highestCountTag.count) {
			highestCountTag = tag;
		}
	}
	return highestCountTag;
}

/**
 * Project Threads
 */
export async function getProjectThreads(
	p2: string,
	config: PostQueryConfig,
): Promise<PostWithComments[]> {
	// First get the URL for the tags endpoint
	const baseUrl = p2ToRest(p2);
	const tagsUrl = new URL(baseUrl.href.replace("/posts/", "/tags"));
	tagsUrl.searchParams.set("search", "project-thread");

	// Get all matching tags
	const tags = await wpcomRequest<Tag[]>(tagsUrl);
	const projectThreadTag = findTagWithHighestCount(tags);

	// Get posts with this tag
	const postsUrl = p2ToRest(p2);
	postsUrl.searchParams.set("tags", projectThreadTag.id.toString());

	// Add any additional query params from config
	const posts = await Promise.all(
		(
			await getPosts(p2, {
				...config,
				posts_per_page: 30,
				sticky: true,
			})
		).map(async (post: Post): Promise<PostWithComments> => {
			const comments = await getComments(p2, post.id);
			return { ...post, comments };
		}),
	);

	return posts
		.filter((post) =>
			post.class_list?.some((className) =>
				className.startsWith("status-"),
			),
		)
		.filter((post) => {
			const commentsInRange =
				post.comments?.filter((comment) => {
					const commentDate = new Date(comment.date);
					return (
						// Remove comments that are before the start date
						commentDate >= config.dateRange.startDate &&
						// Remove comments that are after the end date
						commentDate <= config.dateRange.endDate
					);
				}) || [];
			return commentsInRange.length > 0;
		});
}
