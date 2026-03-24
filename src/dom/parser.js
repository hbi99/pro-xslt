import {
	evaluateBoolean,
	evaluateNumber,
	evaluateString,
	expandXPathNodeSetVariables,
	expandXPathVariables,
} from "./utils.js";

import { bindXslVariable } from "./xslt/variables.js";
import { expandXPathForEachContextFunctions } from "./xslt/foreachContext.js";
import { handleForEach } from "./xslt/forEach.js";
import { xsltFunctions } from "./xslt/xsltFunctions.js";

const XSL_NS = "http://www.w3.org/1999/XSL/Transform";
const MATCH_LOOKUP_CACHE = new Map();

function childScope(vars) {
	return Object.create(vars || null);
}

function applyXslAttributeNodeToElement(context, outEl, attrNode, vars) {
	let target = outEl;
	if (!target || target.nodeType !== Node.ELEMENT_NODE) {
		target = vars && vars.__lreParent;
	}
	if (!target || target.nodeType !== Node.ELEMENT_NODE) return;
	let attrName = attrNode.getAttribute("name");
	if (attrName == null || String(attrName).trim() === "") return;

	let select = attrNode.getAttribute("select");
	if (select != null && String(select).trim() !== "") {
		let valueExpr = String(select).trim();
		valueExpr = expandXPathVariables(valueExpr, vars);
		valueExpr = expandXPathForEachContextFunctions(valueExpr, vars);
		let attrValue = xsltFunctions(context, valueExpr, vars);
		target.setAttribute(attrName, attrValue);
		return;
	}

	let tmpFragment = document.createDocumentFragment();
	processXslChildNodes(context, attrNode.childNodes, tmpFragment, vars);
	let normalized = (tmpFragment.textContent || "").replace(/\s+/g, " ").trim();
	target.setAttribute(attrName, normalized);
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
	if (!doc.__proXsltTemplateNodes) {
		doc.__proXsltTemplateNodes = Array.from(doc.getElementsByTagNameNS(XSL_NS, "template"));
	}
	return doc.__proXsltTemplateNodes;
}

function getTemplateMatchers(xslNode) {
	let doc = xslNode.ownerDocument;
	if (!doc.__proXsltTemplateMatchers) {
		doc.__proXsltTemplateMatchers = getXsltTemplates(xslNode)
			.map((t) => {
				let matchExpr = t.getAttribute("match");
				if (!matchExpr) return null;
				return {
					template: t,
					lookupXpath: matchPatternToLookupXPath(matchExpr),
				};
			})
			.filter(Boolean);
	}
	return doc.__proXsltTemplateMatchers;
}

/**
 * Split an XSLT pattern on top-level | (union), ignoring | inside [], (), or quotes.
 */
function splitTopLevelPatternUnion(pattern) {
	let s = pattern.trim();
	if (!s) return [];
	let parts = [];
	let depth = 0;
	let quote = null;
	let start = 0;
	for (let i = 0; i < s.length; i++) {
		let c = s[i];
		if (quote) {
			if (c === quote) quote = null;
			continue;
		}
		if (c === '"' || c === "'") {
			quote = c;
			continue;
		}
		if (c === "[" || c === "(") depth++;
		else if (c === "]" || c === ")") depth--;
		else if (c === "|" && depth === 0) {
			parts.push(s.slice(start, i).trim());
			start = i + 1;
		}
	}
	parts.push(s.slice(start).trim());
	return parts.filter(Boolean);
}

/**
 * Map a match pattern to an XPath node-set over the source document so
 * doc.selectNodes(...) finds the same nodes as pattern matching (e.g. text() → //text()).
 */
function matchPatternToLookupXPath(matchExpr) {
	if (MATCH_LOOKUP_CACHE.has(matchExpr)) return MATCH_LOOKUP_CACHE.get(matchExpr);
	let s = matchExpr.trim();
	if (!s) {
		MATCH_LOOKUP_CACHE.set(matchExpr, "//*[not(self::*)]");
		return "//*[not(self::*)]";
	}
	let branches = splitTopLevelPatternUnion(s);
	let lookup = branches
		.map((p) => {
			if (p.startsWith("/")) return p;
			return "//" + p;
		})
		.join(" | ");
	MATCH_LOOKUP_CACHE.set(matchExpr, lookup);
	return lookup;
}

function renderTemplateBody(contextNode, templateNode, fragment, vars) {
	let scope = childScope(vars);
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

	let scope = childScope(vars);
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
	let templates = getTemplateMatchers(xslNode);
	let doc = contextNode.nodeType === Node.DOCUMENT_NODE ? contextNode : contextNode.ownerDocument;
	let matchNodeSetCache = (vars && vars.__matchNodeSetCache) || null;

	for (let tm of templates) {
		let lookupXpath = tm.lookupXpath;
		let matches = matchNodeSetCache && matchNodeSetCache[lookupXpath];
		if (!matches) {
			matches = doc.selectNodes(lookupXpath);
			if (matchNodeSetCache) matchNodeSetCache[lookupXpath] = matches;
		}
		for (let m of matches) {
			if (m === contextNode) {
				renderTemplateBody(contextNode, tm.template, fragment, vars);
				return;
			}
		}
	}

	// XSLT 1.0 built-in template rules when no template matches.
	if (contextNode.nodeType === Node.TEXT_NODE) {
		fragment.appendChild(document.createTextNode(contextNode.textContent));
		return;
	}
	if (contextNode.nodeType === Node.ELEMENT_NODE || contextNode.nodeType === Node.DOCUMENT_NODE) {
		Array.from(contextNode.childNodes).forEach((child) => {
			invokeMatchingTemplate(child, xslNode, fragment, vars);
		});
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
			if (select == null || String(select).trim() === "") select = "child::node()";

			let expandedSelect = expandXPathVariables(String(select).trim(), v);
			expandedSelect = expandXPathForEachContextFunctions(expandedSelect, v);
			let nodes;
			if (expandedSelect === "child::node()" || expandedSelect === "node()") {
				nodes = Array.from(context.childNodes || []);
			} else if (expandedSelect === "text()") {
				nodes = Array.from(context.childNodes || []).filter((n) => n.nodeType === Node.TEXT_NODE);
			} else if (/^[A-Za-z_][\w.\-:]*$/.test(expandedSelect)) {
				nodes = Array.from(context.childNodes || []).filter((n) => {
					return n.nodeType === Node.ELEMENT_NODE && (n.nodeName === expandedSelect || n.localName === expandedSelect);
				});
			} else {
				nodes = context.selectNodes(expandedSelect);
			}
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
					let expandedTest = expandXPathNodeSetVariables(String(test).trim(), v);
					expandedTest = expandXPathVariables(expandedTest, v);
					expandedTest = expandXPathForEachContextFunctions(expandedTest, v);
					if (evaluateBoolean(context, expandedTest)) {
						let branchScope = childScope(v);
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
				let branchScope = childScope(v);
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
			let expandedTest = expandXPathNodeSetVariables(String(test).trim(), v);
			expandedTest = expandXPathVariables(expandedTest, v);
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
					let scope = childScope(v);
					processXslChildNodes(node, child.childNodes, fragment, scope);
				});
			});
			break;
		}
		case "xsl:template":
			context.selectNodes(xslNode.getAttribute("match"))
				.map(node => {
					let scope = childScope(v);
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
			let lreScope = childScope(v);
			lreScope.__lreParent = outEl;
			processXslChildNodes(context, xslNode.childNodes, outEl, lreScope);
			fragment.appendChild(outEl);
			break;
		}
	}
	return fragment;
}

/**
 * XSLT processing entry: use match="/" if present; otherwise apply built-in root rule
 * (process document children with template matching). This avoids using the first
 * xsl:template in document order (e.g. match="text()") as the transformation entry.
 */
export function transformSourceToFragment(context, xslDoc, vars) {
	let fragment = document.createDocumentFragment();
	let refNode = xslDoc.selectSingleNode("//xsl:stylesheet") || xslDoc.documentElement;
	let rootTemplate = xslDoc.selectSingleNode("//xsl:template[@match='/']");
	if (rootTemplate) {
		let rootNodes =
			context.nodeType === Node.DOCUMENT_NODE
				? context.selectNodes("/")
				: [context];
		rootNodes.forEach((rn) => {
			renderTemplateBody(rn, rootTemplate, fragment, vars);
		});
	} else {
		let startNodes =
			context.nodeType === Node.DOCUMENT_NODE
				? Array.from(context.childNodes)
				: [context];
		startNodes.forEach((n) => {
			invokeMatchingTemplate(n, refNode, fragment, vars);
		});
	}
	return fragment;
}

export { xsltFunctions };
