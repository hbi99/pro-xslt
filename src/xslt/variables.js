import {
    evaluateNumber,
    evaluateString,
    expandXPathNodeSetVariables,
    expandXPathVariables,
} from "../utils.js";
import { expandXPathForEachContextFunctions } from "./foreachContext.js";

export function bindXslVariable(context, el, vars) {
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
    } else {
        vars[name] = { kind: "string", s: el.textContent || "" };
    }
}

