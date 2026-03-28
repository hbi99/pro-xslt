import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('XSL:variable Tests', () => {
    it('should bind and use `xsl:variable` with select', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-variable/1.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('5');
    });

    it('should bind `xsl:variable` from content and use in expression', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-variable/2.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('12');
    });

    it('should access globally declared `xsl:variable` inside a template', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-variable/3.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('Hi');
    });

});
