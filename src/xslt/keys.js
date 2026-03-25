import { evaluateString } from "../utils.js";

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

export function buildKeyIndexByName(sourceDoc, xslDoc, vars, keyName) {
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

export function resolveKey(vars, keyName, lookupValue) {
    if (!vars || !vars.__keys) return [];
    let keyMap = vars.__keys;
    let byName = keyMap[keyName];
    if (!byName) return [];
    return byName[lookupValue] || [];
}

