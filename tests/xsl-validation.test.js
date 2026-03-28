import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('xsl validation', () => {
    it('throws for malformed/unclosed tags in XSL', () => {
        let path = resolve(process.cwd(), 'tests/fixture/xsl-validation/malformed-template.xsl');
        let xsltString = readFileSync(path, 'utf8');

        expect(() => ProXslt.xmlFromString(xsltString)).toThrow(/Invalid XSL template/i);
    });
});
