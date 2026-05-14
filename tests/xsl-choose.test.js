import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:choose', () => {
    it('renders the first matching xsl:when branch', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-choose/first-when-branch.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('yes');
    });

    it('renders xsl:otherwise when no xsl:when matches', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-choose/otherwise-branch.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('other');
    });

    it('resolves variables in xsl:when tests and branch body', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-choose/when-with-variables.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('right');
    });

    it('supports =, or, > in xsl:when tests with variables', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-choose/compound-when-tests.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.replace(/\s+/g, ' ').trim()).toBe('top: 153px;');
    });

    it('when tests against data values', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-choose/when-test-data-comparison.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.replace(/\s+/g, ' ').trim()).toBe('select');
    });
});
