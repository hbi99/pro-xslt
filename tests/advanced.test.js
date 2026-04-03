import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('Advanced Tests', () => {
    it('should summerize disc storage usage', async () => {
        let { xmlDoc, xslDoc } = loadXml(`complex/storage-usage.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = document.createElement('span');
        span.appendChild(fragment);

        expect(span.innerHTML.replace(/\s+/g, " ").trim()).toBe(
            `<div class="row-body"><div class="panel-left"><i class="icon" style="background-image: url(~/icons/karaqu-cloud-storage.png);"></i></div><div class="panel-right"><h4>Karaqu Cloud Storage - 273</h4><h5>10.0 GB available of 10 GB<span class="file-count">273 files</span></h5><div class="disc-bar"><div style="background: #7676fe;width: 0.0%;"><span>Video</span></div><div style="background: #69a5e1;width: 0.5%;"><span>Audio</span></div><div style="background: #e97474;width: 0.0%;"><span>Documents</span></div><div style="background: #ff9800;width: 0.0%;"><span>Images</span></div><div style="background: #b4b4b4;width: 0.0%;"><span>Other</span></div></div></div></div>`
        );
    });
});
