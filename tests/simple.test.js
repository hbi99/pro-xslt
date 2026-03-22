import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('Simple Tests', () => {
  it('constructs an instance', () => {
    let processor = new ProXslt();
    expect(processor).toBeInstanceOf(ProXslt);
  });

  it('should output XML node text content', async () => {
    let xmlString =
        `<page>
            <message>Hello World</message>
        </page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/message">
                <xsl:value-of select="." />
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);
    
    expect(fragment.textContent.trim()).toBe(`Hello World`);
  });

  it('should output XML node attribute value', async () => {
    let xmlString =
        `<page>
            <message attr="Hello 123"/>
        </page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/message">
                <xsl:value-of select="@attr" />
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);
    
    expect(fragment.textContent.trim()).toBe(`Hello 123`);
  });

  it('should output CDATA escaped HTML-content', async () => {
    let xmlString =
        `<page>
            <message><![CDATA[Hello <b>World</b>]]></message>
        </page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/message">
                <xsl:value-of select="." />
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);
    
    expect(fragment.textContent.trim()).toBe(`Hello <b>World</b>`);
  });

  it('should evaluate arithmetic expression on `value-of` element', async () => {
    let xmlString =
        `<page>
            <message>Hello World</message>
        </page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/message">
                <xsl:value-of select="21 div 3" />
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);
    
    expect(fragment.textContent.trim()).toBe(`7`);
  });

});
