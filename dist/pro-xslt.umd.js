/*!
  * pro-xslt v0.7.3
  * https://github.com/hbi99/pro-xslt
  */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ProXslt = factory());
})(this, (function () { 'use strict';

    /*
     * Exported Functions
     */
    function selectNodes(xpath, xnode) {
        if (!xnode) xnode = this;
        let ns = this.createNSResolver(this.documentElement),
            qI = this.evaluate(xpath, xnode, ns, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null),
            res = [],
            len = qI.snapshotLength;
        while (len--) res[len] = qI.snapshotItem(len);
        return res;
    }
    function selectSingleNode(xpath, xnode) {
        if(!xnode) xnode = this;
        let xI = this.selectNodes(xpath, xnode);
        return (xI.length > 0)? xI[0] : null ;
    }
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

    function evaluate(xnode, xpath) {
        let r = evaluateWithType(xnode, xpath, XPathResult.NUMBER_TYPE);
        let n = r.numberValue;
        return Number.isNaN(n) ? undefined : n;
    }

    function evaluateString(xnode, xpath) {
        let r = evaluateWithType(xnode, xpath, XPathResult.STRING_TYPE);
        return r.stringValue;
    }

    function evaluateNumber(xnode, xpath) {
        let r = evaluateWithType(xnode, xpath, XPathResult.NUMBER_TYPE);
        let n = r.numberValue;
        return Number.isNaN(n) ? undefined : n;
    }

    function evaluateBoolean(xnode, xpath) {
        let r = evaluateWithType(xnode, xpath, XPathResult.BOOLEAN_TYPE);
        return r.booleanValue;
    }

    function generateId(context) {
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
     * Absolute XPath 1.0 location path for an element (e.g. /Monkey[1]/User[1]).
     */
    function elementToAbsoluteXPath(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;
        let parts = [];
        let current = el;
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let parent = current.parentNode;
            if (!parent) break;
            let name = current.nodeName;
            let siblings = [];
            for (let c = parent.firstChild; c; c = c.nextSibling) {
                if (c.nodeType === Node.ELEMENT_NODE && c.nodeName === name) siblings.push(c);
            }
            let index = siblings.indexOf(current) + 1;
            parts.unshift(name + "[" + index + "]");
            current = parent;
        }
        return "/" + parts.join("/");
    }

    /**
     * XPath expression denoting a node-set so it can be followed by / or @ (XPath 1.0).
     * Used for node-set variables and for XSLT current() when the evaluation context differs.
     */
    function nodesetToXPathLocationExpr(nodes) {
        if (!nodes || nodes.length === 0) return "/*[false()]";
        let paths = [];
        for (let n of nodes) {
            if (n.nodeType === Node.ELEMENT_NODE) {
                let p = elementToAbsoluteXPath(n);
                if (p) paths.push(p);
            } else if (n.nodeType === Node.ATTRIBUTE_NODE) {
                // Attribute nodes must resolve to parent element path + /@name (XPath 1.0).
                let owner = n.ownerElement;
                if (!owner) continue;
                let ep = elementToAbsoluteXPath(owner);
                if (ep) {
                    let an = n.localName || n.name;
                    paths.push(ep + "/@" + an);
                }
            }
        }
        if (paths.length === 0) return "/*[false()]";
        if (paths.length === 1) return paths[0];
        return "(" + paths.join("|") + ")";
    }

    /**
     * Turn a bound XSLT variable into an XPath token (number or quoted string).
     * @param {{ kind: 'number', n: number } | { kind: 'string', s: string } | { kind: 'nodeset', nodes: Node[] } | undefined} entry
     */
    function xpathVarToXPathLiteral(entry) {
        if (!entry) return "''";
        if (entry.kind === "number") return String(entry.n);
        if (entry.kind === "string") {
            return "'" + String(entry.s).replace(/'/g, "''") + "'";
        }
        if (entry.kind === "nodeset") {
            let first = entry.nodes && entry.nodes.length ? entry.nodes[0] : null;
            if (!first) return "''";
            if (first.nodeType === Node.ATTRIBUTE_NODE) {
                return "'" + String(first.value || "").replace(/'/g, "''") + "'";
            }
            return "'" + String(first.textContent || "").replace(/'/g, "''") + "'";
        }
        return "''";
    }

    /**
     * Replaces `$QName` references outside string literals. Keys are `name` attribute values (e.g. `x`, `pre:foo`).
     */
    function expandXPathVariables(expr, vars) {
        if (!expr || !vars) return expr;
        let keys = [];
        for (let k in vars) keys.push(k);
        keys.sort((a, b) => b.length - a.length);
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
                            after === "/" ||
                            after === "@" ||
                            /[\s\[\](),|+\-*/=<>!]/.test(after) ||
                            after === ")" ||
                            after === "]"
                        ) {
                            if (vars[k] !== undefined) {
                                let v = vars[k];
                                if (v && v.kind === "nodeset") {
                                    // Prefer emitting a node-set expression so it can be used in functions like name($n)
                                    // and in path contexts ($n/@id). XPath will coerce node-sets to string/number as needed.
                                    out += nodesetToXPathLocationExpr(v.nodes);
                                } else {
                                    out += xpathVarToXPathLiteral(v);
                                }
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
    function expandXPathNodeSetVariables(expr, vars) {
        if (!expr || !vars) return expr;
        let keys = [];
        for (let k in vars) keys.push(k);
        keys.sort((a, b) => b.length - a.length);
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

    function concatFromParsedArgs(context, args) {
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
    function stripXPathStringLiteral(arg) {
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
    function parseXsltFunctionCall(input) {
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

    function formatNumber(value, context, vars) {
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

    function expandXPathForEachContextFunctions(expr, vars) {
        let pos = vars && vars.__position;
        let last = vars && vars.__last;
        if (pos === undefined && last === undefined && expr.indexOf("current") === -1) return expr;

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
                let cur = /^current\s*\(\s*\)/.exec(expr.slice(i));
                if (cur) {
                    // current() is the for-each / template current node, not the inner predicate ".".
                    if (vars && vars.__current) {
                        out += nodesetToXPathLocationExpr([vars.__current]);
                    } else {
                        out += ".";
                    }
                    i += cur[0].length;
                    continue;
                }
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

    function xslSortElements(forEachNode) {
        let out = [];
        for (let child = forEachNode.firstChild; child; child = child.nextSibling) {
            if (child.nodeType === Node.ELEMENT_NODE && child.nodeName === "xsl:sort") {
                out.push(child);
            }
        }
        return out;
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

    function processForEachChildNodes(context, forEachNode, fragment, vars, xmlNodes, bindXslVariable) {
        for (let child = forEachNode.firstChild; child; child = child.nextSibling) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                if (child.nodeName === "xsl:sort") continue;
                if (child.nodeName === "xsl:variable") {
                    bindXslVariable(context, child, vars);
                    continue;
                }
            } else if (child.nodeType === Node.TEXT_NODE) {
                // Preserve literal result text inside xsl:for-each, but ignore formatting whitespace.
                let t = child.textContent || "";
                if (/^\s*$/.test(t)) continue;
            }
            fragment.appendChild(xmlNodes(context, child, vars));
        }
    }

    function handleForEach(context, xslNode, fragment, vars, xmlNodes, bindXslVariable) {
        let select = xslNode.getAttribute("select");
        if (select == null || String(select).trim() === "") return;

        let expandedSelect = expandXPathVariables(String(select).trim(), vars || {});
        let nodes = context.selectNodes(expandedSelect);
        let sortNodes = xslSortElements(xslNode);
        let sortedNodes = sortNodesForEach(nodes, sortNodes, vars || {});

        sortedNodes.forEach((node, idx) => {
            let scope = Object.create(vars || null);
            scope.__position = idx + 1;
            scope.__last = sortedNodes.length;
            scope.__current = node;
            processForEachChildNodes(node, xslNode, fragment, scope, xmlNodes, bindXslVariable);
        });
    }

    function ensureKeyContainers(vars) {
        if (!vars.__keys) vars.__keys = {};
        if (!vars.__keyBuiltNames) vars.__keyBuiltNames = {};
        if (!vars.__keyMatchCache) vars.__keyMatchCache = {};
    }

    function firstChildElementByName(node, name) {
        let children = node.childNodes || [];
        for (let i = 0; i < children.length; i++) {
            let c = children[i];
            if (c.nodeType !== Node.ELEMENT_NODE) continue;
            if (c.nodeName === name || c.localName === name) return c;
        }
        return null;
    }

    function buildUseAccessor(useExpr) {
        let use = String(useExpr || "").trim();

        let attrMatch = /^@([A-Za-z_][\w.\-:]*)$/.exec(use);
        if (attrMatch) {
            let attr = attrMatch[1];
            return (node) => node.getAttribute(attr) || "";
        }

        if (use === ".") {
            return (node) => node.textContent || "";
        }

        let childNameMatch = /^([A-Za-z_][\w.\-:]*)$/.exec(use);
        if (childNameMatch) {
            let childName = childNameMatch[1];
            return (node) => {
                let child = firstChildElementByName(node, childName);
                return child ? (child.textContent || "") : "";
            };
        }

        return (node) => evaluateString(node, use);
    }

    function buildKeyIndexByName(sourceDoc, xslDoc, vars, keyName) {
        ensureKeyContainers(vars);
        if (vars.__keyBuiltNames[keyName]) return;

        let defs = xslDoc.selectNodes(`//xsl:stylesheet/xsl:key[@name='${keyName}']`);
        let indexed = vars.__keys[keyName] || {};
        let matchCache = vars.__keyMatchCache;

        defs.forEach((def) => {
            let match = def.getAttribute("match");
            let use = def.getAttribute("use");
            if (!match || !use) return;
            let useAccessor = buildUseAccessor(use);

            let nodes = matchCache[match];
            if (!nodes) {
                nodes = sourceDoc.selectNodes(match);
                matchCache[match] = nodes;
            }
            nodes.forEach((node) => {
                let k = useAccessor(node);
                if (!indexed[k]) indexed[k] = [];
                indexed[k].push(node);
            });
        });

        vars.__keys[keyName] = indexed;
        vars.__keyBuiltNames[keyName] = true;
    }

    function resolveKey(vars, keyName, lookupValue) {
        if (!vars || !vars.__keys) return [];
        let keyMap = vars.__keys;
        let byName = keyMap[keyName];
        if (!byName) return [];
        return byName[lookupValue] || [];
    }

    function resolveNodeSetVariablePath(expr, vars) {
        if (!vars) return null;
        let m = /^\s*\$([A-Za-z_][\w.\-:]*)\s*(\/.*)?\s*$/.exec(expr);
        if (!m) return null;
        let entry = vars[m[1]];
        if (!entry || entry.kind !== "nodeset" || !entry.nodes || entry.nodes.length === 0) {
            return null;
        }
        let base = entry.nodes[0];
        let path = m[2];
        if (!path || String(path).trim() === "") return base.textContent || "";
        return evaluateString(base, "." + path);
    }

    function dispatchParsedXsltFunction(context, parsed) {
        let n = parsed.name.toLowerCase();
        let raw = parsed.raw;
        switch (n) {
            case "format-number":
                return formatNumber(
                    parsed.args.length >= 2 ? parsed.args : parsed.raw,
                    context,
                    parsed.vars
                );
            case "generate-id":
                return generateId(context);
            case "concat":
                return concatFromParsedArgs(context, parsed.args);
            case "key": {
                if (!parsed.args || parsed.args.length < 2) return "";
                let keyName = evaluateString(context, parsed.args[0]);
                let keyValue = evaluateString(context, parsed.args[1]);
                let vars = parsed.vars || {};
                if (vars.__sourceDoc && vars.__xslDoc && keyName) {
                    buildKeyIndexByName(vars.__sourceDoc, vars.__xslDoc, vars, keyName);
                }
                let nodes = resolveKey(parsed.vars, keyName, keyValue);
                if (!nodes || nodes.length === 0) return "";
                return nodes[0].textContent || "";
            }
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

    function xsltFunctions(context, value, vars) {
        let nodeSetValue = resolveNodeSetVariablePath(String(value), vars || {});
        if (nodeSetValue !== null) return nodeSetValue;

        let expanded = expandXPathVariables(String(value).trim(), vars || {});
        expanded = expandXPathForEachContextFunctions(expanded, vars || {});
        let parsed = parseXsltFunctionCall(expanded);
        if (parsed) {
            parsed.vars = vars || {};
            return dispatchParsedXsltFunction(context, parsed);
        }

        let result;
        switch (true) {
            case expanded.startsWith("format-number"):
                result = formatNumber(expanded, context, vars);
                break;
            case expanded.startsWith("generate-id"):
                result = generateId(context);
                break;
            default: {
                try {
                    let sn = context.selectSingleNode(expanded);
                    if (sn != null) {
                        if (sn.nodeType === Node.ATTRIBUTE_NODE) {
                            result = sn.value != null ? String(sn.value) : "";
                        } else {
                            result = sn.textContent;
                        }
                        break;
                    }
                } catch (_) {
                    /* not a location path (e.g. string literal `'yes'`) */
                }
                // Prefer numeric evaluation only after location-path resolution, because some
                // browser XPath engines can throw on NUMBER_TYPE evaluation of node-set results.
                let num = evaluate(context, expanded);
                if (num !== undefined && !Number.isNaN(num)) {
                    result = String(num);
                    break;
                }
                result = evaluateString(context, expanded);
                break;
            }
        }
        return result;
    }

    const XSL_NS = "http://www.w3.org/1999/XSL/Transform";
    const MATCH_LOOKUP_CACHE = new Map();

    // For long-running apps: allow the host to fully clear internal caches.
    // `importStylesheet()` is expected to be called rarely.
    function resetProXsltInternals() {
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

    function bindXslVariableNode(context, el, vars, xmlNodes) {
        let name = el.getAttribute("name");
        if (!name) return;

        let select = el.getAttribute("select");
        if (select != null && String(select).trim() !== "") {
            let expanded = expandXPathNodeSetVariables(String(select).trim(), vars);
            expanded = expandXPathVariables(expanded, vars);
            expanded = expandXPathForEachContextFunctions(expanded, vars || {});
            try {
                let nodes = context.selectNodes(expanded);
                if (nodes && nodes.length > 0) {
                    vars[name] = { kind: "nodeset", nodes };
                    return;
                }
                // Location path with no matches: XPath 1.0 empty node-set (not a number).
                vars[name] = { kind: "nodeset", nodes: [] };
                return;
            } catch (_) {
                // Not a node-set expression; fall through to number/string handling.
            }
            let num = evaluateNumber(context, expanded);
            if (num !== undefined && !Number.isNaN(num)) {
                vars[name] = { kind: "number", n: num };
            } else {
                vars[name] = { kind: "string", s: evaluateString(context, expanded) };
            }
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
                    bindXslVariableNode(context, child, vars);
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

            let expanded = expandXPathVariables(String(select).trim(), vars || {});
            expanded = expandXPathForEachContextFunctions(expanded, vars || {});

            try {
                let nodes = contextNode.selectNodes(expanded);
                if (nodes && nodes.length > 0) {
                    scope[paramName] = { kind: "nodeset", nodes };
                    continue;
                }
                scope[paramName] = { kind: "nodeset", nodes: [] };
                continue;
            } catch (_) {
                // Not a node-set expression; fall through.
            }

            let num = evaluateNumber(contextNode, expanded);
            if (num !== undefined && !Number.isNaN(num)) scope[paramName] = { kind: "number", n: num };
            else scope[paramName] = { kind: "string", s: evaluateString(contextNode, expanded) };
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
            for (let child = contextNode.firstChild; child; child = child.nextSibling) {
                invokeMatchingTemplate(child, xslNode, fragment, vars);
            }
        }
    }

    function xmlNodes(context, xslNode, vars) {
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

    function xsltElements(context, xslNode, fragment, vars) {
        let result,
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
            case "xsl:choose": {
                let matched = false;
                let otherwiseNode = null;
                for (let child = xslNode.firstChild; child; child = child.nextSibling) {
                    if (matched) break;
                    if (child.nodeType !== Node.ELEMENT_NODE) continue;

                    if (child.nodeName === "xsl:when") {
                        let test = child.getAttribute("test");
                        if (test == null) continue;
                        let expandedTest = expandXPathVariables(String(test).trim(), v);
                        expandedTest = expandXPathForEachContextFunctions(expandedTest, v);
                        expandedTest = expandXsltFunctionCallsInTest(expandedTest, context, v);
                        expandedTest = expandNameFunctions(expandedTest, context);
                        expandedTest = rewriteNotEqualsForJsdom(expandedTest);
                        if (evaluateBoolean(context, expandedTest)) {
                            let branchScope = childScope(v);
                            processXslChildNodes(context, child.childNodes, fragment, branchScope);
                            matched = true;
                        }
                        continue;
                    }

                    if (child.nodeName === "xsl:otherwise") {
                        otherwiseNode = child;
                    }
                }

                if (!matched && otherwiseNode) {
                    let branchScope = childScope(v);
                    processXslChildNodes(context, otherwiseNode.childNodes, fragment, branchScope);
                }

                break;
            }
            case "xsl:for-each":
                handleForEach(context, xslNode, fragment, v, xmlNodes, (ctx, varNode, scope) => {
                    bindXslVariableNode(ctx, varNode, scope);
                });
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
                    // Interpret the string result as markup and append nodes (HTML-like behavior).
                    // This matches the expected behavior in our tests when disable-output-escaping="yes".
                    let tpl = document.createElement("template");
                    tpl.innerHTML = String(result ?? "");
                    fragment.appendChild(tpl.content.cloneNode(true));
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
    function transformSourceToFragment(context, xslDoc, vars) {
        let fragment = document.createDocumentFragment();
        let refNode = xslDoc.selectSingleNode("//xsl:stylesheet") || xslDoc.documentElement;
        let rootTemplate = findRootTemplate(xslDoc);
        if (rootTemplate) {
            let rootMatch = normalizeTemplateMatch(rootTemplate.getAttribute("match") || "");
            // Always resolve the entry nodes by evaluating the match XPath from the document root,
            // even if the caller passed an element node as `context`.
            let doc = context.nodeType === Node.DOCUMENT_NODE ? context : context.ownerDocument;
            let rootNodes = doc.selectNodes(rootMatch, doc);
            rootNodes.forEach((rn) => {
                renderTemplateBody(rn, rootTemplate, fragment, vars);
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

    function parseOutputSettings(xslDoc) {
        let out = xslDoc.selectSingleNode("//xsl:stylesheet/xsl:output");
        if (!out) return null;

        return {
            method: out.getAttribute("method") || "xml",
            encoding: out.getAttribute("encoding") || "UTF-8",
            omitXmlDeclaration: (out.getAttribute("omit-xml-declaration") || "no").toLowerCase() === "yes",
            indent: (out.getAttribute("indent") || "no").toLowerCase() === "yes",
        };
    }

    function matchesStripRule(el, rules) {
        if (!rules || rules.length === 0) return false;
        for (let rule of rules) {
            if (rule === "*") return true;
            if (el.nodeName === rule || el.localName === rule) return true;
        }
        return false;
    }

    function removeWhitespaceTextChildren(el) {
        let toRemove = [];
        for (let child = el.firstChild; child; child = child.nextSibling) {
            if (child.nodeType === Node.TEXT_NODE) {
                let t = child.textContent || "";
                if (/^\s*$/.test(t)) toRemove.push(child);
            }
        }
        for (let i = 0; i < toRemove.length; i++) {
            let n = toRemove[i];
            if (n.parentNode) n.parentNode.removeChild(n);
        }
    }

    function applyStripSpaceRules(sourceDoc, xslDoc) {
        let stripNodes = xslDoc.selectNodes("//xsl:stylesheet/xsl:strip-space");
        if (!stripNodes || stripNodes.length === 0) return;

        let rules = [];
        stripNodes.forEach((n) => {
            let elements = n.getAttribute("elements");
            if (!elements) return;
            elements.split(/\s+/).map((t) => t.trim()).filter(Boolean).forEach((t) => rules.push(t));
        });
        if (rules.length === 0) return;

        let allEls = sourceDoc.selectNodes("//*");
        allEls.forEach((el) => {
            if (matchesStripRule(el, rules)) removeWhitespaceTextChildren(el);
        });
    }

    function parseXmlString(str) {
        let parser = new DOMParser();
        let xdoc = parser.parseFromString(str, "application/xml");
        if (xdoc.querySelector("parsererror")) {
            throw new Error("xsl:import/xsl:include resolver returned invalid XML.");
        }
        return xdoc;
    }

    function importableTopLevelNodes(doc) {
        let root = doc.selectSingleNode("//xsl:stylesheet");
        if (!root) return [];
        return Array.from(root.childNodes).filter((n) => {
            if (n.nodeType !== Node.ELEMENT_NODE) return false;
            // These are resolved recursively and should not be copied as-is.
            if (n.nodeName === "xsl:import" || n.nodeName === "xsl:include") return false;
            return true;
        });
    }

    function appendImportedNodes(root, importDoc) {
        importableTopLevelNodes(importDoc).forEach((n) => {
            root.appendChild(root.ownerDocument.importNode(n, true));
        });
    }

    function inlineIncludedNodes(root, includeNode, includeDoc) {
        let nodes = importableTopLevelNodes(includeDoc);
        let parent = includeNode.parentNode;
        if (!parent) return;
        nodes.forEach((n) => {
            parent.insertBefore(root.ownerDocument.importNode(n, true), includeNode);
        });
        parent.removeChild(includeNode);
    }

    function resolveStylesheetImports(xslDoc, importResolver, visited) {
        if (typeof importResolver !== "function") return xslDoc;
        let root = xslDoc.selectSingleNode("//xsl:stylesheet");
        if (!root) return xslDoc;

        let seen = visited || new Set();
        let importNodes = Array.from(root.childNodes).filter((n) => {
            return n.nodeType === Node.ELEMENT_NODE && n.nodeName === "xsl:import";
        });

        importNodes.forEach((imp) => {
            let href = imp.getAttribute("href");
            if (!href) return;
            if (seen.has(href)) return;
            seen.add(href);

            let resolved = importResolver(href, xslDoc);
            if (!resolved) return;
            let importDoc = typeof resolved === "string" ? parseXmlString(resolved) : resolved;
            resolveStylesheetImports(importDoc, importResolver, seen);
            appendImportedNodes(root, importDoc);
        });

        let includeNodes = Array.from(root.childNodes).filter((n) => {
            return n.nodeType === Node.ELEMENT_NODE && n.nodeName === "xsl:include";
        });
        includeNodes.forEach((inc) => {
            let href = inc.getAttribute("href");
            if (!href) return;
            let resolved = importResolver(href, xslDoc);
            if (!resolved) return;
            let includeDoc = typeof resolved === "string" ? parseXmlString(resolved) : resolved;
            resolveStylesheetImports(includeDoc, importResolver, seen);
            inlineIncludedNodes(root, inc, includeDoc);
        });

        return xslDoc;
    }

    function readAttr(node, name, fallback) {
        let v = node.getAttribute(name);
        return v == null || v === "" ? fallback : v;
    }

    function defaultDecimalFormat() {
        return {
            decimalSeparator: ".",
            groupingSeparator: ",",
            minusSign: "-",
            NaN: "NaN",
            infinity: "Infinity",
        };
    }

    function parseDecimalFormats(xslDoc) {
        let formats = { __default: defaultDecimalFormat() };
        let defs = xslDoc.selectNodes("//xsl:stylesheet/xsl:decimal-format");

        defs.forEach((def) => {
            let name = def.getAttribute("name") || "__default";
            formats[name] = {
                decimalSeparator: readAttr(def, "decimal-separator", "."),
                groupingSeparator: readAttr(def, "grouping-separator", ","),
                minusSign: readAttr(def, "minus-sign", "-"),
                NaN: readAttr(def, "NaN", "NaN"),
                infinity: readAttr(def, "infinity", "Infinity"),
            };
        });

        return formats;
    }

    function parseAttributeSets(xslDoc) {
        let defs = xslDoc.selectNodes("//xsl:stylesheet/xsl:attribute-set");
        let byName = {};

        defs.forEach((def) => {
            let name = def.getAttribute("name");
            if (!name) return;

            let use = def.getAttribute("use-attribute-sets") || "";
            let uses = use.split(/\s+/).map((s) => s.trim()).filter(Boolean);
            let attrs = Array.from(def.childNodes).filter((n) => {
                return n.nodeType === Node.ELEMENT_NODE && n.nodeName === "xsl:attribute";
            });

            if (!byName[name]) byName[name] = [];
            byName[name].push({ uses, attrs });
        });

        return byName;
    }

    // extending the XML object
    Document.prototype.selectNodes = selectNodes;
    Document.prototype.selectSingleNode = selectSingleNode;
    Element.prototype.selectNodes = function(xpath) { return this.ownerDocument.selectNodes(xpath, this) };
    Element.prototype.selectSingleNode = function(xpath) { return this.ownerDocument.selectSingleNode(xpath, this) };
    Node.prototype.selectNodes = function(xpath) {
        if (this.nodeType === Node.DOCUMENT_NODE) return selectNodes.call(this, xpath, this);
        return this.ownerDocument.selectNodes(xpath, this);
    };
    Node.prototype.selectSingleNode = function(xpath) {
        if (this.nodeType === Node.DOCUMENT_NODE) return selectSingleNode.call(this, xpath, this);
        return this.ownerDocument.selectSingleNode(xpath, this);
    };

    // Convenience for tests/consumers: jsdom doesn't expose innerHTML on DocumentFragment.
    if (typeof DocumentFragment !== "undefined" && !("innerHTML" in DocumentFragment.prototype)) {
        Object.defineProperty(DocumentFragment.prototype, "innerHTML", {
            get() {
                let host = document.createElement("div");
                host.appendChild(this.cloneNode(true));
                return host.innerHTML;
            },
        });
    }

    /**
     * @class
     */
    class ProXslt {
        constructor(options) {
            this.options = options || {};
        }

        static xmlFromString(str) {
            let s = String(str == null ? "" : str);
            let looksLikeXsl =
                /<\s*xsl:(stylesheet|transform)\b/i.test(s) ||
                /xmlns:xsl\s*=\s*["']http:\/\/www\.w3\.org\/1999\/XSL\/Transform["']/i.test(s);

            let parser = new DOMParser();
            let xdoc = parser.parseFromString(s, "application/xml");
            if (xdoc.querySelector("parsererror")) {
                if (looksLikeXsl) {
                    throw new Error(`Invalid XSL template: malformed XML (unclosed tag(s) or invalid markup)`);
                }
                throw new Error(`Parsererror: ${s}`);
            }
            return xdoc;
        }

        importStylesheet(xslDoc) {
            // Full reset: clear internal caches and per-document precomputed matcher data.
            resetProXsltInternals();
            // Accept either a Document or a node within the stylesheet document.
            let doc =
                xslDoc && xslDoc.nodeType === Node.DOCUMENT_NODE
                    ? xslDoc
                    : xslDoc && xslDoc.ownerDocument
                      ? xslDoc.ownerDocument
                      : xslDoc;
            if (doc && doc.__proXsltTemplateNodes) delete doc.__proXsltTemplateNodes;
            if (doc && doc.__proXsltTemplateMatchers) delete doc.__proXsltTemplateMatchers;

            resolveStylesheetImports(doc, this.options.importResolver);
            this.xslDoc = doc;
            this.globalVariableNodes = this.xslDoc.selectNodes(`//xsl:stylesheet/xsl:variable`);
            this.outputSettings = parseOutputSettings(doc);
            this.decimalFormats = parseDecimalFormats(doc);
            this.attributeSets = parseAttributeSets(doc);
        }

        transformToFragment(context, doc) {
            // Apply xsl:strip-space before executing template rules.
            applyStripSpaceRules(context, this.xslDoc);

            // Bind global stylesheet variables once and make them available inside templates.
            let globalVars = {};
            let globalVariableNodes = this.globalVariableNodes || [];
            globalVariableNodes.forEach((vNode) => {
                bindXslVariableNode(context, vNode, globalVars);
            });
            // xsl:key indexes are built lazily per key name on first key() call.
            globalVars.__sourceDoc = context;
            globalVars.__xslDoc = this.xslDoc;
            globalVars.__output = this.outputSettings || null;
            globalVars.__decimalFormats = this.decimalFormats || null;
            globalVars.__attributeSets = this.attributeSets || null;
            globalVars.__matchNodeSetCache = {};

            return transformSourceToFragment(context, this.xslDoc, globalVars);
        }
       
    }

    if (typeof globalThis !== 'undefined') {
        globalThis.ProXslt = ProXslt;
    }

    return ProXslt;

}));
