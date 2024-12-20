import { getPreferences } from "@pocket-ai/preferences";
import { $ } from "bun";

const { autoproxxy } = getPreferences();

type Response = {
	ok: boolean;
	json: () => Promise<unknown>;
	text: () => string;
	statusText: string;
	status: number;
};

/**
 * Proxy fetch using curl under the hood.
 */
export async function proxyFetch(
	url: string,
	opts: RequestInit = {},
): Promise<Response> {
	const curlArgs: string[] = [`--proxy ${$.escape(autoproxxy)}`, "-i", "-s"];

	// Handle HTTP method
	if (opts.method) {
		curlArgs.push(`-X ${$.escape(opts.method)}`);
	}

	// Handle headers
	if (opts.headers) {
		const headers = opts.headers as Record<string, string>;
		Object.entries(headers).forEach(([key, value]) => {
			curlArgs.push(`-H ${$.escape(`${key}: ${value}`)}`);
		});
	}

	// Handle body
	if (opts.body) {
		if (typeof opts.body === "string") {
			curlArgs.push(`-d ${$.escape(opts.body)}`);
		} else if (opts.body instanceof URLSearchParams) {
			curlArgs.push(`-d ${$.escape(opts.body.toString())}`);
		} else if (opts.body instanceof FormData) {
			throw new Error("FormData not supported");
		} else {
			curlArgs.push(`-d ${$.escape(JSON.stringify(opts.body))}`);
		}
	}

	try {
		const rawResponse =
			await $`curl ${{ raw: curlArgs.join(" ") }} ${url}`.text();

		// Split headers and body - handle both \r\n and \n
		const parts = rawResponse.split(/\r?\n\r?\n/);
		const headersText = parts[0];
		const body = parts.slice(1).join("\n\n").trim();

		// Parse status line - more permissive regex
		const statusLine = headersText.split(/\r?\n/)[0];
		const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+)([^]*)/);

		if (!statusMatch) {
			throw new Error(`Invalid response format: ${statusLine}`);
		}

		const status = parseInt(statusMatch[1], 10);
		const statusText = statusMatch[2].trim() || "Unknown Status";

		return {
			ok: status >= 200 && status < 300,
			json() {
				return JSON.parse(body);
			},
			text: () => body,
			statusText,
			status,
		};
	} catch (error) {
		// Handle common curl exit codes
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		const exitCodeMatch = errorMessage.match(/exit code (\d+)/);
		const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : null;

		let statusText = "Unknown error";

		switch (exitCode) {
			case 7:
				statusText = "Failed to connect to autoproxxy!";
				break;
			case 6:
				statusText = "Could not resolve host";
				break;
			case 28:
				statusText = "Operation timed out";
				break;
			case 35:
				statusText = "SSL/TLS handshake failed";
				break;
			case 56:
				statusText = "Connection reset by peer";
				break;
			default:
				statusText = errorMessage;
		}

		return {
			ok: false,
			json() {
				return Promise.reject(new Error(statusText));
			},
			text: () => "",
			statusText,
			status: 500,
		};
	}
}
