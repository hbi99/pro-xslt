# pro-xslt

[![GitHub issues](https://img.shields.io/github/issues/hbi99/pro-xslt?label=issues)](https://github.com/hbi99/pro-xslt/issues)
[![GitHub Repo stars](https://img.shields.io/github/stars/hbi99/pro-xslt?style=flat&logo=github&label=Stars)](https://github.com/hbi99/pro-xslt/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/hbi99/pro-xslt?style=flat&logo=github&label=Forks)](https://github.com/hbi99/pro-xslt/network/members)
[![npm](https://img.shields.io/npm/v/pro-xslt?label=npm&logo=npm)](https://www.npmjs.com/package/pro-xslt)
[![npm downloads](https://img.shields.io/npm/dw/pro-xslt?label=downloads)](https://www.npmjs.com/package/pro-xslt)
[![License](https://img.shields.io/badge/license-GPL--3.0-orange)](https://github.com/hbi99/pro-xslt/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy_Me_a_Coffee-FFDD00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/hbi99)

**pro-xslt** is a **browser-first XSLT 1.0 processor** written in **plain JavaScript**—no native browser XSLT dependency required for the code paths it implements. You feed it source XML and a stylesheet document, and it builds the result tree in the page (for example via `transformToFragment`), with a predictable, growing feature set you control in JS.

### Background

Support for XSLT will be dropped as of October 2026. After trying polyfills that provide similar support using JavaScript libraries, I found them either too **slow** and/or too **large** in code size. I therefore decided to write my own version. The result is a “_lightning-fast XSLT processor with no dependencies — only 28 KB_”.


### Why use it

- **Client-side transforms** in modern browsers without shipping a full native stack everywhere.
- **A compact footprint**: production bundles are small—on the order of **~28&nbsp;KB minified** (9&nbsp;KB gzipped), so it stays easy to embed in demos, tools, and extensions.
- **Incremental XSLT 1.0 coverage**: template matching, `xsl:value-of`, conditionals, `xsl:for-each` with sorting, attribute sets, includes/imports, keys, decimal formatting, and more (see tests and source for the current surface).

### Interactive demo & testing area

The **`demo/`** folder is a **small lab** to try transformations in the browser: edit XML and XSLT, run transforms, and **compare Pro-XSLT with the browser’s native XSLT processor** where available. After `npm run build`, open **`demo/index.htm`** locally, or use the **GitHub Pages** build from the `main` branch (see `.github/workflows/deploy-pages.yml`) for the hosted demo.
https://hbi99.github.io/pro-xslt/

---

## Requirements

- Node.js 18+ (development and tooling)

## Install

```bash
npm install pro-xslt
```

For local development of this repository:

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
- `demo/` — interactive browser demo and testing UI
- `tests/` — Vitest test suite and fixtures
- `.github/workflows/` — CI/CD, releases, and deployment automation

## Contributing

See `CONTRIBUTING.md` for contribution guidelines and development workflow.

## License

GPL-3.0-only
