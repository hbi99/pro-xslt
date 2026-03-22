
/*
 * Exported Functions
 */
export function selectNodes(xpath, xnode) {
	if (!xnode) xnode = this;
	let ns = this.createNSResolver(this.documentElement),
		qI = this.evaluate(xpath, xnode, ns, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null),
		res = [],
		len = qI.snapshotLength;
	while (len--) res[len] = qI.snapshotItem(len);
	return res;
};

export function selectSingleNode(xpath, xnode) {
	if(!xnode) xnode = this;
	let xI = this.selectNodes(xpath, xnode);
	return (xI.length > 0)? xI[0] : null ;
};

function resolverFor(contextNode) {
	const doc =
		contextNode.nodeType === Node.DOCUMENT_NODE
			? contextNode
			: contextNode.ownerDocument;
	return doc.createNSResolver(doc.documentElement);
}

function evaluateWithType(xnode, xpath, resultType) {
	const doc =
		xnode.nodeType === Node.DOCUMENT_NODE ? xnode : xnode.ownerDocument;
	return doc.evaluate(xpath, xnode, resolverFor(xnode), resultType, null);
}

export function evaluate(xnode, xpath) {
	const r = evaluateWithType(xnode, xpath, XPathResult.NUMBER_TYPE);
	const n = r.numberValue;
	return Number.isNaN(n) ? undefined : n;
}

export function evaluateString(xnode, xpath) {
	const r = evaluateWithType(xnode, xpath, XPathResult.STRING_TYPE);
	return r.stringValue;
}

export function evaluateNumber(xnode, xpath) {
	const r = evaluateWithType(xnode, xpath, XPathResult.NUMBER_TYPE);
	const n = r.numberValue;
	return Number.isNaN(n) ? undefined : n;
}

export function nodePosition(node) {
	let n = node,
		i = 0;
	while (n.previousSibling) {
		n = n.previousSibling;
		i++;
	}
	return i;
}

export function generateId(context) {
    // Create a WeakMap to store IDs (or use a property on the node itself)
    let idSymbol = Symbol.for('__xpath_node_id__');

    if (!context[idSymbol]) {
        // Generate a unique ID starting with a letter
        let timestamp = Date.now().toString(36);
        let random = Math.random().toString(36).substring(2, 8);
        let counter = (Math.floor(Math.random() * 10000)).toString(36);
        context[idSymbol] = `n${timestamp}${random}${counter}`;
    }

    return context[idSymbol];
}

export function formatNumber(value, context) {
	// implement xslt format-number function
}

/**
 * If `arg` is a single- or double-quoted XPath string literal, returns the decoded value; otherwise null.
 */
export function stripXPathStringLiteral(arg) {
	let t = arg.trim();
	if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) {
		return t.slice(1, -1).replace(/''/g, "'");
	}
	if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
		return t.slice(1, -1).replace(/""/g, '"');
	}
	return null;
}