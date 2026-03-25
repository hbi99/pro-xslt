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

    let span = document.createElement('span');
    span.appendChild(fragment);

    expect(span.innerHTML.trim()).toBe(`<b>Hello</b> <u>World</u>`);
  });

  it('should output and honor `<xsl:template match="text()"/>`', async () => {
    let xmlString =
        `<page><item>one</item><item>two</item></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="text()"/>
            <xsl:template match="/page/item[1]">
                <xsl:value-of select="." />
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    let span = document.createElement('span');
    span.appendChild(fragment);

    // console.log(span.innerHTML.trim());
    expect(span.innerHTML.trim()).toBe(`one`);
});

it('should NOT output escaped HTML content', async () => {
  let xmlString =
      `<page>
          <message><![CDATA[Hello <b>World</b>]]></message>
      </page>`;

  let xsltString =
      `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="//page">
                <xsl:value-of select="./message"/>
            </xsl:template>
      </xsl:stylesheet>`;

      let xmlDoc = ProXslt.xmlFromString(xmlString);
      let xslDoc = ProXslt.xmlFromString(xsltString);
      let proXslt = new ProXslt();
      proXslt.importStylesheet(xslDoc);
      let fragment = proXslt.transformToFragment(xmlDoc, document);
  
      let span = document.createElement('span');
      span.appendChild(fragment);

      expect(span.innerHTML.trim()).toBe(`Hello &lt;b&gt;World&lt;/b&gt;`);
  });

  it('should output escaped HTML content', async () => {
    let xmlString =
        `<page>
            <message><![CDATA[Hello <b>World</b>]]></message>
        </page>`;
  
    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
              <xsl:template match="//page">
                  <xsl:value-of select="./message" disable-output-escaping="yes"/>
              </xsl:template>
        </xsl:stylesheet>`;
  
        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);
    
        let span = document.createElement('span');
        span.appendChild(fragment);
  
        expect(span.innerHTML.trim()).toBe(`Hello <b>World</b>`);
    });
});
