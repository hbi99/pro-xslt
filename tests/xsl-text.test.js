import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:text', () => {
    it('outputs literal text from the stylesheet', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-text/literal-text-output.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent).toBe('Hello, world');
    });

    it('works inside xsl:if', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-text/text-inside-if.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('ok');
    });
});
