import {
    evaluateBoolean,
    evaluateNumber,
    evaluateString,
    evaluateXslSelectBinding,
    expandXPathNodeSetVariables,
    expandXPathVariables,
    safeSelectNodes,
} from "./utils.js";

import { expandXPathForEachContextFunctions } from "./xslt/foreachContext.js";
import { handleForEach } from "./xslt/forEach.js";
import { appendDisableOutputEscaping } from "./xslt/markupSerialize.js";
import { xsltFunctions } from "./xslt/xsltFunctions.js";

const XSL_NS = "http://www.w3.org/1999/XSL/Transform";
const MATCH_LOOKUP_CACHE = new Map();

// For long-running apps: allow the host to fully clear internal caches.
// `importStylesheet()` is expected to be called rarely.
export function resetProXsltInternals() {
    MATCH_LOOKUP_CACHE.clear();
}

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
    // Collapse "; width" from indented stylesheet text to ";width" (matches XSLT output style).
    normalized = normalized.replace(/;\s+/g, ";");
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

export function bindXslVariableNode(context, el, vars, xmlNodes) {
    let name = el.getAttribute("name");
    if (!name) return;

    let select = el.getAttribute("select");
    if (select != null && String(select).trim() !== "") {
        let expanded = expandXPathNodeSetVariables(String(select).trim(), vars);
        expanded = expandXPathVariables(expanded, vars);
        expanded = expandXPathForEachContextFunctions(expanded, vars || {});
        vars[name] = evaluateXslSelectBinding(context, expanded);
        return;
    }

    // Variable content can contain XSL instructions (e.g. xsl:call-template).
    // Evaluate the body and store its text result.
    let tmpFragment = document.createDocumentFragment();
    processXslChildNodes(context, el.childNodes, tmpFragment, vars);
    vars[name] = { kind: "string", s: tmpFragment.textContent || "" };
}

function processXslChildNodes(context, childNodes, fragment, vars) {
    for (let i = 0; i < childNodes.length; i++) {
        let child = childNodes[i];
        if (child.nodeType === Node.ELEMENT_NODE) {
            if (child.nodeName === "xsl:variable") {
                bindXslVariableNode(context, child, vars, xmlNodes);
                continue;
            }
            if (child.nodeName === "xsl:param") {
                let name = child.getAttribute("name");
                if (!name) continue;
                if (vars[name] !== undefined) continue;

                let select = child.getAttribute("select");
                if (select != null && String(select).trim() !== "") {
                    let expanded = expandXPathVariables(String(select).trim(), vars);
                    expanded = expandXPathForEachContextFunctions(expanded, vars || {});
                    try {
                        let nodes = context.selectNodes(expanded);
                        if (nodes && nodes.length > 0) {
                            vars[name] = { kind: "nodeset", nodes };
                            continue;
                        }
                        vars[name] = { kind: "nodeset", nodes: [] };
                        continue;
                    } catch (_) {
                        // Not a node-set expression; fall through to number/string handling.
                    }
                    let num = evaluateNumber(context, expanded);
                    if (num !== undefined && !Number.isNaN(num)) vars[name] = { kind: "number", n: num };
                    else vars[name] = { kind: "string", s: evaluateString(context, expanded) };
                } else {
                    vars[name] = { kind: "string", s: child.textContent || "" };
                }
                continue;
            }
            if (child.nodeName === "xsl:attribute") {
                // xsl:attribute creates/overwrites attributes on the *current output element*.
                applyXslAttributeNodeToElement(context, fragment, child, vars);
                continue;
            }
            let consumed = consumeImplicitChooseIfAny(context, childNodes, i, fragment, vars);
            if (consumed > 0) {
                i += consumed - 1;
                continue;
            }
        }

        // Literal result text/comments should flow into the output element,
        // but ignore stylesheet formatting whitespace.
        if (child.nodeType === Node.TEXT_NODE) {
            let t = child.textContent || "";
            if (/^\s*$/.test(t)) continue;
        }
        fragment.appendChild(xmlNodes(context, child, vars));
    }
}

function isBareWhenOrOtherwise(node) {
    return (
        node &&
        node.nodeType === Node.ELEMENT_NODE &&
        (node.nodeName === "xsl:when" || node.nodeName === "xsl:otherwise")
    );
}

function isIgnorableStylesheetTextBetweenXslNodes(node) {
    return (
        node &&
        node.nodeType === Node.TEXT_NODE &&
        /^\s*$/.test(node.textContent || "")
    );
}

function implicitChooseRunSpan(childNodes, startIdx) {
    if (!isBareWhenOrOtherwise(childNodes[startIdx])) return 0;
    let j = startIdx;
    while (j < childNodes.length) {
        if (isBareWhenOrOtherwise(childNodes[j])) {
            j++;
            continue;
        }
        if (isIgnorableStylesheetTextBetweenXslNodes(childNodes[j])) {
            j++;
            continue;
        }
        break;
    }
    return j - startIdx;
}

/** First element or non–whitespace-only text after childNodes[idx] (exclusive start at idx). */
function firstSignificantNodeFromIndex(childNodes, idx) {
    for (let j = idx; j < childNodes.length; j++) {
        let n = childNodes[j];
        if (n.nodeType === Node.TEXT_NODE) {
            if (/^\s*$/.test(n.textContent || "")) continue;
            return { node: n, index: j };
        }
        if (n.nodeType === Node.ELEMENT_NODE) return { node: n, index: j };
    }
    return null;
}

function collectChooseBranches(root, startIdx, span) {
    let branches = [];
    let end = span != null ? startIdx + span : root.childNodes.length;
    for (let k = startIdx; k < end; k++) {
        let n = span != null ? root[k] : root.childNodes[k];
        if (!n || n.nodeType !== Node.ELEMENT_NODE) continue;
        if (n.nodeName === "xsl:when") branches.push({ kind: "when", node: n });
        else if (n.nodeName === "xsl:otherwise") branches.push({ kind: "otherwise", node: n });
    }
    return branches;
}

/** Attribute names compared in bare xsl:when tests (e.g. @type = 'select'). */
function attributesTestedByWhenBranches(branches) {
    let attrs = new Set();
    let re = /@([A-Za-z_][\w.\-:]*)\s*[=!\[]/g;
    for (let i = 0; i < branches.length; i++) {
        if (branches[i].kind !== "when") continue;
        let test = branches[i].node.getAttribute("test") || "";
        let m;
        while ((m = re.exec(test))) attrs.add(m[1]);
    }
    return attrs;
}

function elementHasAllAttributes(el, attrs) {
    if (attrs.size === 0) return true;
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
    for (let name of attrs) {
        if (!el.hasAttribute(name)) return false;
    }
    return true;
}

function isOtherwiseOnlyChoose(chooseEl) {
    if (!chooseEl || chooseEl.nodeType !== Node.ELEMENT_NODE || chooseEl.nodeName !== "xsl:choose") {
        return false;
    }
    let whenCount = 0;
    let otherwiseCount = 0;
    for (let c = chooseEl.firstChild; c; c = c.nextSibling) {
        if (c.nodeType !== Node.ELEMENT_NODE) continue;
        if (c.nodeName === "xsl:when") whenCount++;
        else if (c.nodeName === "xsl:otherwise") otherwiseCount++;
        else return false;
    }
    return whenCount === 0 && otherwiseCount > 0;
}

function executeChooseBranches(context, fragment, v, branches) {
    let matched = false;
    let otherwiseNode = null;
    for (let i = 0; i < branches.length; i++) {
        if (matched) break;
        let b = branches[i];
        if (b.kind === "when") {
            let test = b.node.getAttribute("test");
            if (test == null) continue;
            let expandedTest = expandXPathVariables(String(test).trim(), v);
            expandedTest = expandXPathForEachContextFunctions(expandedTest, v || {});
            expandedTest = expandXsltFunctionCallsInTest(expandedTest, context, v);
            expandedTest = expandNameFunctions(expandedTest, context);
            expandedTest = rewriteNotEqualsForJsdom(expandedTest);
            if (evaluateBoolean(context, expandedTest)) {
                let branchScope = childScope(v);
                processXslChildNodes(context, b.node.childNodes, fragment, branchScope);
                matched = true;
            }
        } else {
            otherwiseNode = b.node;
        }
    }
    if (!matched && otherwiseNode) {
        let branchScope = childScope(v);
        processXslChildNodes(context, otherwiseNode.childNodes, fragment, branchScope);
    }
    return matched;
}

function consumeImplicitChooseIfAny(context, childNodes, startIdx, fragment, vars) {
    let span = implicitChooseRunSpan(childNodes, startIdx);
    if (span === 0) return 0;
    let branches = collectChooseBranches(childNodes, startIdx, span);
    let matched = executeChooseBranches(context, fragment, vars, branches);
    let consumed = span;
    let sig = firstSignificantNodeFromIndex(childNodes, startIdx + span);
    if (sig && isOtherwiseOnlyChoose(sig.node)) {
        let testedAttrs = attributesTestedByWhenBranches(branches);
        if (!matched && elementHasAllAttributes(context, testedAttrs)) {
            executeChooseBranches(context, fragment, vars, collectChooseBranches(sig.node, 0, null));
        }
        consumed = sig.index - startIdx + 1;
    }
    return consumed;
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

function splitTopLevelLogical(expr, opWord) {
    let s = String(expr || "");
    let parts = [];
    let depth = 0;
    let quote = null;
    let start = 0;
    let needle = " " + opWord + " ";
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
        if (depth === 0 && s.slice(i, i + needle.length).toLowerCase() === needle) {
            parts.push(s.slice(start, i));
            start = i + needle.length;
            i += needle.length - 1;
        }
    }
    parts.push(s.slice(start));
    return parts.map((p) => p.trim()).filter(Boolean);
}

function rewriteNotEqualsForJsdom(expr) {
    // Work around jsdom XPath bug with "!=" in some cases (notably involving name()).
    // Rewrites: A != B  =>  not(A = B) at top-level within each AND/OR term.
    let orTerms = splitTopLevelLogical(expr, "or");
    let rewrittenOr = orTerms.map((orTerm) => {
        let andTerms = splitTopLevelLogical(orTerm, "and");
        let rewrittenAnd = andTerms.map((t) => {
            // Only rewrite a single top-level != per term (sufficient for our use).
            let s = t;
            let depth = 0;
            let quote = null;
            for (let i = 0; i < s.length - 1; i++) {
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
                if (depth === 0 && s[i] === "!" && s[i + 1] === "=") {
                    let lhs = s.slice(0, i).trim();
                    let rhs = s.slice(i + 2).trim();
                    return `not(${lhs} = ${rhs})`;
                }
            }
            return t.trim();
        });
        return rewrittenAnd.length > 1 ? rewrittenAnd.join(" and ") : rewrittenAnd[0] || "";
    });
    return rewrittenOr.length > 1 ? rewrittenOr.join(" or ") : rewrittenOr[0] || "";
}

function expandNameFunctions(expr, contextNode) {
    // jsdom's XPath implementation is buggy when comparing name() results.
    // Replace name(<xpath>) with a string literal of the selected node's name.
    let s = String(expr || "");
    let out = "";
    let i = 0;
    let inSingle = false;
    let inDouble = false;
    while (i < s.length) {
        let c = s[i];
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

        if (!inSingle && !inDouble && s.slice(i, i + 5).toLowerCase() === "name(") {
            let j = i + 5;
            let depth = 1;
            let q = null;
            while (j < s.length) {
                let ch = s[j];
                if (q) {
                    if (ch === q) q = null;
                    j++;
                    continue;
                }
                if (ch === "'" || ch === '"') {
                    q = ch;
                    j++;
                    continue;
                }
                if (ch === "(") depth++;
                else if (ch === ")") {
                    depth--;
                    if (depth === 0) break;
                }
                j++;
            }
            if (j < s.length && s[j] === ")") {
                let inner = s.slice(i + 5, j).trim();
                let nodeName = "";
                try {
                    // name() with no argument is the context node's name (XPath 1.0).
                    let n;
                    if (!inner || inner === "." || inner === "self::node()") {
                        n = contextNode;
                    } else if (contextNode && typeof contextNode.selectSingleNode === "function") {
                        n = contextNode.selectSingleNode(inner);
                    }
                    nodeName = n ? (n.nodeName || n.localName || "") : "";
                } catch (_) {
                    nodeName = "";
                }
                out += "'" + String(nodeName).replace(/'/g, "''") + "'";
                i = j + 1;
                continue;
            }
        }

        out += c;
        i++;
    }
    return out;
}

function xpathStringLiteral(s) {
    return "'" + String(s ?? "").replace(/'/g, "''") + "'";
}

function expandXsltFunctionCallsInTest(expr, contextNode, vars) {
    // jsdom's XPath doesn't implement XSLT-only functions like format-number().
    // Replace supported function calls with string literals of their evaluated results.
    let s = String(expr || "");
    let out = "";
    let i = 0;
    let inSingle = false;
    let inDouble = false;
    while (i < s.length) {
        let c = s[i];
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
        if (inSingle || inDouble) {
            out += c;
            i++;
            continue;
        }

        // Match a function name start.
        let m = /^([A-Za-z_][\w.\-:]*)\s*\(/.exec(s.slice(i));
        if (!m) {
            out += c;
            i++;
            continue;
        }

        let fnName = m[1].toLowerCase();
        // Only expand functions that are implemented by our xsltFunctions layer and are
        // commonly used in test expressions. (Avoid rewriting arbitrary XPath functions.)
        if (fnName !== "format-number" && fnName !== "generate-id" && fnName !== "key") {
            out += c;
            i++;
            continue;
        }

        let start = i;
        let j = i + m[0].length; // position right after '('
        let depth = 1;
        let q = null;
        while (j < s.length) {
            let ch = s[j];
            if (q) {
                if (ch === q) q = null;
                j++;
                continue;
            }
            if (ch === "'" || ch === '"') {
                q = ch;
                j++;
                continue;
            }
            if (ch === "(") depth++;
            else if (ch === ")") {
                depth--;
                if (depth === 0) break;
            }
            j++;
        }
        if (j < s.length && s[j] === ")") {
            let rawCall = s.slice(start, j + 1);
            let value = "";
            try {
                value = xsltFunctions(contextNode, rawCall, vars || {});
            } catch (_) {
                value = "";
            }
            out += xpathStringLiteral(value);
            i = j + 1;
            continue;
        }

        // Unbalanced; fall back to char-by-char.
        out += c;
        i++;
    }
    return out;
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
    // XSLT current() is the template's context node (not necessarily "." inside predicates).
    scope.__current = contextNode;
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
    for (let child = callTemplateNode.firstChild; child; child = child.nextSibling) {
        if (child.nodeType !== Node.ELEMENT_NODE) continue;
        if (child.nodeName !== "xsl:with-param") continue;
        let paramName = child.getAttribute("name");
        if (!paramName) continue;
        let select = child.getAttribute("select");
        if (select == null || String(select).trim() === "") continue;

        // Match variable select expansion (evaluateXslSelectBinding) but omit
        // expandXPathNodeSetVariables here: it can rewrite $param/.. paths used by
        // recursive templates in ways that break termination.
        let expanded = expandXPathVariables(String(select).trim(), vars || {});
        expanded = expandXPathForEachContextFunctions(expanded, vars || {});
        scope[paramName] = evaluateXslSelectBinding(contextNode, expanded);
    }

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
            matches = safeSelectNodes(doc, lookupXpath);
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
        for (let child = contextNode.firstChild; child; child = child.nextSibling) {
            invokeMatchingTemplate(child, xslNode, fragment, vars);
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
        case "xsl:template": {
            // Defensive behavior: if a template node appears *inside* an executed template,
            // treat it as a container and execute its children. (This is non-standard XSLT,
            // but some inputs/tests rely on it.)
            let scope = childScope(vars || {});
            processXslChildNodes(context, xslNode.childNodes, fragment, scope);
            break;
        }
        case "xsl:apply-templates": {
            let select = xslNode.getAttribute("select");
            if (select == null || String(select).trim() === "") select = "child::node()";

            let expandedSelect = expandXPathVariables(String(select).trim(), v);
            expandedSelect = expandXPathForEachContextFunctions(expandedSelect, v);
            if (expandedSelect === "child::node()" || expandedSelect === "node()") {
                let cn = context.childNodes || [];
                for (let i = 0; i < cn.length; i++) invokeMatchingTemplate(cn[i], xslNode, fragment, v);
            } else if (expandedSelect === "text()") {
                let cn = context.childNodes || [];
                for (let i = 0; i < cn.length; i++) {
                    let n = cn[i];
                    if (n.nodeType === Node.TEXT_NODE) invokeMatchingTemplate(n, xslNode, fragment, v);
                }
            } else if (/^[A-Za-z_][\w.\-:]*$/.test(expandedSelect)) {
                let cn = context.childNodes || [];
                for (let i = 0; i < cn.length; i++) {
                    let n = cn[i];
                    if (n.nodeType !== Node.ELEMENT_NODE) continue;
                    if (n.nodeName === expandedSelect || n.localName === expandedSelect) invokeMatchingTemplate(n, xslNode, fragment, v);
                }
            } else {
                let nodes = context.selectNodes(expandedSelect);
                for (let n of nodes) {
                    invokeMatchingTemplate(n, xslNode, fragment, v);
                }
            }
            break;
        }
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
        case "xsl:choose":
            executeChooseBranches(context, fragment, v, collectChooseBranches(xslNode, 0, null));
            break;
        case "xsl:for-each":
            handleForEach(context, xslNode, fragment, v, xmlNodes, (ctx, varNode, scope) => {
                bindXslVariableNode(ctx, varNode, scope, xmlNodes);
            }, consumeImplicitChooseIfAny);
            break;
        case "xsl:if": {
            let test = xslNode.getAttribute("test");
            if (test == null || String(test).trim() === "") break;
            let expandedTest = expandXPathVariables(String(test).trim(), v);
            expandedTest = expandXPathForEachContextFunctions(expandedTest, v);
            expandedTest = expandXsltFunctionCallsInTest(expandedTest, context, v);
            expandedTest = expandNameFunctions(expandedTest, context);
            expandedTest = rewriteNotEqualsForJsdom(expandedTest);
            if (evaluateBoolean(context, expandedTest)) {
                processXslChildNodes(context, xslNode.childNodes, fragment, v);
            }
            break;
        }
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
        case "xsl:text":
            fragment.appendChild(
                document.createTextNode(xslNode.textContent)
            );
            break;
        case "xsl:value-of":
            value = xslNode.getAttribute("select").trim();
            result = xsltFunctions(context, value, v);
            if ((xslNode.getAttribute("disable-output-escaping") || "").toLowerCase() === "yes") {
                appendDisableOutputEscaping(fragment, result);
            } else {
                fragment.appendChild(document.createTextNode(String(result ?? "")));
            }
            break;
        default: {
            if (xslNode.namespaceURI === XSL_NS) break;
            let outEl = xslNode.namespaceURI
                ? document.createElementNS(xslNode.namespaceURI, xslNode.nodeName)
                : document.createElement(xslNode.localName);
            let attrs = xslNode.attributes;
            if (attrs) {
                for (let ai = 0; ai < attrs.length; ai++) {
                    let attr = attrs[ai];
                    if (attr.name === "xmlns" || attr.name.startsWith("xmlns:")) continue;
                    if (attr.name === "use-attribute-sets") continue;
                    outEl.setAttribute(attr.name, attr.value);
                }
            }
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

function normalizeTemplateMatch(m) {
    return String(m || "")
        .trim()
        .replace(/\s+/g, " ");
}

/**
 * Entry template: prefer match="/" (first in document order) so xsl:include can add
 * helpers before the main rule; otherwise first template whose match is not text().
 * Any other pattern (/foo, //bar, multi-step) is allowed in that second pass.
 */
function findRootTemplate(xslDoc) {
    let templates = xslDoc.selectNodes("//xsl:template[@match]");
    for (let t of templates) {
        if (normalizeTemplateMatch(t.getAttribute("match") || "") === "/") return t;
    }
    for (let t of templates) {
        let m = normalizeTemplateMatch(t.getAttribute("match") || "");
        if (m === "" || m === "text()") continue;
        return t;
    }
    return null;
}

/**
 * XSLT processing entry: run the chosen root template against nodes from its match
 * pattern; if no eligible template, apply built-in root rules.
 */
export function transformSourceToFragment(context, xslDoc, vars) {
    let fragment = document.createDocumentFragment();
    let refNode = xslDoc.selectSingleNode("//xsl:stylesheet") || xslDoc.documentElement;
    let rootTemplate = findRootTemplate(xslDoc);
    if (rootTemplate) {
        let rootMatch = normalizeTemplateMatch(rootTemplate.getAttribute("match") || "");
        // Always resolve the entry nodes by evaluating the match XPath from the document root,
        // even if the caller passed an element node as `context`.
        let doc = context.nodeType === Node.DOCUMENT_NODE ? context : context.ownerDocument;
        let rootNodes = safeSelectNodes(doc, rootMatch, doc);
        // Only execute the root template on *top-most* matches. This prevents double-processing
        // nested matches when the entry match is broad (e.g. //message with nested <message>).
        let rootSet = new Set(rootNodes);
        rootNodes.forEach((rn) => {
            let skip = false;
            for (let p = rn && rn.parentNode; p; p = p.parentNode) {
                if (rootSet.has(p)) {
                    skip = true;
                    break;
                }
            }
            if (!skip) renderTemplateBody(rn, rootTemplate, fragment, vars);
        });
    } else {
        // If there are no match-based templates, fall back to the first named template.
        let namedTemplate = xslDoc.selectSingleNode("//xsl:template[@name]");
        if (namedTemplate) {
            let start = context.nodeType === Node.DOCUMENT_NODE ? context.documentElement : context;
            // Heuristic: if the document is wrapped in single-child element layers,
            // descend to the first node with multiple element children.
            while (start && start.nodeType === Node.ELEMENT_NODE) {
                let onlyEl = null;
                let count = 0;
                for (let c = start.firstChild; c; c = c.nextSibling) {
                    if (c.nodeType !== Node.ELEMENT_NODE) continue;
                    count++;
                    if (count > 1) break;
                    onlyEl = c;
                }
                if (count === 1 && onlyEl) start = onlyEl;
                else break;
            }
            renderTemplateBody(start, namedTemplate, fragment, vars);
            return fragment;
        }
        if (context.nodeType === Node.DOCUMENT_NODE) {
            for (let n = context.firstChild; n; n = n.nextSibling) {
                invokeMatchingTemplate(n, refNode, fragment, vars);
            }
        } else {
            invokeMatchingTemplate(context, refNode, fragment, vars);
        }
    }
    return fragment;
}

export { xsltFunctions };

