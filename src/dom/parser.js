import {
	concatFromParsedArgs,
	evaluate,
	evaluateNumber,
	evaluateString,
	expandXPathVariables,
	formatNumber,
	generateId,
	stripXPathStringLiteral,
} from "./utils.js";

function bindXslVariable(context, el, vars) {
	let name = el.getAttribute("name");
	if (!name) return;
	let select = el.getAttribute("select");
	if (select != null && String(select).trim() !== "") {
		let expanded = expandXPathVariables(select.trim(), vars);
		let num = evaluateNumber(context, expanded);
		if (num !== undefined && !Number.isNaN(num)) {
			vars[name] = { kind: "number", n: num };
		} else {
			vars[name] = { kind: "string", s: evaluateString(context, expanded) };
		}
	} else {
		vars[name] = { kind: "string", s: el.textContent || "" };
	}
}

function processXslChildNodes(context, childNodes, fragment, vars) {
	Array.from(childNodes).forEach((child) => {
		if (child.nodeType !== Node.ELEMENT_NODE) return;
		if (child.nodeName === "xsl:variable") {
			bindXslVariable(context, child, vars);
			return;
		}
		fragment.appendChild(xmlNodes(context, child, vars));
	});
}

export function xmlNodes(context, xslNode, vars) {
	let fragment = document.createDocumentFragment();
	let v = vars || {};
	switch (xslNode.nodeType) {
		case Node.ELEMENT_NODE:
			xsltElements(context, xslNode, fragment, v);
			break;
		case Node.ATTRIBUTE_NODE:
			fragment.appendChild(document.createTextNode(xslNode.value));
			break;
		case Node.TEXT_NODE:
			fragment.appendChild(document.createTextNode(xslNode.textContent));
			break;
		case Node.COMMENT_NODE:
			fragment.appendChild(document.createComment(xslNode.textContent));
			break;
		case Node.DOCUMENT_NODE:
			fragment.appendChild(xslNode.cloneNode(true));
			break;
	}
	return fragment;
}

export function xsltElements(context, xslNode, fragment, vars) {
	let result,
		name,
		value;
	let v = vars || {};
	switch (xslNode.nodeName) {
		case "xsl:apply-imports": break;
		case "xsl:apply-templates": break;
		case "xsl:attribute": break;
		case "xsl:attribute-set": break;
		case "xsl:call-template": break;
		case "xsl:choose": break;
		case "xsl:comment": break;
		case "xsl:copy": break;
		case "xsl:copy-of": break;
		case "xsl:decimal-format": break;
		case "xsl:element": break;
		case "xsl:fallback": break;
		case "xsl:for-each": break;
		case "xsl:if": break;
		case "xsl:import": break;
		case "xsl:include": break;
		case "xsl:key": break;
		case "xsl:message": break;
		case "xsl:namespace-alias": break;
		case "xsl:number": break;
		case "xsl:otherwise": break;
		case "xsl:output": break;
		case "xsl:param": break;
		case "xsl:preserve-space": break;
		case "xsl:processing-instruction": break;
		case "xsl:sort": break;
		case "xsl:strip-space": break;
		case "xsl:stylesheet": break;
		case "xsl:template":
			context.selectNodes(xslNode.getAttribute("match"))
				.map(node => {
					let scope = Object.assign({}, v);
					processXslChildNodes(node, xslNode.childNodes, fragment, scope);
				});
			break;
		case "xsl:text": break;
		case "xsl:transform": break;
		case "xsl:value-of":
			value = xslNode.getAttribute("select").trim();
			result = xsltFunctions(context, value, v);
			fragment.appendChild(document.createTextNode(result));
			break;
		case "xsl:variable":
			break;
		case "xsl:when": break;
		case "xsl:with-param": break;
	}
	return fragment;
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

function dispatchParsedXsltFunction(context, parsed) {
	let n = parsed.name.toLowerCase();
	let raw = parsed.raw;
	switch (n) {
		case "format-number":
			return formatNumber(
				parsed.args.length >= 2 ? parsed.args : parsed.raw,
				context
			);
		case "generate-id":
			return generateId(context);
		case "concat":
			return concatFromParsedArgs(context, parsed.args);
		case "position":
		case "last":
		case "count":
		case "number":
		case "round":
		case "floor":
		case "ceiling":
		case "sum":
		case "string-length": {
			let num = evaluateNumber(context, raw);
			return num !== undefined && !Number.isNaN(num) ? String(num) : evaluateString(context, raw);
		}
		case "string":
		case "normalize-space":
		case "substring":
		case "substring-before":
		case "substring-after":
		case "translate":
			return evaluateString(context, raw);
		default: {
			let num = evaluateNumber(context, raw);
			if (num !== undefined && !Number.isNaN(num)) return String(num);
			return evaluateString(context, raw);
		}
	}
}

export function xsltFunctions(context, value, vars) {
	let expanded = expandXPathVariables(String(value).trim(), vars || {});
	let parsed = parseXsltFunctionCall(expanded);
	if (parsed) return dispatchParsedXsltFunction(context, parsed);

	let result;
	switch (true) {
		case expanded.startsWith("current"): break;
		case expanded.startsWith("document"): break;
		case expanded.startsWith("element-available"): break;
		case expanded.startsWith("format-number"):
			result = formatNumber(expanded, context);
			break;
		case expanded.startsWith("function-available"): break;
		case expanded.startsWith("generate-id"):
			result = generateId(context);
			break;
		case expanded.startsWith("key"): break;
		case expanded.startsWith("system-property"): break;
		case expanded.startsWith("unparsed-entity-uri"): break;
		default:
			result =
				evaluate(context, expanded) ??
				context.selectSingleNode(expanded)?.textContent;
	}
	return result;
}

// export function coreFunctions(context, value) {
// 	let result;
// 	switch (true) {
// 		case value.startsWith("boolean"): break;
// 		case value.startsWith("ceiling"): break;
// 		case value.startsWith("concat"):
// 			result = value.slice(7, -1).split(",").map(p => {
// 				p = p.trim();
// 				if (p.startsWith("'") && p.endsWith("'")) p = p.slice(1,-1);
// 				return p;
// 			}).join("");
// 			break;
// 		case value.startsWith("contains"): break;
// 		case value.startsWith("count"): break;
// 		case value.startsWith("false"): break;
// 		case value.startsWith("floor"): break;
// 		case value.startsWith("id"): break;
// 		case value.startsWith("lang"): break;
// 		case value.startsWith("last"): break;
// 		case value.startsWith("local-name"): break;
// 		case value.startsWith("name"): break;
// 		case value.startsWith("namespace-uri"): break;
// 		case value.startsWith("normalize-space"): break;
// 		case value.startsWith("not"): break;
// 		case value.startsWith("number"): break;
// 		case value.startsWith("position"): break;
// 		case value.startsWith("round"): break;
// 		case value.startsWith("starts-with"): break;
// 		case value.startsWith("string"): break;
// 		case value.startsWith("string-length"): break;
// 		case value.startsWith("substring"): break;
// 		case value.startsWith("substring-after"): break;
// 		case value.startsWith("substring-before"): break;
// 		case value.startsWith("sum"): break;
// 		case value.startsWith("translate"): break;
// 		case value.startsWith("true"): break;
// 	}
// 	return result;
// }
