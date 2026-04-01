<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/doc/item">
    <xsl:text>INCLUDED:</xsl:text>
    <xsl:value-of select="." />
  </xsl:template>

  <xsl:template name="included-suffix">
    <xsl:text>-ok</xsl:text>
  </xsl:template>
</xsl:stylesheet>

