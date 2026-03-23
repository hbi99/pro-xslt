export function parseOutputSettings(xslDoc) {
	let out = xslDoc.selectSingleNode("//xsl:stylesheet/xsl:output");
	if (!out) return null;

	return {
		method: out.getAttribute("method") || "xml",
		encoding: out.getAttribute("encoding") || "UTF-8",
		omitXmlDeclaration: (out.getAttribute("omit-xml-declaration") || "no").toLowerCase() === "yes",
		indent: (out.getAttribute("indent") || "no").toLowerCase() === "yes",
	};
}

