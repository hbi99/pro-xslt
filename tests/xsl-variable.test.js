import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';


describe('XSL:variable Tests', () => {
  it('should bind and use `xsl:variable` with select', async () => {
    let xmlString =
        `<page>
            <message>Hello World</message>
        </page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/message">
                <xsl:variable name="len" select="string-length('hello')" />
                <xsl:value-of select="$len" />
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('5');
  });

  it('should bind `xsl:variable` from content and use in expression', async () => {
    let xmlString =
        `<page>
            <message>x</message>
        </page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/message">
                <xsl:variable name="a" select="3" />
                <xsl:value-of select="$a * 4" />
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
