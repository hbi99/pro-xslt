import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:attribute-set', () => {
    it('applies attribute-set to literal result element', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-attribute-set/literal-element-sets.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let div = fragment.querySelector('div');
        expect(div).not.toBeNull();
        expect(div.getAttribute('class')).toBe('card');
        expect(div.getAttribute('data-kind')).toBe('note');
        expect(div.hasAttribute('use-attribute-sets')).toBe(false);
        expect(div.textContent.trim()).toBe('Hello');
    });

    it('supports chained use-attribute-sets', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-attribute-set/chained-attribute-sets.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = fragment.querySelector('span');
        expect(span).not.toBeNull();
        expect(span.getAttribute('data-a')).toBe('A');
        expect(span.getAttribute('data-b')).toBe('B');
        expect(span.textContent.trim()).toBe('World');
    });
});
