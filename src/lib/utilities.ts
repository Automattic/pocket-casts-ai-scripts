import {
	Cache,
	environment,
	Clipboard,
	showHUD,
	showToast,
	Toast,
} from "@raycast/api";
import TurndownService from "turndown";

export async function autocache<T>(
	key: string,
	ttl: number,
	fn: () => Promise<T>,
): Promise<T> {
	const cache = new Cache({
		namespace: "autocache",
		capacity: 100 * 1024 * 1024,
	});
	const ttlKey = `${key}_ttl`;

	const TTL = cache.get(ttlKey);

	// Check if the cache should be invalidated
	if (TTL && parseInt(TTL) < Date.now()) {
		cache.remove(ttlKey);
		cache.remove(key);
	}

	// Fetch fresh data if no cache or TTL expired
	if (!cache.has(key) || !cache.has(ttlKey)) {
		console.log(`[Cache] MISS: ${key}`);
		try {
			const data = await fn();
			// Cache might have updated while fetching,
			// This can break AI answer chains,
			// so we'll discard the data we got.
			if (cache.has(key) === false) {
				cache.set(key, JSON.stringify(data));
				cache.set(ttlKey, `${Date.now() + ttl}`);
			} else {
				console.log(`[Cache] DISCARDING RACE RESULT: ${key}`);
			}
		} catch (e) {
			console.error("Error while fetching data: ", e);
			throw e;
		}
	} else {
		if (environment.isDevelopment) {
			const expiresIn = TTL
				? Math.round((Number(TTL) - Date.now()) / 1000)
				: "N/A";
			console.log(
				`[Cache] HIT: ${key} ${expiresIn !== "N/A" ? ` (expires in ${expiresIn}s)` : ""}`,
			);
		}
	}
	return JSON.parse(cache.get(key) || "{}") as T;
}

export interface RichTextContent {
	html: string;
	text: string;
}

export async function copyAsRichText(content: RichTextContent) {
	try {
		const formattedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
            li { margin: 4px 0; }
          </style>
        </head>
        <body>
          ${content.html}
        </body>
      </html>
    `;

		const clipboardContent: Clipboard.Content = {
			html: formattedHtml,
			text: content.text,
		};

		await Clipboard.copy(clipboardContent);
		await showHUD("Copied to clipboard");
	} catch (error) {
		console.error("Failed to copy as rich text:", error);
		await showToast({
			style: Toast.Style.Failure,
			title: "Failed to copy",
			message: String(error),
		});
	}
}

export async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const turndownService = new TurndownService();

export function htmlToMarkdown(html: string) {
	return turndownService.turndown(html);
}
