import chalk from "chalk";
import { args } from "./utilities";

export type LogLevel = "debug" | "verbose" | "info" | "warn" | "error";

class Logger {
	private debugEnabled: boolean;
	private verboseEnabled: boolean;

	constructor(options: { debug?: boolean; verbose?: boolean }) {
		this.debugEnabled = options.debug || false;
		this.verboseEnabled = options.verbose || false;
	}

	debug(...args: unknown[]) {
		if (this.debugEnabled) {
			console.log("\n" + chalk.gray("[DEBUG]"), ...args, "\n");
		}
	}

	verbose(...args: unknown[]) {
		if (this.verboseEnabled) {
			console.log("\n" + chalk.blue("[VERBOSE]"), ...args, "\n");
		}
	}

	info(...args: unknown[]) {
		if (!this.debugEnabled && !this.verboseEnabled) {
			return;
		}
		console.log("\n" + chalk.green("[INFO]"), ...args, "\n");
	}

	warn(...args: unknown[]) {
		console.warn("\n" + chalk.yellow("[WARN]"), ...args, "\n");
	}

	error(...args: unknown[]) {
		console.error("\n" + chalk.red("[ERROR]"), ...args, "\n");
	}
}

let instance: Logger;

export function initLogger(options: { debug?: boolean; verbose?: boolean }) {
	instance = new Logger(options);
}

export function logger(): Logger {
	if (!instance) {
		instance = new Logger({
			debug: !!args().debug,
			verbose: !!args().verbose,
		});
	}
	return instance;
}
