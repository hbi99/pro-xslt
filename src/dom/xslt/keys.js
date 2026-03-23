import { evaluateString } from "../utils.js";

export function buildKeyIndexes(sourceDoc, xslDoc) {
	let keyDefs = xslDoc.selectNodes("//xsl:stylesheet/xsl:key");
	let keyMap = {};

	keyDefs.forEach((def) => {
		let name = def.getAttribute("name");
		let match = def.getAttribute("match");
		let use = def.getAttribute("use");
		if (!name || !match || !use) return;

		let indexed = keyMap[name];
		if (!indexed) {
			indexed = {};
			keyMap[name] = indexed;
		}

		let nodes = sourceDoc.selectNodes(match);
		nodes.forEach((node) => {
			let k = evaluateString(node, use);
			if (!indexed[k]) indexed[k] = [];
			indexed[k].push(node);
		});
	});

	return keyMap;
}

export function resolveKey(vars, keyName, lookupValue) {
	let keyMap = vars && vars.__keys;
	if (!keyMap) return [];
	let byName = keyMap[keyName];
	if (!byName) return [];
	return byName[lookupValue] || [];
}

