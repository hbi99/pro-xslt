import {
	evaluateBoolean,
	evaluateNumber,
	evaluateString,
	expandXPathVariables,
} from "./utils.js";

import { bindXslVariable } from "./xslt/variables.js";
import { expandXPathForEachContextFunctions } from "./xslt/foreachContext.js";
import { handleForEach } from "./xslt/forEach.js";
import { xsltFunctions } from "./xslt/xsltFunctions.js";

const XSL_NS = "http://www.w3.org/1999/XSL/Transform";

function applyXslAttributeNodeToElement(context, outEl, attrNode, vars) {
	if (!outEl || outEl.nodeType !== Node.ELEMENT_NODE) return;
	let attrName = attrNode.getAttribute("name");
	if (attrName == null || String(attrName).trim() === "") return;

	let select = attrNode.getAttribute("select");
	if (select != null && String(select).trim() !== "") {
		let valueExpr = String(select).trim();
		valueExpr = expandXPathVariables(valueExpr, vars);
		valueExpr = expandXPathForEachContextFunctions(valueExpr, vars);
		let attrValue = xsltFunctions(context, valueExpr, vars);
		outEl.setAttribute(attrName, attrValue);
		return;
	}

	let tmpFragment = document.createDocumentFragment();
	processXslChildNodes(context, attrNode.childNodes, tmpFragment, vars);
	let normalized = (tmpFragment.textContent || "").replace(/\s+/g, " ").trim();
	outEl.setAttribute(attrName, normalized);
}

function applyAttributeSetByName(context, outEl, setName, vars, visiting) {
	let allSets = vars && vars.__attributeSets;
	if (!allSets) return;
	let defs = allSets[setName];
	if (!defs || defs.length === 0) return;

	let seen = visiting || new Set();
	if (seen.has(setName)) return;
	seen.add(setName);

	defs.forEach((def) => {
		def.uses.forEach((n) => applyAttributeSetByName(context, outEl, n, vars, seen));
		def.attrs.forEach((attrNode) => applyXslAttributeNodeToElement(context, outEl, attrNode, vars));
	});

	seen.delete(setName);
}

function applyUseAttributeSets(context, outEl, useValue, vars) {
	if (!useValue) return;
	let names = String(useValue).split(/\s+/).map((s) => s.trim()).filter(Boolean);
	names.forEach((n) => applyAttributeSetByName(context, outEl, n, vars, new Set()));
}

function processXslChildNodes(context, childNodes, fragment, vars) {
	Array.from(childNodes).forEach((child) => {
		if (child.nodeType === Node.ELEMENT_NODE) {
			if (child.nodeName === "xsl:variable") {
				bindXslVariable(context, child, vars);
				return;
			}
			if (child.nodeName === "xsl:param") {
				let name = child.getAttribute("name");
				if (!name) return;
				if (vars[name] !== undefined) return;

				let select = child.getAttribute("select");
				if (select != null && String(select).trim() !== "") {
					let expanded = expandXPathVariables(String(select).trim(), vars);
					let num = evaluateNumber(context, expanded);
					if (num !== undefined && !Number.isNaN(num)) {
						vars[name] = { kind: "number", n: num };
					} else {
						vars[name] = { kind: "string", s: evaluateString(context, expanded) };
					}
				} else {
					vars[name] = { kind: "string", s: child.textContent || "" };
				}
				return;
			}
			if (child.nodeName === "xsl:attribute") {
				// xsl:attribute creates/overwrites attributes on the *current output element*.
				applyXslAttributeNodeToElement(context, fragment, child, vars);
				return;
			}
		}

		// Literal result text/comments should flow into the output element,
		// but ignore stylesheet formatting whitespace.
		if (child.nodeType === Node.TEXT_NODE) {
			let t = child.textContent || "";
			if (/^\s*$/.test(t)) return;
		}
		fragment.appendChild(xmlNodes(context, child, vars));
	});
}

function getXsltTemplates(xslNode) {
	let doc = xslNode.ownerDocument;
	return Array.from(doc.getElementsByTagNameNS(XSL_NS, "template"));
}

function renderTemplateBody(contextNode, templateNode, fragment, vars) {
	let scope = Object.assign({}, vars || {});
	processXslChildNodes(contextNode, templateNode.childNodes, fragment, scope);
}

function invokeNamedTemplate(contextNode, callTemplateNode, fragment, vars) {
	let name = callTemplateNode.getAttribute("name");
	if (!name) return;

	let templates = getXsltTemplates(callTemplateNode);
	let templateNode = null;
	for (let t of templates) {
		if (t.getAttribute("name") === name) {
			templateNode = t;
			break;
		}
	}
	if (!templateNode) return;

	let scope = Object.assign({}, vars || {});
	let children = Array.from(callTemplateNode.childNodes);
	children.forEach((child) => {
		if (child.nodeType !== Node.ELEMENT_NODE) return;
		if (child.nodeName !== "xsl:with-param") return;
		let paramName = child.getAttribute("name");
		if (!paramName) return;
		let select = child.getAttribute("select");
		if (select == null || String(select).trim() === "") return;

		let expanded = expandXPathVariables(String(select).trim(), vars || {});
		expanded = expandXPathForEachContextFunctions(expanded, vars || {});

		let num = evaluateNumber(contextNode, expanded);
		if (num !== undefined && !Number.isNaN(num)) {
			scope[paramName] = { kind: "number", n: num };
		} else {
			scope[paramName] = { kind: "string", s: evaluateString(contextNode, expanded) };
		}
	});

	renderTemplateBody(contextNode, templateNode, fragment, scope);
}

function invokeMatchingTemplate(contextNode, xslNode, fragment, vars) {
	let templates = getXsltTemplates(xslNode);
	let doc = contextNode.nodeType === Node.DOCUMENT_NODE ? contextNode : contextNode.ownerDocument;

	for (let t of templates) {
		let matchExpr = t.getAttribute("match");
		if (!matchExpr) continue;

		let matches = doc.selectNodes(matchExpr);
		for (let m of matches) {
			if (m === contextNode) {
				renderTemplateBody(contextNode, t, fragment, vars);
				return;
			}
		}
	}
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
		case "xsl:apply-imports": break; // skipped
		case "xsl:apply-templates": {
			let select = xslNode.getAttribute("select");
			if (select == null || String(select).trim() === "") select = ".";

			let expandedSelect = expandXPathVariables(String(select).trim(), v);
			expandedSelect = expandXPathForEachContextFunctions(expandedSelect, v);

			let nodes = context.selectNodes(expandedSelect);
			for (let n of nodes) {
				invokeMatchingTemplate(n, xslNode, fragment, v);
			}
			break;
		}
		case "xsl:attribute": break; // handled in xsl:stylesheet
		case "xsl:attribute-set": break;
		case "xsl:call-template":
			invokeNamedTemplate(context, xslNode, fragment, v);
			break;
		case "xsl:comment": {
			let select = xslNode.getAttribute("select");
			if (select != null && String(select).trim() !== "") {
				let valueExpr = String(select).trim();
				valueExpr = expandXPathVariables(valueExpr, v);
				valueExpr = expandXPathForEachContextFunctions(valueExpr, v);
				let value = xsltFunctions(context, valueExpr, v);
				fragment.appendChild(document.createComment(String(value || "")));
				break;
			}

			let tmpFragment = document.createDocumentFragment();
			processXslChildNodes(context, xslNode.childNodes, tmpFragment, v);
			let body = (tmpFragment.textContent || "").replace(/\s+/g, " ").trim();
			fragment.appendChild(document.createComment(body));
			break;
		}
		case "xsl:copy":
			if (context && context.cloneNode) {
				fragment.appendChild(context.cloneNode(true));
			}
			break;
		case "xsl:copy-of": {
			let select = xslNode.getAttribute("select");
			if (select == null || String(select).trim() === "") break;
			let expandedSelect = expandXPathVariables(String(select).trim(), v);
			expandedSelect = expandXPathForEachContextFunctions(expandedSelect, v);

			let nodes = [];
			try {
				if (context && typeof context.selectNodes === "function") {
					nodes = context.selectNodes(expandedSelect);
				} else if (context && context.ownerDocument && typeof context.ownerDocument.selectNodes === "function") {
					nodes = context.ownerDocument.selectNodes(expandedSelect, context);
				}
			} catch (_) {
				// If select doesn't yield a node-set, ignore (real XSLT is more strict).
			}

			for (let node of nodes) {
				fragment.appendChild(node.cloneNode(true));
			}
			break;
		}
		case "xsl:decimal-format": break; // handled in xsl:stylesheet
		case "xsl:element": break; // skipped
		case "xsl:fallback": break; // skipped
		case "xsl:choose": {
			let matched = false;
			let otherwiseNode = null;
			Array.from(xslNode.childNodes).forEach((child) => {
				if (matched) return;
				if (child.nodeType !== Node.ELEMENT_NODE) return;

				if (child.nodeName === "xsl:when") {
					let test = child.getAttribute("test");
					if (test == null) return;
					let expandedTest = expandXPathVariables(String(test).trim(), v);
					expandedTest = expandXPathForEachContextFunctions(expandedTest, v);
					if (evaluateBoolean(context, expandedTest)) {
						let branchScope = Object.assign({}, v);
						processXslChildNodes(context, child.childNodes, fragment, branchScope);
						matched = true;
					}
					return;
				}

				if (child.nodeName === "xsl:otherwise") {
					otherwiseNode = child;
				}
			});

			if (!matched && otherwiseNode) {
				let branchScope = Object.assign({}, v);
				processXslChildNodes(context, otherwiseNode.childNodes, fragment, branchScope);
			}

			break;
		}
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
		case "xsl:import": break; // handled in xsl:stylesheet
		case "xsl:include": break; // handled in xsl:stylesheet
		case "xsl:key": break; // handled in xsl:stylesheet
		case "xsl:message": break; // skipped
		case "xsl:namespace-alias": break; // skipped
		case "xsl:number": {
			// Minimal XSLT 1.0 support: default level="single" with numeric formatting.
			let num;
			if (v && v.__position !== undefined) {
				num = Number(v.__position);
			} else if (context && context.parentNode) {
				let count = 0;
				let n = context;
				while (n && n.previousSibling) {
					n = n.previousSibling;
					if (n.nodeType === Node.ELEMENT_NODE && n.nodeName === context.nodeName) count++;
				}
				num = count + 1;
			} else {
				num = 1;
			}
			let format = xslNode.getAttribute("format") || "1";
			if (format === "1") {
				fragment.appendChild(document.createTextNode(String(num)));
			} else {
				fragment.appendChild(document.createTextNode(String(num)));
			}
			break;
		}
		case "xsl:otherwise": break; // handled in xsl:choose
		case "xsl:output": break; // handled in xsl:stylesheet
		case "xsl:param": break; // handled in xsl:stylesheet
		case "xsl:preserve-space": break; // handled in xsl:stylesheet
		case "xsl:processing-instruction": break;
		case "xsl:sort": break; // handled in xsl:for-each
		case "xsl:strip-space": break; // handled in xsl:stylesheet
		case "xsl:stylesheet": {
			// Allow stylesheet node to act as an entry point by executing its
			// match-based templates against the current source context.
			Array.from(xslNode.childNodes).forEach((child) => {
				if (child.nodeType !== Node.ELEMENT_NODE) return;
				if (child.nodeName !== "xsl:template") return;
				let match = child.getAttribute("match");
				if (!match) return;

				context.selectNodes(match).forEach((node) => {
					let scope = Object.assign({}, v);
					processXslChildNodes(node, child.childNodes, fragment, scope);
				});
			});
			break;
		}
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
		case "xsl:transform": break; // skipped
		case "xsl:value-of":
			value = xslNode.getAttribute("select").trim();
			result = xsltFunctions(context, value, v);
			fragment.appendChild(document.createTextNode(result));
			break;
		case "xsl:variable": break; // handled in xsl:stylesheet
		case "xsl:when": break; // handled in xsl:choose
		case "xsl:with-param": break; // handled in xsl:call-template
		default: {
			if (xslNode.namespaceURI === XSL_NS) break;
			let outEl = xslNode.namespaceURI
				? document.createElementNS(xslNode.namespaceURI, xslNode.nodeName)
				: document.createElement(xslNode.localName);
			Array.from(xslNode.attributes || []).forEach((attr) => {
				if (attr.name === "xmlns" || attr.name.startsWith("xmlns:")) return;
				if (attr.name === "use-attribute-sets") return;
				outEl.setAttribute(attr.name, attr.value);
			});
			applyUseAttributeSets(context, outEl, xslNode.getAttribute("use-attribute-sets"), v);
			processXslChildNodes(context, xslNode.childNodes, outEl, v);
			fragment.appendChild(outEl);
			break;
		}
	}
	return fragment;
}

export { xsltFunctions };
