function matchesStripRule(el, rules) {
	if (!rules || rules.length === 0) return false;
	for (let rule of rules) {
		if (rule === "*") return true;
		if (el.nodeName === rule || el.localName === rule) return true;
	}
	return false;
}

function removeWhitespaceTextChildren(el) {
	let toRemove = [];
	Array.from(el.childNodes).forEach((child) => {
		if (child.nodeType === Node.TEXT_NODE) {
			let t = child.textContent || "";
			if (/^\s*$/.test(t)) toRemove.push(child);
		}
	});
	toRemove.forEach((n) => n.parentNode && n.parentNode.removeChild(n));
}

export function applyStripSpaceRules(sourceDoc, xslDoc) {
	let stripNodes = xslDoc.selectNodes("//xsl:stylesheet/xsl:strip-space");
	if (!stripNodes || stripNodes.length === 0) return;

	let rules = [];
	stripNodes.forEach((n) => {
		let elements = n.getAttribute("elements");
		if (!elements) return;
		elements.split(/\s+/).map((t) => t.trim()).filter(Boolean).forEach((t) => rules.push(t));
	});
	if (rules.length === 0) return;

	let allEls = sourceDoc.selectNodes("//*");
	allEls.forEach((el) => {
		if (matchesStripRule(el, rules)) removeWhitespaceTextChildren(el);
	});
}

