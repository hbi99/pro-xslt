import { evaluateBoolean, expandXPathVariables } from "./utils.js";

import { bindXslVariable } from "./xslt/variables.js";
import { expandXPathForEachContextFunctions } from "./xslt/foreachContext.js";
import { handleForEach } from "./xslt/forEach.js";
import { xsltFunctions } from "./xslt/xsltFunctions.js";

const XSL_NS = "http://www.w3.org/1999/XSL/Transform";

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
		case "xsl:for-each":
			handleForEach(context, xslNode, fragment, v, xmlNodes, bindXslVariable);
			break;
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

export { xsltFunctions };
