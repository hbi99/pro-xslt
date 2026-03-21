
export function selectNodes(xpath, xnode) {
  if (!xnode) xnode = this;
  var ns = this.createNSResolver(this.documentElement),
    qI = this.evaluate(xpath, xnode, ns, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null),
    res = [],
    len = qI.snapshotLength;
  while (len--) res[len] = qI.snapshotItem(len);
  return res;
};

export function selectSingleNode(xpath, xnode) {
  if(!xnode) xnode = this;
  var xI = this.selectNodes(xpath, xnode);
  return (xI.length > 0)? xI[0] : null ;
};


