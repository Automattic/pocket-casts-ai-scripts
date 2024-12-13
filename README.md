# Pocket Scripts

## Setup

### Bin Files

If you just want to run the thursday updates script, you can execute the `bin` file directly:

```bash
bin/pocket-updates
```

```sh
Usage: sprint-update [options]

Options:
  --debug    Enable debug logging
  --verbose  Enable verbose logging
  --from     Start date (YYYY-MM-DD)
  --to       End date (YYYY-MM-DD)
  --help     Show this help message
```

### Development

For development, you'll need to install [Bun.sh](https://bun.sh/) runtime.

Run the thursday updates script:

```bash
bun run start
```

Build the thursday updates script into the `bin` directory:

```bash
bun run build
```
