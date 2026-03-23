import terser from '@rollup/plugin-terser';
import pkg from './package.json' with { type: 'json' };

let githubUrl = 'https://github.com/hbi99/pro-xslt';
let banner = `/*!
 * pro-xslt v${pkg.version}
 * ${githubUrl}
 */
`;

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: 'src/index.js',
    plugins: [terser({ maxWorkers: 1 })],
    output: {
      file: 'dist/pro-xslt.esm.js',
      format: 'es',
      banner,
    },
  },
  {
    input: 'src/umd-entry.js',
    plugins: [terser({ maxWorkers: 1 })],
    output: {
      file: 'dist/pro-xslt.umd.js',
      format: 'umd',
      name: 'ProXslt',
      exports: 'default',
      banner,
    },
  },
];
