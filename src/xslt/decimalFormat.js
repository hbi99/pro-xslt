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

export function parseDecimalFormats(xslDoc) {
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

