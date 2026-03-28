import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:copy and xsl:copy-of', () => {
    it('copies the current context node', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-copy/1.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let out = fragment.querySelector('out');
        expect(out).not.toBeNull();
        expect(out.textContent.trim()).toBe('1');
        expect(out.querySelectorAll('a').length).toBe(1);
    });

    it('copies nodes selected by select expression', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-copy/2.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let out = fragment.querySelector('out');
        expect(out).not.toBeNull();
        expect(out.querySelectorAll('a').length).toBe(2);
        expect(out.textContent.replace(/\s+/g, ' ').trim()).toBe('12');
    });
});
