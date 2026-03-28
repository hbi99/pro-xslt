import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:decimal-format', () => {
    it('applies default decimal and grouping separators', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-decimal-format/custom-decimal-separators.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.textContent.trim()).toBe('~1.234,50');
    });

    it('applies named decimal-format via third format-number argument', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-decimal-format/named-format-numbers.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.textContent.trim()).toBe('7.753,10');
    });
});
