import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl:choose', () => {
  it('renders the first matching xsl:when branch', async () => {
    let xmlString =
        `<page><item id="1"/></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/item">
                <xsl:choose>
                    <xsl:when test="@id = '1'">
                        <xsl:value-of select="'yes'"/>
                    </xsl:when>
                    <xsl:when test="@id = '2'">
                        <xsl:value-of select="'no'"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="'other'"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('yes');
  });

  it('renders xsl:otherwise when no xsl:when matches', async () => {
    let xmlString =
        `<page><item id="3"/></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/item">
                <xsl:choose>
                    <xsl:when test="@id = '1'">
                        <xsl:value-of select="'one'"/>
                    </xsl:when>
                    <xsl:when test="@id = '2'">
                        <xsl:value-of select="'two'"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="'other'"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('other');
  });

  it('resolves variables in xsl:when tests and branch body', async () => {
    let xmlString =
        `<page><item/></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page/item">
                <xsl:variable name="flag" select="2"/>
                <xsl:choose>
                    <xsl:when test="$flag = 1">
                        <xsl:value-of select="'wrong'"/>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:value-of select="'right'"/>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('right');
  });

  it('supports =, or, > in xsl:when tests with variables', async () => {
    let xmlString =
        `<Monkey>
		<User id="demo" account-type="1"/>
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
                <xsl:variable name="meUser" select="//User"/>
                <xsl:variable name="itemPos" select="//Monkey/Banana//*[@name='red' and @left=814]"/>
                <xsl:if test="$meUser/@account-type = '1' and $meUser/@id = 'demo'">
                    top: <xsl:value-of select="$itemPos/@top"/>px;
                </xsl:if>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.replace(/\s+/g, ' ').trim()).toBe('top: 153px;');
  });
});

