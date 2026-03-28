import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadXml } from './utils/common.js';

describe('xsl:include', () => {
    it('inlines included templates and named templates', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-include/1.xml`);

        let includedPath = resolve(process.cwd(), 'tests/fixture/included-common.xsl');
        let includedXslString = readFileSync(includedPath, 'utf8');

        let proXslt = new ProXslt({
            importResolver: (href) => {
                if (href === 'included-common.xsl') return includedXslString;
                return null;
            },
        });
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.textContent.trim()).toBe('INCLUDED:X-ok');
    });
});
