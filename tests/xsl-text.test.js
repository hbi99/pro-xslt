import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl:text', () => {
  it('outputs literal text from the stylesheet', async () => {
    let xmlString = `<page><item/></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/item">
                <xsl:text>Hello, </xsl:text>
                <xsl:text>world</xsl:text>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent).toBe('Hello, world');
  });

  it('works inside xsl:if', async () => {
    let xmlString = `<page><n/></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/n">
                <xsl:if test="true()">
                    <xsl:text>ok</xsl:text>
                </xsl:if>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('ok');
  });
});
