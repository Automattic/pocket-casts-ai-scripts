# Pocket Casts: AI Scripts

This repository contains scripts and utilities for automating the generation of Thursday updates for the Pocket Casts team using AI-driven summaries and formatted Markdown reports.

## Setup

### Bin Files

If you just want to run the Thursday updates script, you can execute the `bin` file directly:

```bash
./bin/pocket-updates
```

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

Build the Thursday updates script into the `bin` directory:

```bash
bun run build
```

## How It Works

You can read the full summary about it in the [P2 Post here](https://pocketcastsp2.wordpress.com/2024/12/13/thursday-updates-with-ai/).

1. **Search GitHub PRs** within a given date range (last 14 days by default).  
   See: [`get-thursday-updates.ts`](./src/workflow/thursday-updates/get-thursday-updates.ts)

2. **Summarize Pull Requests** with AI.  
   See: [`ai-summarize-pull-requests.ts`](./src/workflow/thursday-updates/ai-summarize-pull-requests.ts)

3. **Get Project Threads** from WordPress.com.  
   See: [`posts.ts`](./src/lib/wpcom/posts.ts)

4. **Summarize Project Threads** with AI.  
   See: [`ai-summarize-project-threads.ts`](./src/workflow/thursday-updates/ai-summarize-project-threads.ts)

5. **Format Summaries with a Schema** for flexible output formatting.  
   See: [`schema.ts`](./src/lib/ai/nchain/schema/schema.ts)

6. **Evaluate Top Shipped Changes** using AI.  
   See: [`ai-report-top-shipped.ts`](./src/workflow/thursday-updates/ai-report-top-shipped.ts)

7. **Combine Everything into a Single Markdown Report**.  
   See: [`format-report.ts`](./src/workflow/thursday-updates/format-report.ts)

### WordPress.com API

The WordPress.com API is used to retrieve posts (including P2 posts and project threads) and to access the internal AI endpoint for Automatticians.  
See: [`wpcomRequest` function](./src/lib/wpcom/wpcom.ts)
