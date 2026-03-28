import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:if', () => {
    it('outputs children when test is true', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-if/1.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('yes');
    });

    it('should read name of node in test comparison', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-if/2.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('123');
    });

    it('outputs nothing when test is false', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-if/3.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('');
    });

    it('respects variables in test and body', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-if/4.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('3');
    });

    it('should make comparison with called xslt function', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-if/5.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('1');
    });
});
