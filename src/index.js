import { selectNodes, selectSingleNode } from "./dom/utils.js";
import { xmlNodes } from "./dom/parser.js";

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
		// TODO
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
		this.xslDoc = xslDoc;
	}

	transformToFragment(context, doc) {
		let xslNode = this.xslDoc.selectSingleNode(`//xsl:template[@match]`);
		let fragment = xmlNodes(context, xslNode);
		return fragment;
	}

	
}

export default ProXslt;
