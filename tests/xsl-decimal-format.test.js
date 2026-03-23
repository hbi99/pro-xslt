import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl:decimal-format', () => {
  it('applies default decimal and grouping separators', async () => {
    let xmlString = `<page><n>1</n></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:decimal-format decimal-separator="," grouping-separator="." minus-sign="~" />
            <xsl:template match="/page/n">
                <xsl:value-of select="format-number(-1234.5, '#,##0.00')" />
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);

    let fragment = proXslt.transformToFragment(xmlDoc, document);
    expect(fragment.textContent.trim()).toBe('~1.234,50');
  });

  it('applies named decimal-format via third format-number argument', async () => {
    let xmlString = `<page><n>1</n></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:decimal-format name="eu" decimal-separator="," grouping-separator="." />
            <xsl:template match="/page/n">
                <xsl:value-of select="format-number(7753.1, '#,##0.00', 'eu')" />
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);

    let fragment = proXslt.transformToFragment(xmlDoc, document);
    expect(fragment.textContent.trim()).toBe('7.753,10');
  });
});

