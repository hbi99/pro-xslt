export function expandXPathForEachContextFunctions(expr, vars) {
	let pos = vars && vars.__position;
	let last = vars && vars.__last;
	if (pos === undefined && last === undefined && expr.indexOf("current") === -1) return expr;

	let out = "";
	let i = 0;
	let inSingle = false;
	let inDouble = false;
	while (i < expr.length) {
		let c = expr[i];
		if (!inDouble && c === "'") {
			inSingle = !inSingle;
			out += c;
			i++;
			continue;
		}
		if (!inSingle && c === '"') {
			inDouble = !inDouble;
			out += c;
			i++;
			continue;
		}

		if (!inSingle && !inDouble) {
			let cur = /^current\s*\(\s*\)/.exec(expr.slice(i));
			if (cur) {
				out += ".";
				i += cur[0].length;
				continue;
			}
			if (pos !== undefined) {
				let m = /^position\s*\(\s*\)/.exec(expr.slice(i));
				if (m) {
					out += String(pos);
					i += m[0].length;
					continue;
				}
			}
			if (last !== undefined) {
				let m = /^last\s*\(\s*\)/.exec(expr.slice(i));
				if (m) {
					out += String(last);
					i += m[0].length;
					continue;
				}
			}
		}

		out += c;
		i++;
	}
	return out;
}

