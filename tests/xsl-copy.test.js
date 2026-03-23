import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl:copy and xsl:copy-of', () => {
  it('copies the current context node', async () => {
    let xmlString = `<root><a>1</a></root>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/root/a">
                <out>
                    <xsl:copy />
                </out>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    let out = fragment.querySelector('out');
    expect(out).not.toBeNull();
    expect(out.textContent.trim()).toBe('1');
    expect(out.querySelectorAll('a').length).toBe(1);
  });

  it('copies nodes selected by select expression', async () => {
    let xmlString = `<root><a>1</a><a>2</a></root>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/root">
                <out>
                    <xsl:copy-of select="a" />
                </out>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    let out = fragment.querySelector('out');
    expect(out).not.toBeNull();
    expect(out.querySelectorAll('a').length).toBe(2);
    expect(out.textContent.replace(/\\s+/g, ' ').trim()).toBe('12');
  });
});

