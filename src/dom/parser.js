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
		case "xsl:if": {
			let test = xslNode.getAttribute("test");
			if (test == null || String(test).trim() === "") break;
			let expandedTest = expandXPathVariables(String(test).trim(), v);
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
