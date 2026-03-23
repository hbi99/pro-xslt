import terser from '@rollup/plugin-terser';

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: 'src/index.js',
    plugins: [terser({ maxWorkers: 1 })],
    output: {
      file: 'dist/pro-xslt.esm.js',
      format: 'es',
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
    },
  },
];
