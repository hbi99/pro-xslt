import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('Simple Tests', () => {
    it('constructs an instance', () => {
        let processor = new ProXslt();
        expect(processor).toBeInstanceOf(ProXslt);
    });

    it('should output XML node text content', async () => {
        let { xmlDoc, xslDoc } = loadXml(`simple/output-node-text.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe(`Hello World`);
    });

    it('should output XML node attribute value', async () => {
        let { xmlDoc, xslDoc } = loadXml(`simple/output-attribute-value.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe(`Hello 123`);
    });

    it('should output CDATA escaped HTML-content', async () => {
        let { xmlDoc, xslDoc } = loadXml(`simple/cdata-html-content.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe(`Hello <b>World</b>`);
    });

    it('should evaluate arithmetic expression on `value-of` element', async () => {
        let { xmlDoc, xslDoc } = loadXml(`simple/value-of-arithmetic.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe(`7`);
    });

    it('should fail silently and not throw error', async () => {
        let { xmlDoc, xslDoc } = loadXml(`simple/silent-fail.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe(``);
    });

    it('should NOT descend into child nodes', async () => {
        let { xmlDoc, xslDoc } = loadXml(`simple/non-recursive-template.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe(`1`);
    });

});
