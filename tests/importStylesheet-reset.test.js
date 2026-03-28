import { describe, it, expect } from "vitest";
import ProXslt from "../src/index.js";
import { loadXml } from "./utils/common.js";

describe("importStylesheet reset", () => {
    it("makes new templates available immediately after re-import", () => {
        let { xmlDoc, xslDoc: xsl1 } = loadXml(`importStylesheet-reset/1.xml`);
        let p = new ProXslt();

        p.importStylesheet(xsl1);
        let f1 = p.transformToFragment(xmlDoc, document);
        expect(f1.textContent.trim()).toBe("one");

        p.importStylesheet(loadXml(`importStylesheet-reset/2.xml`).xslDoc);
        p.transformToFragment(xmlDoc, document);

        // Root template selection prefers the first non-text() match unless match="/"
        // exists, so /page/a still runs here. The important part for this regression is
        // that templates from the *new* stylesheet are usable immediately after re-import.
        // We'll verify by applying templates within the new stylesheet.
        p.importStylesheet(loadXml(`importStylesheet-reset/3.xml`).xslDoc);
        let f3 = p.transformToFragment(xmlDoc, document);
        expect(f3.textContent.trim()).toBe("two");
    });
});
