import chalk from "chalk";
import { getThursdayUpdates } from "./workflow/thursday-updates/get-thursday-updates";
import { getPreferences } from "./preferences";
import { getOAuthTokens, authorize } from "./lib/oauth";
import { getGitHubTokenSetupInstructions } from "./lib/github/setup-instructions";
import { askForCopyPreference } from './lib/clipboard';
import { args } from './workflow/thursday-updates/args';

function help() {
	console.log(`
${chalk.bold("Sprint Update Generator")}

Usage: thursday-updates [options]

Options:
  --debug    Enable debug logging
  --verbose  Enable verbose logging
  --from     Start date (YYYY-MM-DD)
  --to       End date (YYYY-MM-DD)
  --help     Show this help message
`);
}

async function validateConfig() {
	const missingConfig = [];
	const { GITHUB_TOKEN } = getPreferences();

	if (!GITHUB_TOKEN) {
		console.error(chalk.red("\nGitHub Token Missing"));
		console.log(getGitHubTokenSetupInstructions());
		missingConfig.push("GitHub Token (GITHUB_TOKEN)");
	}

	const oauthTokens = await getOAuthTokens();
	if (!oauthTokens) {
		console.log(
			"WordPress.com OAuth tokens not found. Starting authorization flow...",
		);
		try {
			await authorize();
			// Verify tokens were obtained
			const tokens = await getOAuthTokens();
			if (!tokens) {
				missingConfig.push(
					"WordPress.com OAuth tokens (authorization failed)",
				);
			}
		} catch (error) {
			missingConfig.push(
				`WordPress.com OAuth tokens (${error instanceof Error ? error.message : "authorization failed"})`,
			);
		}
	}

	if (missingConfig.length > 0) {
		throw new Error(
			`Missing required configuration:\n${missingConfig.map((item) => `- ${item}`).join("\n")}\n\nPlease set up the missing configuration before running the command.`,
		);
	}
}

async function main() {
	const argv = args();

	if (argv.help) {
		help();
		process.exit(0);
	}

	try {
		await validateConfig();

		const endDate = argv.to ? new Date(argv.to) : new Date();
		const startDate = argv.from
			? new Date(argv.from)
			: new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);

		const report = await getThursdayUpdates({ startDate, endDate });
		console.log(report);

		await askForCopyPreference(report);
		process.exit(0);
	} catch (error) {
		console.error(
			chalk.red("Error:"),
			error instanceof Error ? error.message : String(error),
		);
		process.exit(1);
	}
}

await main();
