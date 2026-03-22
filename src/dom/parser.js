import { evaluate } from "./utils.js";

export function xmlNodes(context, xslNode) {
	let fragment = document.createDocumentFragment();
	switch (xslNode.nodeType) {
		case Node.ELEMENT_NODE:
			xsltElements(context, xslNode, fragment);
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

export function xsltElements(context, xslNode, fragment) {
	let result,
		name,
		value;
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
					xslNode.childNodes.forEach(child => {
						fragment.appendChild(xmlNodes(node, child));
					});
				});
			break;
		case "xsl:text": break;
		case "xsl:transform": break;
		case "xsl:value-of":
			value = xslNode.getAttribute("select").trim();
			result = xsltFunctions(context, value);
			fragment.appendChild(document.createTextNode(result));
			break;
		case "xsl:variable": break;
		case "xsl:when": break;
		case "xsl:with-param": break;
	}
	return fragment;
}

export function xsltFunctions(context, value) {
	let result;
	switch (true) {
		case value.startsWith("current"): break;
		case value.startsWith("document"): break;
		case value.startsWith("element-available"): break;
		case value.startsWith("format-number"): break;
		case value.startsWith("function-available"): break;
		case value.startsWith("generate-id"): break;
		case value.startsWith("key"): break;
		case value.startsWith("system-property"): break;
		case value.startsWith("unparsed-entity-uri"): break;
		default:
			let arithmeticExpression = evaluate(value, context);
			result = arithmeticExpression || context.selectSingleNode(value).textContent;
	}
	return result;
}

export function coreFunctions(context, value) {
	switch (true) {
		case value.startsWith("boolean"): break;
		case value.startsWith("ceiling"): break;
		case value.startsWith("concat"): break;
		case value.startsWith("contains"): break;
		case value.startsWith("count"): break;
		case value.startsWith("false"): break;
		case value.startsWith("floor"): break;
		case value.startsWith("id"): break;
		case value.startsWith("lang"): break;
		case value.startsWith("last"): break;
		case value.startsWith("local-name"): break;
		case value.startsWith("name"): break;
		case value.startsWith("namespace-uri"): break;
		case value.startsWith("normalize-space"): break;
		case value.startsWith("not"): break;
		case value.startsWith("number"): break;
		case value.startsWith("position"): break;
		case value.startsWith("round"): break;
		case value.startsWith("starts-with"): break;
		case value.startsWith("string"): break;
		case value.startsWith("string-length"): break;
		case value.startsWith("substring"): break;
		case value.startsWith("substring-after"): break;
		case value.startsWith("substring-before"): break;
		case value.startsWith("sum"): break;
		case value.startsWith("translate"): break;
		case value.startsWith("true"): break;
	}
}
