
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

export function evaluate(xnode, xpath) {
	let ns = document.createNSResolver(document.documentElement);
	let r = document.evaluate(xpath, xnode, ns, XPathResult.NUMBER_TYPE, null);
	if (!!r.numberValue) return r.numberValue;
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
	return `1,234.5`;
}
