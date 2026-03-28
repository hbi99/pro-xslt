import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadXml } from './utils/common.js';

describe('xsl:import', () => {
    it('loads imported stylesheet and keeps local template precedence', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-import/1.xml`);

        let importedPath = resolve(process.cwd(), 'tests/fixture/imported-base.xsl');
        let importedXslString = readFileSync(importedPath, 'utf8');

        let proXslt = new ProXslt({
            importResolver: (href) => {
                if (href === 'imported-base.xsl') return importedXslString;
                return null;
            },
        });
        proXslt.importStylesheet(xslDoc);

        let fragment = proXslt.transformToFragment(xmlDoc, document);
        expect(fragment.textContent.trim()).toBe('LOCAL:A|[A]');
    });
});
