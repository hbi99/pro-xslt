<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:fo="http://www.w3.org/1999/XSL/Format">
    <xsl:output method="html" indent="yes"/>
    <xsl:include href="include-head.xsl"/>
    <xsl:template match="*">
        <html>
            <head>
                <title>Test</title>
            </head>
            <body>
                <div id="main">
                    <div id="content">
                        <xsl:call-template name="home-in"/>
                    </div>
                </div>

                <h2>The Bookstore</h2>
                <table border="1">
                    <tr bgcolor="#6565d5">
                        <th>Title</th>
                        <th>Author</th>
                        <th>Year</th>
                        <th>Price</th>
                    </tr>  
                    <xsl:for-each select="bookstore/book">
                        <tr>
                            <td><xsl:value-of select="title"/></td>
                            <td><xsl:value-of select="author"/></td>
                            <td><xsl:value-of select="year"/></td>
                            <td><xsl:value-of select="price"/></td>
                        </tr>
                    </xsl:for-each>
                </table>
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>