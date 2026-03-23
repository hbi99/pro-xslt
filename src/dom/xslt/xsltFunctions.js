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
} from "../utils.js";

import { expandXPathForEachContextFunctions } from "./foreachContext.js";

function dispatchParsedXsltFunction(context, parsed) {
	let n = parsed.name.toLowerCase();
	let raw = parsed.raw;
	switch (n) {
		case "format-number":
			return formatNumber(
				parsed.args.length >= 2 ? parsed.args : parsed.raw,
				context
			);
		case "generate-id":
			return generateId(context);
		case "concat":
			return concatFromParsedArgs(context, parsed.args);
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
	let expanded = expandXPathVariables(String(value).trim(), vars || {});
	expanded = expandXPathForEachContextFunctions(expanded, vars || {});
	let parsed = parseXsltFunctionCall(expanded);
	if (parsed) return dispatchParsedXsltFunction(context, parsed);

	let result;
	switch (true) {
		case expanded.startsWith("current"): break;
		case expanded.startsWith("document"): break;
		case expanded.startsWith("element-available"): break;
		case expanded.startsWith("format-number"):
			result = formatNumber(expanded, context);
			break;
		case expanded.startsWith("function-available"): break;
		case expanded.startsWith("generate-id"):
			result = generateId(context);
			break;
		case expanded.startsWith("key"): break;
		case expanded.startsWith("system-property"): break;
		case expanded.startsWith("unparsed-entity-uri"): break;
		default: {
			let num = evaluate(context, expanded);
			if (num !== undefined && !Number.isNaN(num)) {
				result = String(num);
				break;
			}
			try {
				let sn = context.selectSingleNode(expanded);
				if (sn != null) {
					result = sn.textContent;
					break;
				}
			} catch (_) {
				/* not a location path (e.g. string literal `'yes'`) */
			}
			result = evaluateString(context, expanded);
			break;
		}
	}
	return result;
}

// Keep this import used by other call sites (xsl:if uses evaluateBoolean directly in parser.js).
export { evaluateBoolean };

