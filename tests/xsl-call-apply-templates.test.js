import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:call-template and xsl:apply-templates', () => {
    it('calls a named template with the current context node', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-call-apply-templates/1.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.textContent.trim()).toBe('HiBye');
    });

    it('passes parameters via xsl:with-param', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-call-apply-templates/2.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.textContent.trim()).toBe('X');
    });

    it('applies templates for a selected node-set', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-call-apply-templates/3.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.textContent.trim()).toBe('12');
    });

    it('should call a template recursively', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-call-apply-templates/4.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.innerHTML.trim()).toBe(`<div>/Desktop/mp3</div><div>/Desktop/file-2.txt</div><div>/Desktop/hbi</div><div>/Desktop/file-1.txt</div><div>/Desktop/coast-2.jpg</div><div>/Desktop/test-goya.jpg</div><div>/Desktop/excell files</div>`);
    });

    it('should slice strings recursively', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-call-apply-templates/5.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.innerHTML).toBe(`
        -Banan      -
    
        -Orange     -
    
        -Apple      -
    
        -Pineapple  -
    `);
    });
});
