import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';

describe('xsl:for-each', () => {
  it('iterates selected nodes in document order', async () => {
    let xmlString =
        `<page><word>b</word><word>a</word><word>c</word></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page">
                <xsl:for-each select="word">
                    <xsl:value-of select="." />
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('bac');
  });

  it('supports xsl:sort text ascending', async () => {
    let xmlString =
        `<page><word>b</word><word>a</word><word>c</word></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page">
                <xsl:for-each select="word">
                    <xsl:sort select="." />
                    <xsl:value-of select="." />
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('abc');
  });

  it('supports xsl:sort number descending', async () => {
    let xmlString =
        `<page><n>10</n><n>2</n><n>30</n></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page">
                <xsl:for-each select="n">
                    <xsl:sort select="." data-type="number" order="descending" />
                    <xsl:value-of select="." />
                    <xsl:text>,</xsl:text>
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('30,10,2,');
  });

  it('supports xsl:sort number descending with separator comma', async () => {
    let xmlString =
        `<page><n>10</n><n>2</n><n>30</n></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page">
                <xsl:for-each select="n">
                    <xsl:sort select="." data-type="number" order="descending" />
                    <xsl:value-of select="." />
                    <xsl:if test="position() != last()">
                        <xsl:text>,</xsl:text>
                    </xsl:if>
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('30,10,2');
  });

    it('supports xsl:sort number descending with separator hyphen', async () => {
      let xmlString =
          `<page><n>10</n><n>2</n><n>30</n></page>`;
  
      let xsltString =
          `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
              <xsl:template match="/page">
                  <xsl:for-each select="n">
                      <xsl:sort select="." data-type="number" order="descending" />
                      <xsl:value-of select="." />
                      <xsl:if test="position() &lt; last()">
                          <xsl:text> - </xsl:text>
                      </xsl:if>
                  </xsl:for-each>
              </xsl:template>
          </xsl:stylesheet>`;
  
      let xmlDoc = ProXslt.xmlFromString(xmlString);
      let xslDoc = ProXslt.xmlFromString(xsltString);
      let proXslt = new ProXslt();
      proXslt.importStylesheet(xslDoc);
      let fragment = proXslt.transformToFragment(xmlDoc, document);
  
      expect(fragment.textContent.trim()).toBe('30 - 10 - 2');
  });

  it('should test support for current() function', async () => {
    let xmlString =
        `<page><n>10</n><n id="2">2</n><n>30</n></page>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
            <xsl:template match="/page">
                <xsl:for-each select="n">
                    <xsl:sort select="." data-type="number" order="descending" />
                    <xsl:value-of select="." />
                    <xsl:if test="current()/@id = 2">
                        <xsl:text> - </xsl:text>
                    </xsl:if>
                </xsl:for-each>
            </xsl:template>
        </xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    expect(fragment.textContent.trim()).toBe('30102 -');
  });

  it('should render advanced cross reference with current() function', async () => {
    let xmlString =
        `<data>
	<Settings>
		<Apps>
			<i ns="ant" id="othello" name="Othello"/>
			<i ns="ant" id="2048" name="2048"/>
			<i ns="ant" id="finder" name="Finder"/>
			<i ns="ant" id="mail" name="Mail"/>
			<i ns="ant" id="calendar" name="Calendar"/>
			<i ns="ant" id="eniac" name="Eniac"/>
			<i ns="ant" id="textedit" name="Textedit"/>
			<i ns="ant" id="spotify" name="Spotify"/>
		</Apps>
		<dock>
			<i order="9" ns="ant" id="othello"/>
			<i order="7" ns="ant" id="2048"/>
			<i order="1" ns="ant" id="finder"/>
			<i order="2" ns="ant" id="mail"/>
			<i order="3" ns="ant" id="calendar"/>
			<i order="4" ns="ant" id="eniac"/>
			<i order="5" ns="ant" id="textedit"/>
			<i order="6" ns="ant" id="spotify"/>
		</dock>
	</Settings>
</data>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:template match="/">
	<xsl:for-each select="//Settings/dock/*">
		<xsl:sort order="ascending" select="@order" data-type="number"/>
		<xsl:call-template name="dock-temp"/>
	</xsl:for-each>
</xsl:template>

<xsl:template name="dock-temp">
	<div>
		<xsl:value-of select="//Settings/Apps/*[@ns=current()/@ns and @id=current()/@id]/@name"/>
	</div>
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
    expect(span.innerHTML.trim()).toBe('<div>Finder</div><div>Mail</div><div>Calendar</div><div>Eniac</div><div>Textedit</div><div>Spotify</div><div>2048</div><div>Othello</div>');
  });

  it('should honor deep nested attribute', async () => {
    let xmlString =
        `<data>
	<Settings>
		<Apps>
			<i ns="ant" id="othello" name="Othello"/>
			<i ns="ant" id="2048" name="2048"/>
			<i ns="ant" id="finder" name="Finder"/>
			<i ns="ant" id="mail" name="Mail"/>
			<i ns="ant" id="calendar" name="Calendar"/>
			<i ns="ant" id="eniac" name="Eniac"/>
			<i ns="ant" id="textedit" name="Textedit"/>
			<i ns="ant" id="spotify" name="Spotify"/>
		</Apps>
		<dock>
			<i order="9" ns="ant" id="othello"/>
			<i order="7" ns="ant" id="2048"/>
			<i order="1" ns="ant" id="finder"/>
			<i order="2" ns="ant" id="mail"/>
			<i order="3" ns="ant" id="calendar"/>
			<i order="4" ns="ant" id="eniac"/>
			<i order="5" ns="ant" id="textedit"/>
			<i order="6" ns="ant" id="spotify"/>
		</dock>
	</Settings>
</data>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:template match="/">
	<xsl:for-each select="//Settings/dock/*">
		<xsl:sort order="ascending" select="@order" data-type="number"/>
		<xsl:call-template name="dock-temp"/>
	</xsl:for-each>
</xsl:template>

<xsl:template name="dock-temp">
	<div>
		<xsl:value-of select="//Settings/Apps/*[@ns=current()/@ns and @id=current()/@id]/@name"/>
        <xsl:if test="@id">
			<xsl:attribute name="id">1</xsl:attribute>
		</xsl:if>
	</div>
</xsl:template>
</xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);
    let fragment = proXslt.transformToFragment(xmlDoc, document);

    let span = document.createElement('span');
    span.appendChild(fragment);

    expect(span.innerHTML.trim()).toBe('<div id="1">Finder</div><div id="1">Mail</div><div id="1">Calendar</div><div id="1">Eniac</div><div id="1">Textedit</div><div id="1">Spotify</div><div id="1">2048</div><div id="1">Othello</div>');
  });

  it('should switch template and render different content', async () => {
    let xmlString =
        `<data>
	<Settings>
		<Apps>
			<i ns="ant" id="othello" name="Othello"/>
			<i ns="ant" id="2048" name="2048"/>
			<i ns="ant" id="finder" name="Finder"/>
			<i ns="ant" id="mail" name="Mail"/>
			<i ns="ant" id="calendar" name="Calendar"/>
			<i ns="ant" id="eniac" name="Eniac"/>
			<i ns="ant" id="textedit" name="Textedit"/>
			<i ns="ant" id="spotify" name="Spotify"/>
		</Apps>
		<dock>
			<i order="9" ns="ant" id="othello"/>
			<i order="7" ns="ant" id="2048"/>
			<i order="1" ns="ant" id="finder"/>
			<i order="2" ns="ant" id="mail"/>
			<i order="3" ns="ant" id="calendar"/>
			<i order="4" ns="ant" id="eniac"/>
			<i order="5" ns="ant" id="textedit"/>
			<i order="6" ns="ant" id="spotify"/>
		</dock>
	</Settings>
</data>`;

    let xsltString =
        `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:template name="apps">
	<xsl:for-each select="//Settings/Apps/*">
		<xsl:sort order="ascending" select="@name"/>
		<div><xsl:value-of select="@name"/></div>
	</xsl:for-each>
</xsl:template>

<xsl:template name="dock">
	<xsl:for-each select="//Settings/dock/*">
		<xsl:sort order="ascending" select="@order" data-type="number"/>
		<div><xsl:value-of select="@order"/></div>
	</xsl:for-each>
</xsl:template>
</xsl:stylesheet>`;

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let xslDoc = ProXslt.xmlFromString(xsltString);
    let proXslt = new ProXslt();
    proXslt.importStylesheet(xslDoc);

    let fragment,
        template,
        span;

    template = xslDoc.selectSingleNode("//xsl:template[@name='apps']");
    template.setAttribute('match', '/');
    fragment = proXslt.transformToFragment(xmlDoc, document);
    template.removeAttribute('match');

    span = document.createElement('span');
    span.appendChild(fragment);
    // text ascending uses localeCompare (2048, Calendar, …, Textedit)
    expect(span.innerHTML.trim()).toBe(
      '<div>2048</div><div>Calendar</div><div>Eniac</div><div>Finder</div><div>Mail</div><div>Othello</div><div>Spotify</div><div>Textedit</div>'
    );

    template = xslDoc.selectSingleNode("//xsl:template[@name='dock']");
    template.setAttribute('match', '/');
    fragment = proXslt.transformToFragment(xmlDoc, document);
    template.removeAttribute('match');

    span = document.createElement('span');
    span.appendChild(fragment);
    expect(span.innerHTML.trim()).toBe('<div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div><div>7</div><div>9</div>');
  });
});
