
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
	let doc =
		contextNode.nodeType === Node.DOCUMENT_NODE
			? contextNode
			: contextNode.ownerDocument;
	return doc.createNSResolver(doc.documentElement);
}

function evaluateWithType(xnode, xpath, resultType) {
	let doc =
		xnode.nodeType === Node.DOCUMENT_NODE ? xnode : xnode.ownerDocument;
	return doc.evaluate(xpath, xnode, resolverFor(xnode), resultType, null);
}

export function evaluate(xnode, xpath) {
	let r = evaluateWithType(xnode, xpath, XPathResult.NUMBER_TYPE);
	let n = r.numberValue;
	return Number.isNaN(n) ? undefined : n;
}

export function evaluateString(xnode, xpath) {
	let r = evaluateWithType(xnode, xpath, XPathResult.STRING_TYPE);
	return r.stringValue;
}

export function evaluateNumber(xnode, xpath) {
	let r = evaluateWithType(xnode, xpath, XPathResult.NUMBER_TYPE);
	let n = r.numberValue;
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
        let random = Math.random().toString(36).substring(2, 9);
        let counter = (Math.floor(Math.random() * 10000)).toString(36);
        context[idSymbol] = `n${timestamp}${random}${counter}`.slice(0,18);
    }

    return context[idSymbol];
}

/**
 * Turn a bound XSLT variable into an XPath token (number or quoted string).
 * @param {{ kind: 'number', n: number } | { kind: 'string', s: string } | undefined} entry
 */
export function xpathVarToXPathLiteral(entry) {
	if (!entry) return "''";
	if (entry.kind === "number") return String(entry.n);
	if (entry.kind === "string") {
		return "'" + String(entry.s).replace(/'/g, "''") + "'";
	}
	return "''";
}

/**
 * Replaces `$QName` references outside string literals. Keys are `name` attribute values (e.g. `x`, `pre:foo`).
 */
export function expandXPathVariables(expr, vars) {
	if (!expr || !vars) return expr;
	let keys = Object.keys(vars).sort((a, b) => b.length - a.length);
	if (keys.length === 0) return expr;
	let out = "";
	let i = 0;
	let inSingle = false;
	let inDouble = false;
	while (i < expr.length) {
		let c = expr[i];
		if (!inSingle && !inDouble) {
			if (c === "'") {
				inSingle = true;
				out += c;
				i++;
				continue;
			}
			if (c === '"') {
				inDouble = true;
				out += c;
				i++;
				continue;
			}
			if (c === "$") {
				let matched = false;
				for (let k of keys) {
					if (!expr.slice(i + 1).startsWith(k)) continue;
					let after = expr[i + 1 + k.length];
					if (
						after === undefined ||
						/[\s\[\](),|+\-*/=<>!]/.test(after) ||
						after === ")" ||
						after === "]"
					) {
						if (vars[k] !== undefined) {
							out += xpathVarToXPathLiteral(vars[k]);
							i += 1 + k.length;
							matched = true;
							break;
						}
					}
				}
				if (matched) continue;
			}
			out += c;
			i++;
		} else if (inSingle) {
			if (c === "'" && expr[i + 1] === "'") {
				out += "''";
				i += 2;
				continue;
			}
			if (c === "'") {
				inSingle = false;
			}
			out += c;
			i++;
		} else {
			if (c === '"' && expr[i + 1] === '"') {
				out += '""';
				i += 2;
				continue;
			}
			if (c === '"') {
				inDouble = false;
			}
			out += c;
			i++;
		}
	}
	return out;
}

export function concatFromParsedArgs(context, args) {
	return args
		.map((a) => {
			let lit = stripXPathStringLiteral(a);
			if (lit !== null) return lit;
			return evaluateString(context, a);
		})
		.join("");
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
	let m = /^format-number\s*\(\s*/i.exec(s);
	if (!m) return null;
	let i = m[0].length;
	let depth = 1;
	let start = i;
	let inQuote = false;
	let quote = "";
	for (; i < s.length; i++) {
		let c = s[i];
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
	let numberExpr = s.slice(start, i).trim();
	i++;
	while (i < s.length && /\s/.test(s[i])) i++;
	if (s[i] !== "'" && s[i] !== '"') return null;
	let q = s[i];
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
	let pat = subPattern.trim();
	let dotIdx = pat.indexOf(".");
	let intPat = dotIdx === -1 ? pat : pat.slice(0, dotIdx);
	let fracPat = dotIdx === -1 ? "" : pat.slice(dotIdx + 1);
	let fracSlots = (fracPat.match(/[0#]/g) || []).length;
	let rounded =
		fracSlots > 0
			? Math.round(num * Math.pow(10, fracSlots)) / Math.pow(10, fracSlots)
			: Math.round(num);
	let s = fracSlots > 0 ? rounded.toFixed(fracSlots) : String(rounded);
	let [intPart, fracPart = ""] = s.split(".");
	let minInt = (intPat.match(/0/g) || []).length;
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
		let p2 = stripXPathStringLiteral(value[1].trim());
		pattern = p2 !== null ? p2 : value[1].trim();
	} else {
		let parsed = parseFormatNumberCall(String(value).trim());
		if (!parsed) return "";
		numberExpr = parsed.numberExpr;
		pattern = parsed.pattern;
	}

	let r = evaluateWithType(
		context,
		numberExpr,
		XPathResult.NUMBER_TYPE
	);
	let n = r.numberValue;
	if (Number.isNaN(n)) return "NaN";
	if (!Number.isFinite(n)) return n < 0 ? "-Infinity" : "Infinity";

	let parts = pattern.split(";");
	let posPat = parts[0] || "";
	let negPat = parts.length > 1 ? parts[1] : "";
	let zeroPat = parts.length > 2 ? parts[2] : "";

	let neg = n < 0;
	let abs = Math.abs(n);

	if (abs === 0 && zeroPat) {
		return formatWithSubpattern(0, zeroPat);
	}
	if (neg && negPat) {
		return formatWithSubpattern(abs, negPat);
	}
	let body = formatWithSubpattern(abs, posPat);
	return neg ? `-${body}` : body;
}