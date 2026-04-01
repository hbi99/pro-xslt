<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/root/item">
    <xsl:text>IMPORTED:</xsl:text>
    <xsl:value-of select="." />
  </xsl:template>

  <xsl:template name="imported-wrap">
    <xsl:text>[</xsl:text>
    <xsl:value-of select="." />
    <xsl:text>]</xsl:text>
  </xsl:template>
</xsl:stylesheet>

