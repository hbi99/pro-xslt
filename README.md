# pro-xslt

Browser-oriented XSLT utilities in plain JavaScript (no TypeScript).

## Requirements

- Node.js 18+ (for development and tooling)

## Install

```bash
npm install
```

## Scripts

| Command | Description |
|--------|---------------|
| `npm run build` | Produce `dist/pro-xslt.esm.js` and `dist/pro-xslt.umd.js` with Rollup |
| `npm run build:watch` | Same as `build`, but rebuilds when files under `src/` (or anything in the Rollup graph) change |
| `npm test` | Run the Vitest suite once (CI-friendly) |
| `npm run test:watch` | Re-run tests on file changes |

Build output is written to `dist/`. Run `npm run build` after cloning before loading `index.htm` from disk or a static server, since `dist/` is not committed.

## Tests

Tests live next to source files as `*.test.js` (see `src/index.test.js`). Vitest is configured in `vitest.config.js`.

To add a new test file, create `src/<name>.test.js` and use the `vitest` API (`describe`, `it`, `expect`, etc.).

## Project layout

- `src/` — library source (`index.js` is the package entry before build)
- `dist/` — published bundles (generated; gitignored)
- `index.htm` — local demo page (loads `dist/pro-xslt.umd.js`)

## License

MIT
