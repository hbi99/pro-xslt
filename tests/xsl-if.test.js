import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';


describe('xsl:if', () => {
    it('outputs children when test is true', async () => {
        let xmlString =
                `<page><item id="1"/></page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/page/item">
                                <xsl:if test="@id = '1'">
                                        <xsl:value-of select="'yes'" />
                                </xsl:if>
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('yes');
    });

    it('should read name of node in test comparison', async () => {
        let xmlString =
                `<page>
        <message>Hello World.</message>
</page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template name="_menubar" match="/page">
                <xsl:for-each select="./*">
                        <xsl:if test="name() = 'message'">
                                123
                        </xsl:if>
                </xsl:for-each>
        </xsl:template>
</xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('123');
    });

    it('outputs nothing when test is false', async () => {
        let xmlString =
                `<page><item id="2"/></page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/page/item">
                                <xsl:if test="@id = '1'">
                                        <xsl:value-of select="'yes'" />
                                </xsl:if>
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('');
    });

    it('respects variables in test and body', async () => {
        let xmlString =
                `<page><n/></page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/page/n">
                                <xsl:variable name="flag" select="1" />
                                <xsl:if test="$flag = 1">
                                        <xsl:value-of select="$flag + 2" />
                                </xsl:if>
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('3');
    });

    it('should make comparison with called xslt function', async () => {
        let xmlString =
                `<page><n/></page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/page/n">
                                <xsl:template name="test">
                                        <xsl:variable name="bytes" select="248"/>
                                        <xsl:if test="format-number($bytes div 1024, '0') = 0">1</xsl:if>
                                </xsl:template>
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('1');
    });
});
