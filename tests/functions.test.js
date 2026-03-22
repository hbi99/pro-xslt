import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { parseXsltFunctionCall, stripXPathStringLiteral } from '../src/dom/parser.js';

describe('parseXsltFunctionCall', () => {
  it('parses format-number with a quoted pattern', () => {
    const p = parseXsltFunctionCall("format-number(1234.5, '#,##0.00')");
    expect(p).not.toBeNull();
    expect(p.name).toBe('format-number');
    expect(p.args).toEqual(['1234.5', "'#,##0.00'"]);
    expect(p.raw).toBe("format-number(1234.5, '#,##0.00')");
  });

  it('parses nested calls and string escapes', () => {
    const p = parseXsltFunctionCall(`concat(substring('hello', 1, 2), 'x')`);
    expect(p.name).toBe('concat');
    expect(p.args).toHaveLength(2);
    expect(p.args[0]).toBe(`substring('hello', 1, 2)`);
    expect(p.args[1]).toBe(`'x'`);
  });

  it('parses position() with no arguments', () => {
    const p = parseXsltFunctionCall('  position()  ');
    expect(p.name).toBe('position');
    expect(p.args).toEqual([]);
    expect(p.raw).toBe('position()');
  });

  it('returns null when there is trailing text after the call', () => {
    expect(parseXsltFunctionCall("concat('a','b') + 1")).toBeNull();
  });

  it('strips XPath single-quoted literals', () => {
    expect(stripXPathStringLiteral(`'it''s'`)).toBe(`it's`);
    expect(stripXPathStringLiteral(`'hello'`)).toBe('hello');
  });
});

describe('Function Tests', () => {
  it('should format numbers with `format-number`', async () => {
    const xmlString =
        `<page>
            <message>Hello World</message>
        </page>`;

    const xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/message">
                <xsl:value-of select="format-number(7753.1, '#,##0.00')" />
            </xsl:template>
        </xsl:stylesheet>`;

    const xmlDoc = ProXslt.xmlFromString(xmlString);
    const xslDoc = ProXslt.xmlFromString(xsltString);
    const proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    const fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('7,753.10');
  });

  it('should generate 18 letters long id using `generate-id`', async () => {
    const xmlString =
        `<page>
            <message>Hello World</message>
        </page>`;

    const xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/message">
                <xsl:value-of select="generate-id()" />
            </xsl:template>
        </xsl:stylesheet>`;

    const xmlDoc = ProXslt.xmlFromString(xmlString);
    const xslDoc = ProXslt.xmlFromString(xsltString);
    const proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    const fragment = proXslt.transformToFragment(xmlDoc, document);
    
    expect(fragment.textContent.trim().length).toBe(18);
  });

});
