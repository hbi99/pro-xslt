<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
<html>
<head>
<title>Bookstore</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link href="../css/book-store.css" rel="stylesheet" />
</head>
<body>

<h1>Bookstore</h1>
<ul class="book-list">
	<xsl:for-each select="//book">
	<li>
		<div class="book">
			<img class="cover">
				<xsl:attribute name="src"><xsl:value-of select="cover" /></xsl:attribute>
			</img>
			<div class="book-info">
				<div>
					<span class="title">
						<xsl:value-of select="title" />
					</span>
					-
					<span class="author">
						<xsl:value-of select="../name" />
					</span>
				</div>
				<div>
					<span class="genre">
						<xsl:value-of select="genre" />
					</span>
				</div>
			</div>
		</div>
	</li>
	</xsl:for-each>
</ul>
		
</body>
</html>
</xsl:template>

</xsl:stylesheet>