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
});

