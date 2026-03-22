import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('Simple Tests', () => {
  it('constructs an instance', () => {
    const processor = new ProXslt();
    expect(processor).toBeInstanceOf(ProXslt);
  });

  it('should output XML node text content', async () => {
    const xmlString =
        `<page>
            <message>Hello World</message>
        </page>`;

    const xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/message">
                <xsl:value-of select="." />
            </xsl:template>
        </xsl:stylesheet>`;

    const xmlDoc = ProXslt.xmlFromString(xmlString);
    const xslDoc = ProXslt.xmlFromString(xsltString);
    const proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    const fragment = proXslt.transformToFragment(xmlDoc, document);
    
    expect(fragment.textContent.trim()).toBe(`Hello World`);
  });

  it('should output XML node attribute value', async () => {
    const xmlString =
        `<page>
            <message attr="Hello 123"/>
        </page>`;

    const xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/message">
                <xsl:value-of select="@attr" />
            </xsl:template>
        </xsl:stylesheet>`;

    const xmlDoc = ProXslt.xmlFromString(xmlString);
    const xslDoc = ProXslt.xmlFromString(xsltString);
    const proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    const fragment = proXslt.transformToFragment(xmlDoc, document);
    
    expect(fragment.textContent.trim()).toBe(`Hello 123`);
  });

  it('should output CDATA escaped HTML-content', async () => {
    const xmlString =
        `<page>
            <message><![CDATA[Hello <b>World</b>]]></message>
        </page>`;

    const xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/message">
                <xsl:value-of select="." />
            </xsl:template>
        </xsl:stylesheet>`;

    const xmlDoc = ProXslt.xmlFromString(xmlString);
    const xslDoc = ProXslt.xmlFromString(xsltString);
    const proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    const fragment = proXslt.transformToFragment(xmlDoc, document);
    
    expect(fragment.textContent.trim()).toBe(`Hello <b>World</b>`);
  });

});
