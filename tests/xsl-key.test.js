import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('xsl:key', () => {
    it('resolves keyed lookups against large facet fixture', async () => {
        let fixturePath = resolve(process.cwd(), 'tests/fixture/catalog-facets-50kb.xml');
        let xmlString = readFileSync(fixturePath, 'utf8');

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:key name="by-id" match="/catalog/product" use="@id" />
                        <xsl:key name="by-category" match="/catalog/product" use="@category" />
                        <xsl:key name="by-region" match="/catalog/product" use="@region" />

                        <xsl:template match="/catalog">
                                <xsl:value-of select="key('by-id', 'P-0007')" />
                                <xsl:text>|</xsl:text>
                                <xsl:value-of select="key('by-category', 'books')" />
                                <xsl:text>|</xsl:text>
                                <xsl:value-of select="key('by-region', 'eu')" />
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        let out = fragment.textContent;

        expect(out.includes('Item 0007')).toBe(true);
        expect(out.includes('books')).toBe(true);
        expect(out.includes('eu')).toBe(true);
        expect(out.includes('|')).toBe(true);
    });
});

