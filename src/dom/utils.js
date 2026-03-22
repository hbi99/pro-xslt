
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

export function evaluate(xpath, contextNode) {
	let ns = document.createNSResolver(document.documentElement);
	let r = document.evaluate(xpath, contextNode, ns, XPathResult.NUMBER_TYPE, null);
	let n = r.numberValue;
	if (!!n) return n;
}
