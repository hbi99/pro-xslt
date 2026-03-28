import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:key', () => {
    it('resolves keyed lookups against large facet fixture', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-key/1.xml`);

        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        let out = fragment.textContent;

        expect(out.includes('Item 0007')).toBe(true);
        expect(out.includes('books')).toBe(true);
        expect(out.includes('eu')).toBe(true);
        expect(out.includes('|')).toBe(true);
    });
});
