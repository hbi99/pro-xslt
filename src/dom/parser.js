import {
	concatFromParsedArgs,
	evaluate,
	evaluateBoolean,
	evaluateNumber,
	evaluateString,
	expandXPathVariables,
	formatNumber,
	generateId,
	parseXsltFunctionCall,
} from "./utils.js";

const XSL_NS = "http://www.w3.org/1999/XSL/Transform";

function expandXPathForEachContextFunctions(expr, vars) {
	let pos = vars && vars.__position;
	let last = vars && vars.__last;
	if (pos === undefined && last === undefined) return expr;

	let out = "";
	let i = 0;
	let inSingle = false;
	let inDouble = false;
	while (i < expr.length) {
		let c = expr[i];
		if (!inDouble && c === "'") {
			inSingle = !inSingle;
			out += c;
			i++;
			continue;
		}
		if (!inSingle && c === '"') {
			inDouble = !inDouble;
			out += c;
			i++;
			continue;
		}

		if (!inSingle && !inDouble) {
			if (pos !== undefined) {
				let m = /^position\s*\(\s*\)/.exec(expr.slice(i));
				if (m) {
					out += String(pos);
					i += m[0].length;
					continue;
				}
			}
			if (last !== undefined) {
				let m = /^last\s*\(\s*\)/.exec(expr.slice(i));
				if (m) {
					out += String(last);
					i += m[0].length;
					continue;
				}
			}
		}

		out += c;
		i++;
	}
	return out;
}

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

function xslSortElements(forEachNode) {
	return Array.from(forEachNode.childNodes).filter((child) =>
		child.nodeType === Node.ELEMENT_NODE && child.nodeName === "xsl:sort"
	);
}

function sortKeyForNode(node, sortNode, vars) {
	let expr = sortNode.getAttribute("select");
	let expandedExpr = expandXPathVariables(
		(expr == null || String(expr).trim() === "") ? "." : String(expr).trim(),
		vars || {}
	);
	let dataType = (sortNode.getAttribute("data-type") || "text").toLowerCase();
	if (dataType === "number") {
		let n = evaluateNumber(node, expandedExpr);
		return n !== undefined && !Number.isNaN(n) ? n : Number(evaluateString(node, expandedExpr));
	}
	return evaluateString(node, expandedExpr);
}

function sortNodesForEach(nodes, sortNodes, vars) {
	if (sortNodes.length === 0) return nodes.slice();
	let sorted = nodes.slice();
	sorted.sort((a, b) => {
		for (let sortNode of sortNodes) {
			let ka = sortKeyForNode(a, sortNode, vars);
			let kb = sortKeyForNode(b, sortNode, vars);
			let order = (sortNode.getAttribute("order") || "ascending").toLowerCase();
			let cmp = 0;
			let dataType = (sortNode.getAttribute("data-type") || "text").toLowerCase();
			if (dataType === "number") {
				let na = Number(ka);
				let nb = Number(kb);
				let aNan = Number.isNaN(na);
				let bNan = Number.isNaN(nb);
				if (aNan && bNan) cmp = 0;
				else if (aNan) cmp = 1;
				else if (bNan) cmp = -1;
				else cmp = na === nb ? 0 : (na < nb ? -1 : 1);
			} else {
				cmp = String(ka).localeCompare(String(kb));
			}
			if (cmp !== 0) return order === "descending" ? -cmp : cmp;
		}
		return 0;
	});
	return sorted;
}

function processForEachChildNodes(context, forEachNode, fragment, vars) {
	Array.from(forEachNode.childNodes).forEach((child) => {
		if (child.nodeType !== Node.ELEMENT_NODE) return;
		if (child.nodeName === "xsl:sort") return;
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
		case "xsl:for-each": {
			let select = xslNode.getAttribute("select");
			if (select == null || String(select).trim() === "") break;
			let expandedSelect = expandXPathVariables(String(select).trim(), v);
			let nodes = context.selectNodes(expandedSelect);
			let sortNodes = xslSortElements(xslNode);
			let sortedNodes = sortNodesForEach(nodes, sortNodes, v);
			sortedNodes.forEach((node, idx) => {
				let scope = Object.assign({}, v);
				scope.__position = idx + 1;
				scope.__last = sortedNodes.length;
				processForEachChildNodes(node, xslNode, fragment, scope);
			});
			break;
		}
		case "xsl:if": {
			let test = xslNode.getAttribute("test");
			if (test == null || String(test).trim() === "") break;
			let expandedTest = expandXPathVariables(String(test).trim(), v);
			expandedTest = expandXPathForEachContextFunctions(expandedTest, v);
			if (evaluateBoolean(context, expandedTest)) {
				processXslChildNodes(context, xslNode.childNodes, fragment, v);
			}
			break;
		}
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
		case "xsl:text":
			fragment.appendChild(
				document.createTextNode(xslNode.textContent)
			);
			break;
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
		default: {
			if (xslNode.namespaceURI === XSL_NS) break;
			let outEl = xslNode.namespaceURI
				? document.createElementNS(xslNode.namespaceURI, xslNode.nodeName)
				: document.createElement(xslNode.localName);
			Array.from(xslNode.attributes || []).forEach((attr) => {
				if (attr.name === "xmlns" || attr.name.startsWith("xmlns:")) return;
				outEl.setAttribute(attr.name, attr.value);
			});
			processXslChildNodes(context, xslNode.childNodes, outEl, v);
			fragment.appendChild(outEl);
			break;
		}
	}
	return fragment;
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
	expanded = expandXPathForEachContextFunctions(expanded, vars || {});
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
		default: {
			let num = evaluate(context, expanded);
			if (num !== undefined && !Number.isNaN(num)) {
				result = String(num);
				break;
			}
			try {
				let sn = context.selectSingleNode(expanded);
				if (sn != null) {
					result = sn.textContent;
					break;
				}
			} catch (_) {
				/* not a location path (e.g. string literal `'yes'`) */
			}
			result = evaluateString(context, expanded);
			break;
		}
	}
	return result;
}
