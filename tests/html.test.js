import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('HTML Output Tests', () => {
    it('should output HTML content with text nodes', async () => {
        let { xmlDoc, xslDoc } = loadXml(`html/html-text-nodes.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = document.createElement('span');
        span.appendChild(fragment);

        expect(span.innerHTML.trim()).toBe(`<b>Hello</b> <u>World</u>`);
    });

    it('should output and honor `<xsl:template match="text()"/>`', async () => {
        let { xmlDoc, xslDoc } = loadXml(`html/match-text-template.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = document.createElement('span');
        span.appendChild(fragment);

        expect(span.innerHTML.trim()).toBe(`one`);
    });

    it('should NOT output escaped HTML content', async () => {
        let { xmlDoc, xslDoc } = loadXml(`html/escaped-html-output.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = document.createElement('span');
        span.appendChild(fragment);

        expect(span.innerHTML.trim()).toBe(`Hello &lt;b&gt;World&lt;/b&gt;`);
    });

    it('should output escaped HTML content', async () => {
        let { xmlDoc, xslDoc } = loadXml(`html/raw-html-output.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = document.createElement('span');
        span.appendChild(fragment);

        expect(span.innerHTML.trim()).toBe(`Hello <b>World</b>`);
    });
});
