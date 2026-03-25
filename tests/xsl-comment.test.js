import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl:comment', () => {
    it('creates a comment from select expression', async () => {
        let xmlString = `<page><message>Hello</message></page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/page">
                                <out>
                                        <xsl:comment select="'hello-comment'" />
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
        expect(out.childNodes.length).toBe(1);
        expect(out.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
        expect(out.childNodes[0].textContent).toBe('hello-comment');
    });

    it('creates a comment from body content', async () => {
        let xmlString = `<page><message>Hello</message></page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/page">
                                <out>
                                        <xsl:comment>
                                                <xsl:text>From </xsl:text>
                                                <xsl:value-of select="message" />
                                        </xsl:comment>
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
        expect(out.childNodes.length).toBe(1);
        expect(out.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
        expect(out.childNodes[0].textContent).toBe('From Hello');
    });
});

