import { selectNodes, selectSingleNode } from "./dom/utils.js";
import { xmlNodes } from "./dom/parser.js";
import { bindXslVariable } from "./dom/xslt/variables.js";
import { parseOutputSettings } from "./dom/xslt/output.js";
import { applyStripSpaceRules } from "./dom/xslt/stripSpace.js";
import { resolveStylesheetImports } from "./dom/xslt/imports.js";

// extending the XML object
Document.prototype.selectNodes = selectNodes;
Document.prototype.selectSingleNode = selectSingleNode;
Element.prototype.selectNodes = function(xpath) { return this.ownerDocument.selectNodes(xpath, this) }
Element.prototype.selectSingleNode = function(xpath) { return this.ownerDocument.selectSingleNode(xpath, this) }

/**
 * @class
 */
class ProXslt {
	constructor(options) {
		this.options = options || {};
	}

	static xmlFromString(str) {
		let parser = new DOMParser();
		let xdoc = parser.parseFromString(str, "application/xml");
		if (xdoc.querySelector("parsererror")) {
			throw new Error(`Parsererror: ${str}`);
		}
		return xdoc;
	}

	importStylesheet(xslDoc) {
		resolveStylesheetImports(xslDoc, this.options.importResolver);
		this.xslDoc = xslDoc;
		this.outputSettings = parseOutputSettings(xslDoc);
	}

	transformToFragment(context, doc) {
		let xslNode = this.xslDoc.selectSingleNode(`//xsl:template[@match]`);

		// Apply xsl:strip-space before executing template rules.
		applyStripSpaceRules(context, this.xslDoc);

		// Bind global stylesheet variables once and make them available inside templates.
		let globalVars = {};
		let globalVariableNodes = this.xslDoc.selectNodes(`//xsl:stylesheet/xsl:variable`);
		globalVariableNodes.forEach((vNode) => {
			bindXslVariable(context, vNode, globalVars);
		});
		// xsl:key indexes are built lazily per key name on first key() call.
		globalVars.__sourceDoc = context;
		globalVars.__xslDoc = this.xslDoc;
		globalVars.__output = this.outputSettings || null;

		let fragment = xmlNodes(context, xslNode, globalVars);
		return fragment;
	}

	
}

export default ProXslt;
