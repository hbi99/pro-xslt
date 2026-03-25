import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl:output and xsl:strip-space', () => {
    it('reads xsl:output settings from stylesheet', async () => {
        let xmlString = `<root><item>ok</item></root>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:output method="html" encoding="UTF-8" indent="yes" omit-xml-declaration="yes" />
                        <xsl:template match="/root/item">
                                <xsl:value-of select="." />
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
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
        let xmlString =
                `<root>
                        <item>
                                <name>A</name>
                        </item>
                </root>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:strip-space elements="item" />
                        <xsl:template match="/root/item">
                                <xsl:value-of select="count(text())" />
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('0');
    });
});

