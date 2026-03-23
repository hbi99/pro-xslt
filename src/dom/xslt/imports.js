function parseXmlString(str) {
	let parser = new DOMParser();
	let xdoc = parser.parseFromString(str, "application/xml");
	if (xdoc.querySelector("parsererror")) {
		throw new Error("xsl:import resolver returned invalid XML.");
	}
	return xdoc;
}

function importNodesIntoRoot(root, importDoc) {
	let importRoot = importDoc.selectSingleNode("//xsl:stylesheet");
	if (!importRoot) return;

	Array.from(importRoot.childNodes).forEach((n) => {
		if (n.nodeType !== Node.ELEMENT_NODE) return;
		// Keep import declarations internal to the imported doc.
		if (n.nodeName === "xsl:import") return;
		root.appendChild(root.ownerDocument.importNode(n, true));
	});
}

export function resolveStylesheetImports(xslDoc, importResolver, visited) {
	if (typeof importResolver !== "function") return xslDoc;
	let root = xslDoc.selectSingleNode("//xsl:stylesheet");
	if (!root) return xslDoc;

	let seen = visited || new Set();
	let importNodes = Array.from(root.childNodes).filter((n) => {
		return n.nodeType === Node.ELEMENT_NODE && n.nodeName === "xsl:import";
	});

	importNodes.forEach((imp) => {
		let href = imp.getAttribute("href");
		if (!href) return;
		if (seen.has(href)) return;
		seen.add(href);

		let resolved = importResolver(href, xslDoc);
		if (!resolved) return;
		let importDoc = typeof resolved === "string" ? parseXmlString(resolved) : resolved;
		resolveStylesheetImports(importDoc, importResolver, seen);
		importNodesIntoRoot(root, importDoc);
	});

	return xslDoc;
}

