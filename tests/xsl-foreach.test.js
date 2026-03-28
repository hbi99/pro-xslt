import { describe, it, expect } from 'vitest';
import ProXslt from '../src/index.js';
import { loadXml } from './utils/common.js';

describe('xsl:for-each', () => {
    it('iterates selected nodes in document order', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-foreach/iterate-document-order.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('bac');
    });

    it('supports xsl:sort text ascending', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-foreach/sort-text-ascending.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('abc');
    });

    it('supports xsl:sort number descending', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-foreach/sort-numbers-descending.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('30,10,2,');
    });

    it('supports xsl:sort number descending with separator comma', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-foreach/sort-with-commas.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('30,10,2');
    });

    it('supports xsl:sort number descending with separator hyphen', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-foreach/sort-with-hyphens.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('30 - 10 - 2');
    });

    it('should test support for current() function', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-foreach/current-in-sort-test.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        expect(fragment.textContent.trim()).toBe('30102 -');
    });

    it('should render advanced cross reference with current() function', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-foreach/dock-name-resolution.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = document.createElement('span');
        span.appendChild(fragment);

        expect(span.innerHTML.trim()).toBe('<div>Finder</div><div>Mail</div><div>Calendar</div><div>Eniac</div><div>Textedit</div><div>Spotify</div><div>2048</div><div>Othello</div>');
    });

    it('should honor deep nested attribute', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-foreach/dock-div-attributes.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);
        let fragment = proXslt.transformToFragment(xmlDoc, document);

        let span = document.createElement('span');
        span.appendChild(fragment);

        expect(span.innerHTML.trim()).toBe('<div id="1">Finder</div><div id="1">Mail</div><div id="1">Calendar</div><div id="1">Eniac</div><div id="1">Textedit</div><div id="1">Spotify</div><div id="1">2048</div><div id="1">Othello</div>');
    });

    it('should switch template and render different content', async () => {
        let { xmlDoc, xslDoc } = loadXml(`xsl-foreach/switch-named-templates.xml`);
        let proXslt = new ProXslt();
        proXslt.importStylesheet(xslDoc);

        let fragment,
            template,
            span;

        template = xslDoc.selectSingleNode("//xsl:template[@name='apps']");
        template.setAttribute('match', '/');
        fragment = proXslt.transformToFragment(xmlDoc, document);
        template.removeAttribute('match');

        span = document.createElement('span');
        span.appendChild(fragment);
        expect(span.innerHTML.trim()).toBe(
            '<div>2048</div><div>Calendar</div><div>Eniac</div><div>Finder</div><div>Mail</div><div>Othello</div><div>Spotify</div><div>Textedit</div>'
        );

        template = xslDoc.selectSingleNode("//xsl:template[@name='dock']");
        template.setAttribute('match', '/');
        fragment = proXslt.transformToFragment(xmlDoc, document);
        template.removeAttribute('match');

        span = document.createElement('span');
        span.appendChild(fragment);
        expect(span.innerHTML.trim()).toBe('<div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div><div>7</div><div>9</div>');
    });
});
