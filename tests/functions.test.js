import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { stripXPathStringLiteral, parseXsltFunctionCall } from '../src/utils.js';
import { loadXml } from './utils/common.js';


describe('parseXsltFunctionCall', () => {
    it('parses format-number with a quoted pattern', () => {
        let p = parseXsltFunctionCall("format-number(1234.5, '#,##0.00')");
        expect(p).not.toBeNull();
        expect(p.name).toBe('format-number');
        expect(p.args).toEqual(['1234.5', "'#,##0.00'"]);
        expect(p.raw).toBe("format-number(1234.5, '#,##0.00')");
    });

    it('parses nested calls and string escapes', () => {
        let p = parseXsltFunctionCall(`concat(substring('hello', 1, 2), 'x')`);
        expect(p.name).toBe('concat');
        expect(p.args).toHaveLength(2);
        expect(p.args[0]).toBe(`substring('hello', 1, 2)`);
        expect(p.args[1]).toBe(`'x'`);
    });

    it('parses position() with no arguments', () => {
        let p = parseXsltFunctionCall('  position()  ');
        expect(p.name).toBe('position');
        expect(p.args).toEqual([]);
        expect(p.raw).toBe('position()');
    });

    it('returns null when there is trailing text after the call', () => {
        expect(parseXsltFunctionCall("concat('a','b') + 1")).toBeNull();
    });

    it('strips XPath single-quoted literals', () => {
        expect(stripXPathStringLiteral(`'it''s'`)).toBe(`it's`);
        expect(stripXPathStringLiteral(`'hello'`)).toBe('hello');
    });
});

describe('Function Tests', () => {
    it('should load resources', async () => {
        let { xmlDoc, xslDoc, description } = loadXml(`functions/load-resources.xml`);
        console.log(description);
    });

    it('should format numbers with `format-number`', async () => {
        let { xmlDoc, xslDoc, description } = loadXml(`functions/format-numbers.xml`);
        expect(description).toContain('format-number');

        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('7,753.10');
    });

    it('should generate 18 letters long id using `generate-id`', async () => {
        let { xmlDoc, xslDoc } = loadXml(`functions/generate-id.xml`);

        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim().length).toBe(18);
    });

    it('should make cross reference to a node with `key` and use it as variable', async () => {
        let { xmlDoc, xslDoc } = loadXml(`functions/key-registry-lookup.xml`);

        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('top: 153px;');
    });

    it('should make correctly handle string with recursive backtracking', async () => {
        let { xmlDoc, xslDoc } = loadXml(`functions/recursive-sidebar-paths.xml`);

        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.innerHTML).toBe(`<span>Desktop</span><span>Documents</span><span>Applications</span><span>Network</span><span>mp3</span>`);
    });

    it('should make another deep cross reference and use result in if test', async () => {
        let { xmlDoc, xslDoc } = loadXml(`functions/pack-cross-reference.xml`);

        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.innerHTML.trim()).toBe('<span>image</span>');
    });
});
