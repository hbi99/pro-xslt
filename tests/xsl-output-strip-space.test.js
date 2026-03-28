import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:output and xsl:strip-space', () => {
    it('reads xsl:output settings from stylesheet', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-output-strip-space/1.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        proXslt.transformToFragment(xmlDoc, document);

        expect(proXslt.outputSettings).not.toBeNull();
        expect(proXslt.outputSettings.method).toBe('html');
        expect(proXslt.outputSettings.encoding).toBe('UTF-8');
        expect(proXslt.outputSettings.indent).toBe(true);
        expect(proXslt.outputSettings.omitXmlDeclaration).toBe(true);
    });

    it('applies xsl:strip-space to matched elements', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-output-strip-space/2.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('0');
    });
});
