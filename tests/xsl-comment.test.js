import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:comment', () => {
    it('creates a comment from select expression', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-comment/1.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let out = fragment.querySelector('out');
        expect(out).not.toBeNull();
        expect(out.childNodes.length).toBe(1);
        expect(out.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
        expect(out.childNodes[0].textContent).toBe('hello-comment');
    });

    it('creates a comment from body content', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-comment/2.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let out = fragment.querySelector('out');
        expect(out).not.toBeNull();
        expect(out.childNodes.length).toBe(1);
        expect(out.childNodes[0].nodeType).toBe(Node.COMMENT_NODE);
        expect(out.childNodes[0].textContent).toBe('From Hello');
    });
});
