import { copyAsRichText, copyText } from "./lib/utilities";
import { marked } from "marked";
import { select } from "@clack/prompts";
import { Cache } from "./cache";
import TurndownService from "turndown";
import { $ } from "bun";
import minimist from 'minimist';


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


export async function askForCopyPreference(content: string): Promise<void> {
	const choice = await select({
		message: "Would you like to copy the report?",
		options: [
			{ label: "Copy as rich text (HTML)", value: "rich" },
			{ label: "Copy as markdown", value: "markdown" },
			{ label: "Don't copy", value: "none" },
		],
	});

	if (choice === "rich") {
		marked.setOptions({
			gfm: true,
			breaks: true,
		});
		const html = await marked.parse(content);
		await copyAsRichText({ html, text: content });
		console.log("Report copied as rich text!");
	} else if (choice === "markdown") {
		await copyText(content);
		console.log("Report copied as markdown!");
	}
}

interface ThursdayUpdateOptions {
	debug?: boolean;
	verbose?: boolean;
	help?: boolean;
	from?: string;
	to?: string;
}

export function args() {
	const argv = minimist<ThursdayUpdateOptions>(process.argv.slice(2));
	return argv;
}
