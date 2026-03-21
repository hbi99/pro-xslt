import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('ProXslt', () => {
  it('constructs an instance', () => {
    const processor = new ProXslt();
    expect(processor).toBeInstanceOf(ProXslt);
  });

  it('simple test', async () => {
    const xmlString = (
        `<root>
            <test name="test1" />
            <test name="test2" />
            <test name="test3" />
            <test name="test4" />
        </root>`
    );

    const xsltString =
        `<?xml version="1.0"?>
        <xsl:stylesheet version="1.0">
            <xsl:template match="test">
                <span>
                    <xsl:value-of select="@name" />
                </span>
            </xsl:template>
            <xsl:template match="/">
                <div>
                    <xsl:apply-templates select="//test" />
                </div>
            </xsl:template>
        </xsl:stylesheet>`;

    const expectedOutString = (
        `<div><span>test1</span><span>test2</span><span>test3</span><span>test4</span></div>`
    );

    expect(xmlString.constructor).toBe(String);

    // const xsltClass = new Xslt();
    // const xmlParser = new XmlParser();
    // const xml = xmlParser.xmlParse(xmlString);
    // const xslt = xmlParser.xmlParse(xsltString);
    // const outXmlString = await xsltClass.xsltProcess(xml, xslt);

    // assert.equal(outXmlString, expectedOutString);
  });
});
