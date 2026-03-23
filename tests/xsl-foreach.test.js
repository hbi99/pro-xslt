import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl:for-each', () => {
  it('iterates selected nodes in document order', async () => {
    let xmlString =
        `<page><word>b</word><word>a</word><word>c</word></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page">
                <xsl:for-each select="word">
                    <xsl:value-of select="." />
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('bac');
  });

  it('supports xsl:sort text ascending', async () => {
    let xmlString =
        `<page><word>b</word><word>a</word><word>c</word></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page">
                <xsl:for-each select="word">
                    <xsl:sort select="." />
                    <xsl:value-of select="." />
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('abc');
  });

  it('supports xsl:sort number descending', async () => {
    let xmlString =
        `<page><n>10</n><n>2</n><n>30</n></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page">
                <xsl:for-each select="n">
                    <xsl:sort select="." data-type="number" order="descending" />
                    <xsl:value-of select="." />
                    <xsl:text>,</xsl:text>
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('30,10,2,');
  });
});
