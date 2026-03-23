import { evaluateNumber, evaluateString, expandXPathVariables } from "../utils.js";

function xslSortElements(forEachNode) {
	return Array.from(forEachNode.childNodes).filter((child) => {
		return child.nodeType === Node.ELEMENT_NODE && child.nodeName === "xsl:sort";
	});
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
	Array.from(forEachNode.childNodes).forEach((child) => {
		if (child.nodeType !== Node.ELEMENT_NODE) return;
		if (child.nodeName === "xsl:sort") return;
		if (child.nodeName === "xsl:variable") {
			bindXslVariable(context, child, vars);
			return;
		}
		fragment.appendChild(xmlNodes(context, child, vars));
	});
}

export function handleForEach(context, xslNode, fragment, vars, xmlNodes, bindXslVariable) {
	let select = xslNode.getAttribute("select");
	if (select == null || String(select).trim() === "") return;

	let expandedSelect = expandXPathVariables(String(select).trim(), vars || {});
	let nodes = context.selectNodes(expandedSelect);
	let sortNodes = xslSortElements(xslNode);
	let sortedNodes = sortNodesForEach(nodes, sortNodes, vars || {});

	sortedNodes.forEach((node, idx) => {
		let scope = Object.assign({}, vars || {});
		scope.__position = idx + 1;
		scope.__last = sortedNodes.length;
		scope.__current = node;
		processForEachChildNodes(node, xslNode, fragment, scope, xmlNodes, bindXslVariable);
	});
}

