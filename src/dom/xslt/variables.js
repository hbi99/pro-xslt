import {
	evaluateNumber,
	evaluateString,
	expandXPathVariables,
} from "../utils.js";

export function bindXslVariable(context, el, vars) {
	let name = el.getAttribute("name");
	if (!name) return;

	let select = el.getAttribute("select");
	if (select != null && String(select).trim() !== "") {
		let expanded = expandXPathVariables(String(select).trim(), vars);
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

