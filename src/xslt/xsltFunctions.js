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
    stripXPathStringLiteral,
} from "../utils.js";

import { expandXPathForEachContextFunctions } from "./foreachContext.js";
import { buildKeyIndexByName, resolveKey } from "./keys.js";

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

export function xsltFunctions(context, value, vars) {
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
            // Entire expression is a string literal (e.g. expanded $myVar). Evaluate as
            // string before number(): jsdom coerces '10.0 GB' to number 10, which breaks
            // xsl:value-of of RTF text that looks numeric with a suffix.
            if (stripXPathStringLiteral(expanded) !== null) {
                result = evaluateString(context, expanded);
                break;
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

// Keep this import used by other call sites (xsl:if uses evaluateBoolean directly in parser.js).
export { evaluateBoolean };

