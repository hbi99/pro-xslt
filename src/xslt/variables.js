import {
    evaluateXslSelectBinding,
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
        vars[name] = evaluateXslSelectBinding(context, expanded);
    } else {
        vars[name] = { kind: "string", s: el.textContent || "" };
    }
}

