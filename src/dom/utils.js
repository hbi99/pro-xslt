
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

export function evaluateBoolean(xnode, xpath) {
	let r = evaluateWithType(xnode, xpath, XPathResult.BOOLEAN_TYPE);
	return r.booleanValue;
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
 * @param {{ kind: 'number', n: number } | { kind: 'string', s: string } | { kind: 'nodeset', nodes: Node[] } | undefined} entry
 */
export function xpathVarToXPathLiteral(entry) {
	if (!entry) return "''";
	if (entry.kind === "number") return String(entry.n);
	if (entry.kind === "string") {
		return "'" + String(entry.s).replace(/'/g, "''") + "'";
	}
	if (entry.kind === "nodeset") {
		let first = entry.nodes && entry.nodes.length ? entry.nodes[0] : null;
		return "'" + String(first ? (first.textContent || "") : "").replace(/'/g, "''") + "'";
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

/**
 * Resolves node-set variable references like `$v/@attr` or `$v/path` by
 * evaluating against the first node in the variable's node-set and replacing
 * them with XPath string literals. Keeps quoted text untouched.
 */
export function expandXPathNodeSetVariables(expr, vars) {
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
					let entry = vars[k];
					if (!entry || entry.kind !== "nodeset") continue;
					let base = entry.nodes && entry.nodes.length ? entry.nodes[0] : null;
					let j = i + 1 + k.length;
					let path = "";
					if (expr[j] === "/") {
						let start = j;
						j++;
						while (j < expr.length) {
							let ch = expr[j];
							if (/[\s(),|+*=<>!]/.test(ch)) break;
							j++;
						}
						path = expr.slice(start, j);
					}
					let value = "";
					if (base) {
						value = path ? evaluateString(base, "." + path) : (base.textContent || "");
					}
					out += "'" + String(value).replace(/'/g, "''") + "'";
					i = j;
					matched = true;
					break;
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
			if (c === "'") inSingle = false;
			out += c;
			i++;
		} else {
			if (c === '"' && expr[i + 1] === '"') {
				out += '""';
				i += 2;
				continue;
			}
			if (c === '"') inDouble = false;
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
 * Parses a single top-level function call: `name(arg1, arg2, ...)`.
 * Respects nested parentheses and string literals (including `''` escapes).
 * Returns null if the input is not exactly one call (trailing text, unbalanced, etc.).
 *
 * @returns {{ name: string, args: string[], raw: string } | null}
 */
export function parseXsltFunctionCall(input) {
	let s = input.trim();
	let m = /^([A-Za-z_][\w.\-:]*)\s*\(/u.exec(s);
	if (!m) return null;
	let name = m[1];
	let i = m.index + m[0].length;
	let args = [];
	let argStart = i;
	let depth = 1;
	let inQuote = false;
	let quoteChar = "";
	let len = s.length;
	while (i < len) {
		let c = s[i];
		if (!inQuote) {
			if (c === "'" || c === '"') {
				inQuote = true;
				quoteChar = c;
				i++;
				continue;
			}
			if (c === "(") {
				depth++;
				i++;
				continue;
			}
			if (c === ")") {
				depth--;
				if (depth === 0) {
					let arg = s.slice(argStart, i).trim();
					if (arg.length > 0) args.push(arg);
					i++;
					if (i < len && s.slice(i).trim().length > 0) return null;
					return { name, args, raw: s };
				}
				i++;
				continue;
			}
			if (c === "," && depth === 1) {
				args.push(s.slice(argStart, i).trim());
				argStart = i + 1;
				i++;
				continue;
			}
			i++;
		} else {
			if (c === quoteChar) {
				if (quoteChar === "'" && s[i + 1] === "'") {
					i += 2;
					continue;
				}
				if (quoteChar === '"' && s[i + 1] === '"') {
					i += 2;
					continue;
				}
				inQuote = false;
			}
			i++;
		}
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
	let decimalFormatName;
	if (s[j] === ",") {
		j++;
		while (j < s.length && /\s/.test(s[j])) j++;
		let qn = s[j];
		if (qn === "'" || qn === '"') {
			let k = j + 1;
			let name = "";
			while (k < s.length) {
				if (s[k] === qn) break;
				name += s[k];
				k++;
			}
			if (s[k] !== qn) return null;
			decimalFormatName = name;
			j = k + 1;
		} else {
			let k = j;
			let name = "";
			while (k < s.length && s[k] !== ")" && !/\s/.test(s[k])) {
				name += s[k];
				k++;
			}
			decimalFormatName = name || undefined;
			j = k;
		}
		while (j < s.length && /\s/.test(s[j])) j++;
	}
	if (s[j] !== ")") return null;
	return { numberExpr, pattern, decimalFormatName };
}

function formatWithSubpattern(num, subPattern, symbols) {
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
		intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, symbols.groupingSeparator);
	}
	if (fracSlots === 0) return intPart;
	fracPart = fracPart.padEnd(fracSlots, "0").slice(0, fracSlots);
	return `${intPart}${symbols.decimalSeparator}${fracPart}`;
}

/**
 * XSLT `format-number(number, pattern)`.
 * @param {string | string[]} value — full `format-number(...)` select, or `[numberExpr, patternLiteral]` from {@link parseXsltFunctionCall}
 * @param {Node} context — XPath context node
 */
function resolveDecimalFormatSymbols(vars, name) {
	let defaults = {
		decimalSeparator: ".",
		groupingSeparator: ",",
		minusSign: "-",
		NaN: "NaN",
		infinity: "Infinity",
	};
	let all = vars && vars.__decimalFormats;
	if (!all) return defaults;
	let byName = name ? all[name] : null;
	let base = byName || all.__default || defaults;
	return {
		decimalSeparator: base.decimalSeparator || ".",
		groupingSeparator: base.groupingSeparator || ",",
		minusSign: base.minusSign || "-",
		NaN: base.NaN || "NaN",
		infinity: base.infinity || "Infinity",
	};
}

export function formatNumber(value, context, vars) {
	let numberExpr;
	let pattern;
	let decimalFormatName;
	if (Array.isArray(value) && value.length >= 2) {
		numberExpr = value[0].trim();
		let p2 = stripXPathStringLiteral(value[1].trim());
		pattern = p2 !== null ? p2 : value[1].trim();
		if (value.length >= 3) {
			let p3 = stripXPathStringLiteral(value[2].trim());
			decimalFormatName = p3 !== null ? p3 : value[2].trim();
		}
	} else {
		let parsed = parseFormatNumberCall(String(value).trim());
		if (!parsed) return "";
		numberExpr = parsed.numberExpr;
		pattern = parsed.pattern;
		decimalFormatName = parsed.decimalFormatName;
	}
	let symbols = resolveDecimalFormatSymbols(vars, decimalFormatName);

	let r = evaluateWithType(
		context,
		numberExpr,
		XPathResult.NUMBER_TYPE
	);
	let n = r.numberValue;
	if (Number.isNaN(n)) return symbols.NaN;
	if (!Number.isFinite(n)) return n < 0 ? `${symbols.minusSign}${symbols.infinity}` : symbols.infinity;

	let parts = pattern.split(";");
	let posPat = parts[0] || "";
	let negPat = parts.length > 1 ? parts[1] : "";
	let zeroPat = parts.length > 2 ? parts[2] : "";

	let neg = n < 0;
	let abs = Math.abs(n);

	if (abs === 0 && zeroPat) {
		return formatWithSubpattern(0, zeroPat, symbols);
	}
	if (neg && negPat) {
		return formatWithSubpattern(abs, negPat, symbols);
	}
	let body = formatWithSubpattern(abs, posPat, symbols);
	return neg ? `${symbols.minusSign}${body}` : body;
}