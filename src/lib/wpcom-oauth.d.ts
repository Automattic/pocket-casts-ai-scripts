declare module "wpcom-oauth" {
	interface WPOAuthSettings {
		client_id: string;
		client_secret: string;
		url: {
			redirect: string;
		};
	}

	interface WPOAuthInstance {
		urlToConnect(): string;
		code(code: string): void;
		requestAccessToken(
			callback: (
				error: Error | null,
				data: {
					access_token: string;
					token_type?: string;
					blog_id?: string;
					blog_url?: string;
					scope?: string;
				},
			) => void,
		): void;
	}

	function WPOAuth(settings: WPOAuthSettings): WPOAuthInstance;

	export = WPOAuth;
}
