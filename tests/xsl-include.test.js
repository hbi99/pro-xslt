import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('xsl:include', () => {
  it('inlines included templates and named templates', async () => {
    let xmlString = `<doc><item>X</item></doc>`;

    let mainPath = resolve(process.cwd(), 'tests/fixture/include-main.xsl');
    let includedPath = resolve(process.cwd(), 'tests/fixture/included-common.xsl');
    let mainXslString = readFileSync(mainPath, 'utf8');
    let includedXslString = readFileSync(includedPath, 'utf8');

    let xmlDoc = ProXslt.xmlFromString(xmlString);
    let mainXslDoc = ProXslt.xmlFromString(mainXslString);

    let proXslt = new ProXslt({
      importResolver: (href) => {
        if (href === 'included-common.xsl') return includedXslString;
        return null;
      },
    });
    proXslt.importStylesheet(mainXslDoc);

    let fragment = proXslt.transformToFragment(xmlDoc, document);
    expect(fragment.textContent.trim()).toBe('INCLUDED:X-ok');
  });
});

