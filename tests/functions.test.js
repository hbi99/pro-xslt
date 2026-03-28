import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { stripXPathStringLiteral, parseXsltFunctionCall } from '../src/utils.js';
import { loadXml } from './utils/common.js';


describe('parseXsltFunctionCall', () => {
    it('parses format-number with a quoted pattern', () => {
        let p = parseXsltFunctionCall("format-number(1234.5, '#,##0.00')");
        expect(p).not.toBeNull();
        expect(p.name).toBe('format-number');
        expect(p.args).toEqual(['1234.5', "'#,##0.00'"]);
        expect(p.raw).toBe("format-number(1234.5, '#,##0.00')");
    });

    it('parses nested calls and string escapes', () => {
        let p = parseXsltFunctionCall(`concat(substring('hello', 1, 2), 'x')`);
        expect(p.name).toBe('concat');
        expect(p.args).toHaveLength(2);
        expect(p.args[0]).toBe(`substring('hello', 1, 2)`);
        expect(p.args[1]).toBe(`'x'`);
    });

    it('parses position() with no arguments', () => {
        let p = parseXsltFunctionCall('  position()  ');
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
    it('should load resources', async () => {
        let { xmlDoc, xslDoc, description } = loadXml(`functions.test.1.xml`);
        console.log(description);
    });

    it('should format numbers with `format-number`', async () => {
        let xmlString =
                `<page>
                        <message>Hello World</message>
                </page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/page/message">
                                <xsl:value-of select="format-number(7753.1, '#,##0.00')" />
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('7,753.10');
    });

    it('should generate 18 letters long id using `generate-id`', async () => {
        let xmlString =
                `<page>
                        <message>Hello World</message>
                </page>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                        <xsl:template match="/page/message">
                                <xsl:value-of select="generate-id()" />
                        </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);
        
        expect(fragment.textContent.trim().length).toBe(18);
    });

    it('should make cross reference to a node with `key` and use it as variable', async () => {
        let xmlString =
                `<Monkey>
                        <Banana>
                                <i id="registry">
                                        <i name="red" top="153" left="814"/>
                                        <i name="blue" top="200" left="400"/>
                                </i>
                        </Banana>
                        <Me name="red"/>
                </Monkey>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template match="//Monkey/Me">
                        <xsl:variable name="itemPos" select="//Monkey/Banana/*[@id='registry']/*[@name = current()/@name]"/>
                        top: <xsl:value-of select="$itemPos/@top"/>px;
                    </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);
        
        expect(fragment.textContent.trim()).toBe('top: 153px;');
    });

    it('should make correctly handle string with recursive backtracking', async () => {
        let xmlString =
                `<Data>
                    <i id="fs-sidebar-favorites" type="raw-xml">
                        <item icon="desktop" path="/fs/Desktop"/>
                        <item icon="documents" path="/fs/Documents"/>
                        <item icon="applications" path="/fs/Applications"/>
                        <item icon="network" path="/fs/Network"/>
                        <item icon="folder" path="/fs/Desktop/mp3"/>
                    </i>
                </Data>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template name="hbi-test" match="//i[@id='fs-sidebar-favorites']/item">
                        <span>
                            <xsl:call-template name="substring-after-last">
                            <xsl:with-param name="string" select="@path" />
                            <xsl:with-param name="delimiter" select="'/'" />
                            </xsl:call-template>
                        </span>
                    </xsl:template>

                    <xsl:template name="substring-after-last">
                        <xsl:param name="string" />
                        <xsl:param name="delimiter" />
                        <xsl:choose>
                            <xsl:when test="contains($string, $delimiter)">
                            <xsl:call-template name="substring-after-last">
                                <xsl:with-param name="string" select="substring-after($string, $delimiter)" />
                                <xsl:with-param name="delimiter" select="$delimiter" />
                            </xsl:call-template>
                            </xsl:when>
                            <xsl:otherwise><xsl:value-of select="$string" /></xsl:otherwise>
                        </xsl:choose>
                    </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.innerHTML).toBe(`<span>Desktop</span><span>Documents</span><span>Applications</span><span>Network</span><span>mp3</span>`);
    });

    it('should make another deep cross reference and use result in if test', async () => {
        let xmlString =
                `<pack>
                    <FileSystem>
                        <i name="Desktop">
                            <i name="coast.jpg" kind="jpg" />
                        </i>
                    </FileSystem>
                    <Mime>
                        <i id="jpg" preview="image" />
                    </Mime>
                </pack>`;

        let xsltString =
                `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
                    <xsl:template name="hbi-test" match="//FileSystem/i[@name='Desktop']/i[@name='coast.jpg']">
                        <xsl:if test="string(//Mime/*[@id=current()/@kind]/@preview) != ''">
                            <span><xsl:value-of select="//Mime/*[@id=current()/@kind]/@preview"/></span>
                        </xsl:if>
                    </xsl:template>
                </xsl:stylesheet>`;

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let xslDoc = ProXslt.xmlFromString(xsltString);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.innerHTML.trim()).toBe('<span>image</span>');
    });
});
