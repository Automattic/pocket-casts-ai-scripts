/**
 * Require a set of keys on a type
 * When K is never (default), returns the original type T unchanged
 * When K contains keys, makes those properties required and non-nullable
 */
export type Require<T, K extends keyof T = never> = [K] extends [never]
	? T
	: { [P in K]-?: NonNullable<T[P]> };

export type Post = {
	id: number;
	date: string;
	date_gmt: string;
	guid: {
		rendered: string;
	};
	modified: string;
	modified_gmt: string;
	slug: string;
	status: string;
	type: string;
	link: string;
	title: {
		rendered: string;
	};
	content: {
		rendered: string;
		protected: boolean;
	};
	excerpt: {
		rendered: string;
		protected: boolean;
	};
	author: number;
	featured_media: number;
	comment_status: string;
	ping_status: string;
	sticky: boolean;
	template: string;
	format: string;
	meta: Record<string, unknown>;
	categories: number[];
	tags: number[];
	class_list: string[];
};

export type PostComment = {
	id: number;
	post: number;
	parent: number;
	author: number;
	author_name: string;
	author_url: string;
	date: string;
	date_gmt: string;
	content: {
		rendered: string;
	};
	link: string;
	status: string;
	type: string;
	author_avatar_urls: {
		[size: string]: string;
	};
};

export type PostWithComments = Post & {
	comments?: PostComment[];
};

export type Tag = {
	id: number;
	count: number;
	description: string;
	link: string;
	name: string;
	slug: string;
	taxonomy: string;
};

export type SearchResult = {
	id: string;
	url: string;
	title: string;
	date: Date;
	raw_date: string;
	comment_count: number;
	like_count: number;
	author: string;
	content: string;
	p2: string;
};

/**
 * The interface is incomplete, but it describes at least the data we need.
 */
export type MGS_Response = {
	results: {
		total: number;
		hits: {
			_id: string;
			fields: {
				title: string;
				date: string;
				comment_count: number;
				like_count: number;
				blogname: string;
				author_login: string;
				content: string;
				url: string;
			};
		}[];
	};
};

export type Automatticians = {
	total_automatticians: string;
	total_friends: number;
	automatticians: Automattician[];
};

export type Automattician = {
	ID: number;
	name: string;
	job_title: string;
	skype: string | null;
	mobile_phone: string;
	automattic_email: string;
	gravatar_url: string;
	twitter: string;
	website: string;
	address_city: string;
	address_state: string;
	address_country: string;
	slack: string; // deprecated
	slack_id: string;
	team_group: string;
	wp_username: string;
	github: string;
	friends: boolean;
	customer_pseudonym: string | null;
};

export type P2 = {
	blog_ID: number;
	site_URL: string;
	title: string;
	blavatar: string;
	slug: string;
	description: string;
};

export type P2s = {
	list: Record<string, P2 & { slug: string }>;
};
