import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:number', () => {
    it('formats item labels with xsl:number', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-number/1.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = document.createElement('span');
        span.appendChild(fragment);

        expect(span.innerHTML.trim()).toBe(`1Car<br>2Pen<br>3LP Record<br>`);
    });
});
