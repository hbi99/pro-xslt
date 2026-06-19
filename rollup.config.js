import dotenv from 'dotenv';
import terser from '@rollup/plugin-terser';
import pkg from './package.json' with { type: 'json' };

dotenv.config();

let minify = process.env.SCOPE !== "1dev";
let plugins = minify ? [terser({ maxWorkers: 1 })] : [];
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
        plugins,
        output: {
            file: 'dist/pro-xslt.esm.js',
            format: 'es',
            banner,
        },
    },
    {
        input: 'src/umd-entry.js',
        plugins,
        output: {
            file: 'dist/pro-xslt.umd.js',
            format: 'umd',
            name: 'ProXslt',
            exports: 'default',
            banner,
        },
    },
    {
        input: 'src/umd-entry.js',
        plugins,
        output: {
            file: 'demo/js/pro-xslt.umd.js',
            format: 'umd',
            name: 'ProXslt',
            exports: 'default',
            banner,
        },
    },
    {
        input: 'demo/js/app.js',
        // plugins,
        output: {
            file: 'demo/js/app.min.js',
            format: 'umd',
        },
    },
];
