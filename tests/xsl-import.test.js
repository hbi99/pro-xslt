import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('xsl:import', () => {
    it('loads imported stylesheet and keeps local template precedence', async () => {
        let xmlString = `<root><item>A</item></root>`;

        let mainPath = resolve(process.cwd(), 'tests/fixture/import-main.xsl');
        let importedPath = resolve(process.cwd(), 'tests/fixture/imported-base.xsl');
        let mainXslString = readFileSync(mainPath, 'utf8');
        let importedXslString = readFileSync(importedPath, 'utf8');

        let xmlDoc = ProXslt.xmlFromString(xmlString);
        let mainXslDoc = ProXslt.xmlFromString(mainXslString);

        let proXslt = new ProXslt({
            importResolver: (href) => {
                if (href === 'imported-base.xsl') return importedXslString;
                return null;
            },
        });
        proXslt.importStylesheet(mainXslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.textContent.trim()).toBe('LOCAL:A|[A]');
    });
});

