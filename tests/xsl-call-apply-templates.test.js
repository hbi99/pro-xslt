import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl:call-template and xsl:apply-templates', () => {
    it('calls a named template with the current context node', async () => {
        let xmlString =
                `<page><item>Hi</item><item>Bye</item></page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/page/item">
                                <xsl:call-template name="emit" />
                        </xsl:template>
                        <xsl:template name="emit">
                                <xsl:value-of select="." />
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.textContent.trim()).toBe('HiBye');
    });

    it('passes parameters via xsl:with-param', async () => {
        let xmlString =
                `<page><item>ignored</item></page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/page/item">
                                <xsl:call-template name="wrap">
                                        <xsl:with-param name="t" select="'X'" />
                                </xsl:call-template>
                        </xsl:template>
                        <xsl:template name="wrap">
                                <xsl:param name="t" />
                                <b><xsl:value-of select="$t" /></b>
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.textContent.trim()).toBe('X');
    });

    it('applies templates for a selected node-set', async () => {
        let xmlString =
                `<page><item>1</item><item>2</item></page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/page">
                                <xsl:apply-templates select="item" />
                        </xsl:template>
                        <xsl:template match="/page/item">
                                <xsl:value-of select="." />
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.textContent.trim()).toBe('12');
    });

    it('should call a template recursively', async () => {
        let xmlString = 
                `<page>
                        <HBI name="hbi">
                                <i name="Desktop">
                                        <i name="mp3">
                                                <i name="Shiva ft. Anna - Billie-whip.mp3"/>
                                        </i>
                                        <i name="file-2.txt"/>
                                        <i name="hbi">
                                                <i name="tangram.png"/>
                                                <i name="Untitled 2.jpg"/>
                                        </i>
                                        <i name="file-1.txt"/>
                                        <i name="coast-2.jpg"/>
                                        <i name="test-goya.jpg"/>
                                        <i name="excell files">
                                                <i name="basebal.csv"/>
                                                <i name="year.csv"/>
                                                <i name="test.xls"/>
                                        </i>
                                </i>
                        </HBI>
                </page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template name="tmp12">
                                <xsl:for-each select="./*">
                                        <xsl:variable name="itemPath"><xsl:call-template name="tmp234"/></xsl:variable>
                                        <div>
                                                <xsl:value-of select="$itemPath"/>
                                        </div>
                                </xsl:for-each>
                        </xsl:template>

                        <xsl:template name="tmp234">
                                <xsl:param name="node" select="."/>
                                <xsl:if test="name($node/..) != 'HBI' and name($node) != 'HBI'">
                                        <xsl:call-template name="tmp234">
                                                <xsl:with-param name="node" select="$node/.." />
                                        </xsl:call-template>
                                </xsl:if>
                                <xsl:text>/</xsl:text>
                                <xsl:choose>
                                        <xsl:when test="name($node) = 'HBI'"></xsl:when>
                                        <xsl:otherwise><xsl:value-of select="$node/@name"/></xsl:otherwise>
                                </xsl:choose>
                        </xsl:template>
                </xsl:stylesheet>`;

                let xmlDoc = ProXslt.xmlFromString(xmlString);
                let xslDoc = ProXslt.xmlFromString(xsltString);
                let proXslt = new ProXslt();
                proXslt.importStylesheet(xslDoc);
        
                let fragment = proXslt.transformToFragment(xmlDoc, document);
                expect(fragment.innerHTML.trim()).toBe(`<div>/Desktop/mp3</div><div>/Desktop/file-2.txt</div><div>/Desktop/hbi</div><div>/Desktop/file-1.txt</div><div>/Desktop/coast-2.jpg</div><div>/Desktop/test-goya.jpg</div><div>/Desktop/excell files</div>`);
    });

    it('should slice strings recursively', async () => {
        let xmlString = `<page>
    <i name="Banan"/>
    <i name="Orange"/>
    <i name="Apple"/>
    <i name="Pineapple"/>
</page>`;

        let xsltString = `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:variable name="white-space" select="'                           '" />
<xsl:variable name="col1">10</xsl:variable>

<xsl:template name="test">
    <xsl:for-each select="./*">
        -<xsl:call-template name="slice-string">
            <xsl:with-param name="str" select="concat(@name, $white-space)" />
            <xsl:with-param name="len" select="$col1" />
        </xsl:call-template>-
    </xsl:for-each>
</xsl:template>

<xsl:template name="slice-string">
    <xsl:param name="str"/>
    <xsl:param name="len"/>
    <xsl:choose>
        <xsl:when test="$len &lt; 0">
            <xsl:value-of select="substring( $str, string-length( $str ) + $len, string-length( $str ) )" />
        </xsl:when>
        <xsl:when test="$len &gt; 0">
            <xsl:value-of select="substring( $str, 1, $len )" />
        </xsl:when>
    </xsl:choose>
    <xsl:text> </xsl:text>
</xsl:template>
</xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
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

