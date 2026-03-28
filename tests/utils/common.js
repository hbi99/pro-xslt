import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import ProXslt from '../../src/index.js';

export function loadXml(filename) {
	let fixturePath = resolve(process.cwd(), `tests/fixture/${filename}`);
    let xmlString = readFileSync(fixturePath, `utf8`);

    let xDoc = ProXslt.xmlFromString(xmlString);
    let xmlDoc = xDoc.selectSingleNode('//page').cloneNode(true);
    let xslDoc = xDoc.selectSingleNode('//xsl:stylesheet').cloneNode(true);
    let description = xDoc.selectSingleNode('//Description').textContent;

    return { xmlDoc, xslDoc, description };
}
