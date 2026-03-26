import { selectNodes, selectSingleNode } from "./utils.js";
import {
    transformSourceToFragment,
    bindXslVariableNode,
    resetProXsltInternals,
} from "./parser.js";
import { parseOutputSettings } from "./xslt/output.js";
import { applyStripSpaceRules } from "./xslt/stripSpace.js";
import { resolveStylesheetImports } from "./xslt/imports.js";
import { parseDecimalFormats } from "./xslt/decimalFormat.js";
import { parseAttributeSets } from "./xslt/attributeSets.js";

// extending the XML object
Document.prototype.selectNodes = selectNodes;
Document.prototype.selectSingleNode = selectSingleNode;
Element.prototype.selectNodes = function(xpath) { return this.ownerDocument.selectNodes(xpath, this) }
Element.prototype.selectSingleNode = function(xpath) { return this.ownerDocument.selectSingleNode(xpath, this) }
Node.prototype.selectNodes = function(xpath) {
    if (this.nodeType === Node.DOCUMENT_NODE) return selectNodes.call(this, xpath, this);
    return this.ownerDocument.selectNodes(xpath, this);
};
Node.prototype.selectSingleNode = function(xpath) {
    if (this.nodeType === Node.DOCUMENT_NODE) return selectSingleNode.call(this, xpath, this);
    return this.ownerDocument.selectSingleNode(xpath, this);
};

// Convenience for tests/consumers: jsdom doesn't expose innerHTML on DocumentFragment.
if (typeof DocumentFragment !== "undefined" && !("innerHTML" in DocumentFragment.prototype)) {
    Object.defineProperty(DocumentFragment.prototype, "innerHTML", {
        get() {
            let host = document.createElement("div");
            host.appendChild(this.cloneNode(true));
            return host.innerHTML;
        },
    });
}

/**
 * @class
 */
class ProXslt {
    constructor(options) {
        this.options = options || {};
    }

    static xmlFromString(str) {
        let s = String(str == null ? "" : str);
        let looksLikeXsl =
            /<\s*xsl:(stylesheet|transform)\b/i.test(s) ||
            /xmlns:xsl\s*=\s*["']http:\/\/www\.w3\.org\/1999\/XSL\/Transform["']/i.test(s);

        let parser = new DOMParser();
        let xdoc = parser.parseFromString(s, "application/xml");
        if (xdoc.querySelector("parsererror")) {
            if (looksLikeXsl) {
                throw new Error(`Invalid XSL template: malformed XML (unclosed tag(s) or invalid markup)`);
            }
            throw new Error(`Parsererror: ${s}`);
        }
        return xdoc;
    }

    importStylesheet(xslDoc) {
        // Full reset: clear internal caches and per-document precomputed matcher data.
        resetProXsltInternals();
        if (xslDoc && xslDoc.__proXsltTemplateNodes) delete xslDoc.__proXsltTemplateNodes;
        if (xslDoc && xslDoc.__proXsltTemplateMatchers) delete xslDoc.__proXsltTemplateMatchers;

        resolveStylesheetImports(xslDoc, this.options.importResolver);
        this.xslDoc = xslDoc;
        this.globalVariableNodes = this.xslDoc.selectNodes(`//xsl:stylesheet/xsl:variable`);
        this.outputSettings = parseOutputSettings(xslDoc);
        this.decimalFormats = parseDecimalFormats(xslDoc);
        this.attributeSets = parseAttributeSets(xslDoc);
    }

    transformToFragment(context, doc) {
        // Apply xsl:strip-space before executing template rules.
        applyStripSpaceRules(context, this.xslDoc);

        // Bind global stylesheet variables once and make them available inside templates.
        let globalVars = {};
        let globalVariableNodes = this.globalVariableNodes || [];
        globalVariableNodes.forEach((vNode) => {
            bindXslVariableNode(context, vNode, globalVars);
        });
        // xsl:key indexes are built lazily per key name on first key() call.
        globalVars.__sourceDoc = context;
        globalVars.__xslDoc = this.xslDoc;
        globalVars.__output = this.outputSettings || null;
        globalVars.__decimalFormats = this.decimalFormats || null;
        globalVars.__attributeSets = this.attributeSets || null;
        globalVars.__matchNodeSetCache = {};

        return transformSourceToFragment(context, this.xslDoc, globalVars);
    }
   
}

export default ProXslt;
