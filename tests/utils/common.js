import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import ProXslt from '../../src/index.js';

const XSL_NS = 'http://www.w3.org/1999/XSL/Transform';

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixture');

/**
 * Load a fixture: root <Scheme> with <Description>, one source XML child, and <xsl:stylesheet>.
 * The source root may be any element name (page, Monkey, Data, pack, …).
 *
 * Optional <ExternalSource href="other.xml"/> loads XML relative to the Scheme file’s folder
 * (e.g. tests/fixture/xsl-key/catalog-facets-50kb.xml).
 * Stylesheet and source are each re-parsed as standalone documents (see implementation).
 */
export function loadXml(filename) {
	let fixturePath = resolve(FIXTURE_DIR, filename);
	let xmlString = readFileSync(fixturePath, `utf8`);

	let xDoc = ProXslt.xmlFromString(xmlString);
	let scheme = xDoc.documentElement;
	if (!scheme || scheme.localName !== 'Scheme') {
		throw new Error(`Fixture ${filename} root must be <Scheme>`);
	}

	let sourceRoot = null;
	let externalHref = null;
	let xslRoot = null;
	let description = '';

	for (let child = scheme.firstChild; child; child = child.nextSibling) {
		if (child.nodeType !== 1) continue;
		if (child.localName === 'Description') {
			description = child.textContent || '';
			continue;
		}
		if (child.localName === 'ExternalSource' && child.getAttribute('href')) {
			externalHref = child.getAttribute('href');
			continue;
		}
		if (child.namespaceURI === XSL_NS && child.localName === 'stylesheet') {
			xslRoot = child.cloneNode(true);
			continue;
		}
		if (sourceRoot === null && externalHref === null) {
			sourceRoot = child.cloneNode(true);
		}
	}

	if ((!sourceRoot && !externalHref) || !xslRoot) {
		throw new Error(
			`Fixture ${filename} must include <Description>, <ExternalSource href="…"/> or one source XML element, and <xsl:stylesheet>`
		);
	}

	let xmlDoc;
	if (externalHref) {
		let extPath = resolve(dirname(fixturePath), externalHref);
		xmlDoc = ProXslt.xmlFromString(readFileSync(extPath, `utf8`));
	} else {
		// Standalone document so paths like `/page/...` resolve against the source root, not <Scheme>.
		xmlDoc = ProXslt.xmlFromString(new XMLSerializer().serializeToString(sourceRoot));
	}

	// Standalone stylesheet document (same as ProXslt.xmlFromString on inline XSL) so importStylesheet
	// and XPath on the stylesheet match non-fixture tests.
	let xslDoc = ProXslt.xmlFromString(new XMLSerializer().serializeToString(xslRoot));

	return { xmlDoc, xslDoc, description };
}
