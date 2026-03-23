import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl:attribute', () => {
  it('sets an attribute via select', async () => {
    let xmlString =
        `<page><message>Hello</message></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page">
                <span>
                    <xsl:attribute name="data-msg" select="'greeting:'" />
                    <xsl:value-of select="message" />
                </span>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    let span = fragment.querySelector('span');
    expect(span.getAttribute('data-msg')).toBe('greeting:');
    expect(span.textContent.trim()).toBe('Hello');
  });

  it('sets an attribute via body content', async () => {
    let xmlString =
        `<page><message>Hello</message></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page">
                <span>
                    <xsl:attribute name="title">
                        <xsl:text>Title: </xsl:text>
                        <xsl:value-of select="message" />
                    </xsl:attribute>
                </span>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    let span = fragment.querySelector('span');
    expect(span.getAttribute('title')).toBe('Title: Hello');
  });

  it('sets an attribute via body content with text nodes', async () => {
    let xmlString =
        `<page><message>Hello</message></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page">
                <span>
                    <xsl:attribute name="title">
                        <xsl:text>Title: </xsl:text>
                        <xsl:value-of select="message" />
                    </xsl:attribute>
                    Adding text here
                </span>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    let span = fragment.querySelector('span');
    expect(span.getAttribute('title')).toBe('Title: Hello');
    expect(span.textContent.trim()).toBe('Adding text here');
  });
});

