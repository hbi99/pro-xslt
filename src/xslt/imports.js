function parseXmlString(str) {
	let parser = new DOMParser();
	let xdoc = parser.parseFromString(str, "application/xml");
	if (xdoc.querySelector("parsererror")) {
		throw new Error("xsl:import/xsl:include resolver returned invalid XML.");
	}
	return xdoc;
}

function importableTopLevelNodes(doc) {
	let root = doc.selectSingleNode("//xsl:stylesheet");
	if (!root) return [];
	return Array.from(root.childNodes).filter((n) => {
		if (n.nodeType !== Node.ELEMENT_NODE) return false;
		// These are resolved recursively and should not be copied as-is.
		if (n.nodeName === "xsl:import" || n.nodeName === "xsl:include") return false;
		return true;
	});
}

function appendImportedNodes(root, importDoc) {
	importableTopLevelNodes(importDoc).forEach((n) => {
		root.appendChild(root.ownerDocument.importNode(n, true));
	});
}

function inlineIncludedNodes(root, includeNode, includeDoc) {
	let nodes = importableTopLevelNodes(includeDoc);
	let parent = includeNode.parentNode;
	if (!parent) return;
	nodes.forEach((n) => {
		parent.insertBefore(root.ownerDocument.importNode(n, true), includeNode);
	});
	parent.removeChild(includeNode);
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
		appendImportedNodes(root, importDoc);
	});

	let includeNodes = Array.from(root.childNodes).filter((n) => {
		return n.nodeType === Node.ELEMENT_NODE && n.nodeName === "xsl:include";
	});
	includeNodes.forEach((inc) => {
		let href = inc.getAttribute("href");
		if (!href) return;
		let resolved = importResolver(href, xslDoc);
		if (!resolved) return;
		let includeDoc = typeof resolved === "string" ? parseXmlString(resolved) : resolved;
		resolveStylesheetImports(includeDoc, importResolver, seen);
		inlineIncludedNodes(root, inc, includeDoc);
	});

	return xslDoc;
}

