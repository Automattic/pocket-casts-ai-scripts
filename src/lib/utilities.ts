import { Cache } from "./cache";
import TurndownService from "turndown";
import { $ } from "bun";


export async function autocache<T>(
	key: string,
	ttl: number,
	fn: () => Promise<T>,
): Promise<T> {
	const cache = new Cache();
	const cached = cache.get(key);
	if (cached) {
		return JSON.parse(cached);
	}

	const result = await fn();
	cache.set(key, JSON.stringify(result), ttl);
	return result;
}

export async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const turndownService = new TurndownService();

export function htmlToMarkdown(html: string) {
	return turndownService.turndown(html);
}

export async function isMacOS() {
	return process.platform === "darwin";
}

export async function copyRichText(text: string) {
	if ((await isMacOS()) === false) {
		throw new Error("copyRichText is only supported on macOS");
	}
	const tempFile = `/tmp/pr-report-${Date.now()}.html`;
	await $`printf '%s' "${text}" > ${tempFile}`;
	await $`textutil -convert rtf -format html ${tempFile} -stdout | pbcopy`;
	await $`rm ${tempFile}`;
}

export async function copyText(text: string) {
	if ((await isMacOS()) === false) {
		throw new Error("copyText is only supported on macOS");
	}
	await $`printf '%s' "${text}" | pbcopy`;
}

interface CopyOptions {
	html: string;
	text: string;
}

export async function copyAsRichText({ html, text }: CopyOptions) {
	if (await isMacOS()) {
		await copyRichText(html);
	} else {
		await copyText(text);
	}
}
