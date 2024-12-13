import chalk from "chalk";

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
			console.log(chalk.gray("[DEBUG]"), ...args);
		}
	}

	verbose(...args: unknown[]) {
		if (this.verboseEnabled) {
			console.log(chalk.blue("[VERBOSE]"), ...args);
		}
	}

	info(...args: unknown[]) {
		console.log(chalk.green("[INFO]"), ...args);
	}

	warn(...args: unknown[]) {
		console.warn(chalk.yellow("[WARN]"), ...args);
	}

	error(...args: unknown[]) {
		console.error(chalk.red("[ERROR]"), ...args);
	}
}

let instance: Logger;

export function initLogger(options: { debug?: boolean; verbose?: boolean }) {
	instance = new Logger(options);
}

export function getLogger(): Logger {
	if (!instance) {
		instance = new Logger({ debug: false, verbose: false });
	}
	return instance;
}
