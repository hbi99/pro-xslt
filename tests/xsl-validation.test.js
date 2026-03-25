import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl validation', () => {
  it('throws for malformed/unclosed tags in XSL', () => {
    let xsltString =
      `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:template match="/">
          <div>
        </xsl:template>
      </xsl:stylesheet>`;

    expect(() => ProXslt.xmlFromString(xsltString)).toThrow(/Invalid XSL template/i);
  });
});

