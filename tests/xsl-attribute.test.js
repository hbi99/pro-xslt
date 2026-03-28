import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:attribute', () => {
    it('sets an attribute via select', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-attribute/attribute-via-select.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = fragment.querySelector('span');
        expect(span.getAttribute('data-msg')).toBe('greeting:');
        expect(span.textContent.trim()).toBe('Hello');
    });

    it('sets an attribute via body content', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-attribute/attribute-via-body.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = fragment.querySelector('span');
        expect(span.getAttribute('title')).toBe('Title: Hello');
    });

    it('sets an attribute via body content with text nodes', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-attribute/attribute-body-text.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = fragment.querySelector('span');
        expect(span.getAttribute('title')).toBe('Title: Hello');
        expect(span.textContent.trim()).toBe('Adding text here');
    });
});
