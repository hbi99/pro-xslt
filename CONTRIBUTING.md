# Contributing

Thanks for contributing to `pro-xslt`.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm install
```

## Running dev scripts

Use these scripts during local development:

- `npm run build`  
  Builds minified bundles into `dist/`.

- `npm run build:watch`  
  Rebuilds automatically on source changes.

- `npm test`  
  Runs the complete Vitest suite once.

- `npm run test:watch`  
  Runs tests in watch mode for fast feedback.

- `npm run bench`  
  Runs a transform performance benchmark (`apply-templates-heavy` and `key-heavy-50kb`).

- `npm run bench:compare -- <baseline.txt> <candidate.txt>`  
  Compares two saved benchmark outputs and prints per-case percent deltas.

## Development workflow

1. Create a feature branch.
2. Make focused changes with tests.
3. Run:
   - `npm run build`
   - `npm test`
   - `npm run bench` (for performance-sensitive changes)
4. Open a pull request with:
   - concise summary of what changed
   - test coverage notes

## Notes

- Keep changes scoped to the requested feature/fix.
- Prefer adding or updating tests for behavior changes.
- Do not edit generated `dist/` files manually.
