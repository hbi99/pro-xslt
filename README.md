# pro-xslt

`pro-xslt` is a browser-oriented XSLT processor implemented in plain JavaScript.

It provides a growing subset of XSLT 1.0 features including template matching, `xsl:value-of`, conditionals, loops/sorting, attribute sets, includes/imports, keys, and formatting helpers.

## Requirements

- Node.js 18+ (development and tooling)

## Install

```bash
npm install
```

## Development

| Command | Description |
| --- | --- |
| `npm run build` | Build minified ESM and UMD bundles into `dist/` |
| `npm run build:watch` | Rebuild bundles when source changes |
| `npm test` | Run the full Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run bench` | Run transform performance benchmark cases |
| `npm run bench:compare -- <baseline.txt> <candidate.txt>` | Compare two saved benchmark outputs |

## Benchmarking

Use `npm run bench` to measure transform throughput on two representative workloads:

- `apply-templates-heavy`
- `key-heavy-50kb`

For commit-to-commit comparison:

1. Run baseline and save output: `npm run bench > baseline.txt`
2. Switch to candidate commit and save output: `npm run bench > candidate.txt`
3. Compare automatically: `npm run bench:compare -- baseline.txt candidate.txt`

## Usage

### Global (UMD)

Use `dist/pro-xslt.umd.js` in the browser. The library is exposed as global `ProXslt`.

### ESM

Import from `dist/pro-xslt.esm.js` or package entry exports.

## Project structure

- `src/` — source code
- `dist/` — generated bundles
- `demo/` — browser demo page
- `tests/` — Vitest test suite and fixtures
- `.github/workflows/` — CI/CD, releases, and deployment automation

## Contributing

See `CONTRIBUTING.md` for contribution guidelines and development workflow.

## License

GPL-3.0-only
