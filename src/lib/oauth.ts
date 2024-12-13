import WPOAuth from "wpcom-oauth";
import { dirname, join } from "path";
import { homedir } from "os";
import fs from "fs-extra";
import { $ } from "bun";

const settings = {
	client_id: "50066",
	client_secret:
		"zAk5dJ9LN53ddTAEtee26ATJZsLkbaVxXwnzzmpFwUoRRRYbe46HsSF2vJ6E4Yxc",
	url: {
		redirect: "http://localhost:8061",
	},
};

const wpoauth = WPOAuth(settings);

interface TokenSet {
	accessToken: string;
	refreshToken?: string;
	expiresIn?: number;
	expiresAt?: number;
}

const tokenPath = join(homedir(), ".config", "wpcom", "tokens.json");

export async function getOAuthTokens(): Promise<TokenSet | undefined> {
	try {
		await fs.ensureDir(dirname(tokenPath));
		if (!(await fs.pathExists(tokenPath))) {
			return undefined;
		}

		const content = await fs.readFile(tokenPath, "utf8");
		return JSON.parse(content) as TokenSet;
	} catch {
		return undefined;
	}
}

export async function authorize(): Promise<void> {
	return new Promise((resolve, reject) => {
		const server = Bun.serve({
			port: 8061,
			async fetch(req) {
				const url = new URL(req.url);
				const code = url.searchParams.get("code");

				if (!code) {
					return new Response(
						`
						<html>
							<head>
								<title>WordPress.com Authorization</title>
								<style>
									body { font-family: system-ui; max-width: 45em; margin: 2em auto; padding: 0 1em; line-height: 1.5; }
								</style>
							</head>
							<body>
								<h1>WordPress.com Authorization</h1>
								<p>Please authorize the application to continue.</p>
								<a href="${wpoauth.urlToConnect()}" style="display: inline-block; text-decoration: none; background: #00aadc; color: white; padding: 10px 20px; border-radius: 4px;">Authorize</a>
							</body>
						</html>
					`,
						{
							headers: { "Content-Type": "text/html" },
						},
					);
				}

				// Handle the OAuth callback
				wpoauth.code(code);
				wpoauth.requestAccessToken(
					async (
						err: Error | null,
						data: { access_token: string },
					) => {
						if (err) {
							server.stop();
							reject(err);
							return;
						}

						if (data?.access_token) {
							await fs.ensureDir(dirname(tokenPath));
							await fs.writeFile(
								tokenPath,
								JSON.stringify(
									{
										accessToken: data.access_token,
									},
									null,
									2,
								),
							);

							server.stop();
							resolve();
						}
					},
				);

				return new Response(
					`
					<html>
						<head>
							<title>Authorization Successful</title>
							<style>
								body { font-family: system-ui; max-width: 45em; margin: 2em auto; padding: 0 1em; line-height: 1.5; }
							</style>
						</head>
						<body>
							<h1>Authorization Successful!</h1>
							<p>You can close this window and return to the application.</p>
						</body>
					</html>
				`,
					{
						headers: { "Content-Type": "text/html" },
					},
				);
			},
		});

		// Open the browser and handle any errors
		(async () => {
			try {
				await $`open http://localhost:8061`;
			} catch (error) {
				server.stop();
				reject(new Error("Failed to open browser for authorization"));
			}
		})();
	});
}

export async function resetOAuthTokens(): Promise<void> {
	try {
		await fs.remove(tokenPath);
	} catch {
		// Ignore errors
	}
}
