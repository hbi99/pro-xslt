import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl:attribute-set', () => {
    it('applies attribute-set to literal result element', async () => {
        let xmlString = `<page><message>Hello</message></page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:attribute-set name="base">
                                <xsl:attribute name="class">card</xsl:attribute>
                                <xsl:attribute name="data-kind" select="'note'" />
                        </xsl:attribute-set>
                        <xsl:template match="/page">
                                <div use-attribute-sets="base">
                                        <xsl:value-of select="message" />
                                </div>
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let div = fragment.querySelector('div');
        expect(div).not.toBeNull();
        expect(div.getAttribute('class')).toBe('card');
        expect(div.getAttribute('data-kind')).toBe('note');
        expect(div.hasAttribute('use-attribute-sets')).toBe(false);
        expect(div.textContent.trim()).toBe('Hello');
    });

    it('supports chained use-attribute-sets', async () => {
        let xmlString = `<page><message>World</message></page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:attribute-set name="base">
                                <xsl:attribute name="data-a">A</xsl:attribute>
                        </xsl:attribute-set>
                        <xsl:attribute-set name="extended" use-attribute-sets="base">
                                <xsl:attribute name="data-b">B</xsl:attribute>
                        </xsl:attribute-set>
                        <xsl:template match="/page">
                                <span use-attribute-sets="extended">
                                        <xsl:value-of select="message" />
                                </span>
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = fragment.querySelector('span');
        expect(span).not.toBeNull();
        expect(span.getAttribute('data-a')).toBe('A');
        expect(span.getAttribute('data-b')).toBe('B');
        expect(span.textContent.trim()).toBe('World');
    });
});

