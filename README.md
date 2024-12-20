# Pocket Casts: AI Scripts

Generate Thursday updates for the Pocket Casts team using AI!

## Setup

### Easy Setup

If you just want to run the Thursday updates script, [download](./bin/pocket-updates) and execute the `bin` file directly:

```bash
# Get AI updates for the past 14 days
./bin/pocket-updates
# Get AI updates for a specific date range
./bin/pocket-updates --from 2024-12-05 --to 2024-12-19
```

### First time setup

#### Credentials

This script needs to access WordPress.com API and GitHub API, for these we need:

- WordPress.com OAuth access token - This is automatically setup the first time you run the script.
- GitHub Personal Access Token (PAT) - this is read from `GITHUB_TOKEN` environment variable.

#### Authorizing GitHub

To get a GitHub Personal Access Token (PAT), you can follow these steps:

1. Go to [GitHub Settings](https://github.com/settings/tokens)
2. Click on "Generate new token (classic)"
3. Set the token name and permissions to "repo"
4. Click on "Generate token"
5. Copy the token and save it as `GITHUB_TOKEN` environment variable in your shell.

#### Usage

```sh
Usage: pocket-updates [options]

Options:
  --debug    Enable debug logging
  --verbose  Enable verbose logging
  --from     Start date (YYYY-MM-DD)
  --to       End date (YYYY-MM-DD)
  --help     Show this help message
```

### Development

For development, you'll need to install the [Bun.sh](https://bun.sh/) runtime.

Run the Thursday updates script:

```bash
bun run start
```

Build the Thursday updates binary and save it in the `bin` directory:

```bash
bun run build
```

## How It Works

You can read the full summary about it in the [P2 Post here](https://pocketcastsp2.wordpress.com/2024/12/13/thursday-updates-with-ai/).

1. Search GitHub PRs within a given date range (last 14 days by default).
    - Source: [`get-thursday-updates.ts`](./src/workflow/thursday-updates/get-thursday-updates.ts)

2. Summarize Pull Requests with AI.
    - Source: [`ai-summarize-pull-requests.ts`](./src/workflow/thursday-updates/ai-summarize-pull-requests.ts)

3. Get Project Threads from WordPress.com.
    - Source: [`posts.ts`](./src/lib/wpcom/posts.ts)

4. Summarize Project Threads with AI.
    - Source: [`ai-summarize-project-threads.ts`](./src/workflow/thursday-updates/ai-summarize-project-threads.ts)

5. Format Summaries with a Schema for flexible output formatting.
    - Source: [`schema.ts`](./src/lib/ai/nchain/schema/schema.ts)

6. Evaluate Top Shipped Changes using AI.
    - Source: [`ai-report-top-shipped.ts`](./src/workflow/thursday-updates/ai-report-top-shipped.ts)

7. Combine Everything into a Single Markdown Report.
    - Source: [`format-report.ts`](./src/workflow/thursday-updates/format-report.ts)

