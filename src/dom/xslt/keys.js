import { evaluateString } from "../utils.js";

function ensureKeyContainers(vars) {
	if (!vars.__keys) vars.__keys = {};
	if (!vars.__keyBuiltNames) vars.__keyBuiltNames = {};
}

export function buildKeyIndexByName(sourceDoc, xslDoc, vars, keyName) {
	ensureKeyContainers(vars);
	if (vars.__keyBuiltNames[keyName]) return;

	let defs = xslDoc.selectNodes(`//xsl:stylesheet/xsl:key[@name='${keyName}']`);
	let indexed = vars.__keys[keyName] || {};

	defs.forEach((def) => {
		let match = def.getAttribute("match");
		let use = def.getAttribute("use");
		if (!match || !use) return;

		let nodes = sourceDoc.selectNodes(match);
		nodes.forEach((node) => {
			let k = evaluateString(node, use);
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

