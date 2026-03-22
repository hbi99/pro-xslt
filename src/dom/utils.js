
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

/**
 * Parse `format-number(expr, 'pattern' [, qname])` from a select string.
 * @returns {{ numberExpr: string, pattern: string } | null}
 */
function parseFormatNumberCall(s) {
	const m = /^format-number\s*\(\s*/i.exec(s);
	if (!m) return null;
	let i = m[0].length;
	let depth = 1;
	const start = i;
	let inQuote = false;
	let quote = "";
	for (; i < s.length; i++) {
		const c = s[i];
		if (!inQuote) {
			if (c === "'" || c === '"') {
				inQuote = true;
				quote = c;
				continue;
			}
			if (c === "(") depth++;
			else if (c === ")") {
				depth--;
				if (depth === 0) return null;
			} else if (c === "," && depth === 1) break;
		} else {
			if (c === quote) {
				if (quote === "'" && s[i + 1] === "'") {
					i++;
					continue;
				}
				if (quote === '"' && s[i + 1] === '"') {
					i++;
					continue;
				}
				inQuote = false;
			}
		}
	}
	if (i >= s.length) return null;
	const numberExpr = s.slice(start, i).trim();
	i++;
	while (i < s.length && /\s/.test(s[i])) i++;
	if (s[i] !== "'" && s[i] !== '"') return null;
	const q = s[i];
	let j = i + 1;
	let pattern = "";
	while (j < s.length) {
		if (s[j] === q) {
			if (q === "'" && s[j + 1] === "'") {
				pattern += "'";
				j += 2;
				continue;
			}
			if (q === '"' && s[j + 1] === '"') {
				pattern += '"';
				j += 2;
				continue;
			}
			break;
		}
		pattern += s[j];
		j++;
	}
	if (s[j] !== q) return null;
	j++;
	while (j < s.length && /\s/.test(s[j])) j++;
	if (s[j] === ",") {
		while (j < s.length && s[j] !== ")") j++;
	}
	if (s[j] !== ")") return null;
	return { numberExpr, pattern };
}

function formatWithSubpattern(num, subPattern) {
	const pat = subPattern.trim();
	const dotIdx = pat.indexOf(".");
	const intPat = dotIdx === -1 ? pat : pat.slice(0, dotIdx);
	const fracPat = dotIdx === -1 ? "" : pat.slice(dotIdx + 1);
	const fracSlots = (fracPat.match(/[0#]/g) || []).length;
	const rounded =
		fracSlots > 0
			? Math.round(num * Math.pow(10, fracSlots)) / Math.pow(10, fracSlots)
			: Math.round(num);
	const s = fracSlots > 0 ? rounded.toFixed(fracSlots) : String(rounded);
	let [intPart, fracPart = ""] = s.split(".");
	const minInt = (intPat.match(/0/g) || []).length;
	if (minInt > 0) {
		intPart = intPart.padStart(Math.max(minInt, intPart.length), "0");
	}
	if (intPat.includes(",")) {
		intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}
	if (fracSlots === 0) return intPart;
	fracPart = fracPart.padEnd(fracSlots, "0").slice(0, fracSlots);
	return `${intPart}.${fracPart}`;
}

/**
 * XSLT `format-number(number, pattern)`.
 * @param {string | string[]} value — full `format-number(...)` select, or `[numberExpr, patternLiteral]` from {@link parseXsltFunctionCall}
 * @param {Node} context — XPath context node
 */
export function formatNumber(value, context) {
	let numberExpr;
	let pattern;
	if (Array.isArray(value) && value.length >= 2) {
		numberExpr = value[0].trim();
		const p2 = stripXPathStringLiteral(value[1].trim());
		pattern = p2 !== null ? p2 : value[1].trim();
	} else {
		const parsed = parseFormatNumberCall(String(value).trim());
		if (!parsed) return "";
		numberExpr = parsed.numberExpr;
		pattern = parsed.pattern;
	}

	const r = evaluateWithType(
		context,
		numberExpr,
		XPathResult.NUMBER_TYPE
	);
	let n = r.numberValue;
	if (Number.isNaN(n)) return "NaN";
	if (!Number.isFinite(n)) return n < 0 ? "-Infinity" : "Infinity";

	const parts = pattern.split(";");
	const posPat = parts[0] || "";
	const negPat = parts.length > 1 ? parts[1] : "";
	const zeroPat = parts.length > 2 ? parts[2] : "";

	const neg = n < 0;
	const abs = Math.abs(n);

	if (abs === 0 && zeroPat) {
		return formatWithSubpattern(0, zeroPat);
	}
	if (neg && negPat) {
		return formatWithSubpattern(abs, negPat);
	}
	const body = formatWithSubpattern(abs, posPat);
	return neg ? `-${body}` : body;
}