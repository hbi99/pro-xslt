import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('HTML Output Tests', () => {
  it('should output HTML content with text nodes', async () => {
    let xmlString =
        `<items>
            <item>Car</item>
            <item>Pen</item>
            <item>LP Record</item>
        </items>`;

    let xsltString =
        `<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/">
                <xsl:for-each select="items/item">
                    <xsl:number format="1" />
                    <xsl:value-of select="." />
                    <br/>
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    let span = document.createElement('span');
    span.appendChild(fragment);

    expect(span.innerHTML.trim()).toBe(`1Car<br>2Pen<br>3LP Record<br>`);
  });
});
