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
 * (e.g. tests/fixture/xsl-key/large-facet-catalog.xml).
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

	let xDescription = scheme.selectSingleNode(`//description`);
	let xData = scheme.selectSingleNode(`//XmlData/*`);
	let xTemplate = scheme.selectSingleNode(`//Template`);
	let xExternalSource = scheme.selectSingleNode(`//ExternalSource`);

	let xmlDoc;
	if (xExternalSource) {
		let externalHref = xExternalSource.getAttribute('href');
		let extPath = resolve(dirname(fixturePath), externalHref);
		let scheme = ProXslt.xmlFromString(readFileSync(extPath, `utf8`));
		xData = scheme.selectSingleNode(`//XmlData/*`);
	}

	// Standalone document so paths like `/page/...` resolve against the source root, not <Scheme>.
	xmlDoc = ProXslt.xmlFromString(new XMLSerializer().serializeToString(xData));

	// Standalone stylesheet document (same as ProXslt.xmlFromString on inline XSL) so importStylesheet
	// and XPath on the stylesheet match non-fixture tests.
	let xslDoc = xTemplate ? ProXslt.xmlFromString(xTemplate.textContent) : null;

	return { xmlDoc, xslDoc, description: xDescription.textContent };
}
