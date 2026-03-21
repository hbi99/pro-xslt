/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/pro-xslt.esm.js',
      format: 'es',
    },
  },
  {
    input: 'src/umd-entry.js',
    output: {
      file: 'dist/pro-xslt.umd.js',
      format: 'umd',
      name: 'ProXslt',
      exports: 'default',
    },
  },
];
