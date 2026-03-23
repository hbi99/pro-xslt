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
