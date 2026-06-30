import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('Interface Tests', () => {

    it('should use setParameter to interface values of parameters.', async () => {
        let { xmlDoc, xslDoc } = loadXml(`interface/setParameter.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        proXslt.setParameter(null, "highlightColor", "lightblue");
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.innerHTML.trim()).toBe(`<ul><li style="background-color: lightblue;">Item 1</li></ul>`);
    });

    it('should use getParameter to get value of parameter.', async () => {
        let { xmlDoc, xslDoc } = loadXml(`interface/getParameter.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let show = proXslt.getParameter(null, "showItems");
        let color = proXslt.getParameter(null, "highlightColor");
        
        expect(show).toBe(`yes`);
        expect(color).toBe(`yellow`);
    });

    it('should clear parameters with clearParameter.', async () => {
        let { xmlDoc, xslDoc } = loadXml(`interface/clearParameters.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        proXslt.setParameter(null, "highlightColor", "lightblue");
        proXslt.clearParameters();
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.innerHTML.trim()).toBe(`<ul><li style="background-color: yellow;">Item 1</li></ul>`);
    });

});
