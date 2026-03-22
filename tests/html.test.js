import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('HTML Output Tests', () => {
  it('should output HTML content with text nodes', async () => {
    let xmlString =
        `<page>
            <word>Hello</word>
            <word>World</word>
        </page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="//page">
                <b><xsl:value-of select="word[1]" /></b>
                <xsl:text> </xsl:text>
                <u><xsl:value-of select="word[2]" /></u>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);
    
    expect(fragment.textContent.trim()).toBe(`<b>Hello</b> <u>World</u>`);
  });
});
