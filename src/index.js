import { selectNodes, selectSingleNode } from './dom/utils.js';

// extending the XML object
Document.prototype.selectNodes = selectNodes;
Document.prototype.selectSingleNode = selectSingleNode;
Element.prototype.selectNodes = function(xpath) { return this.ownerDocument.selectNodes(xpath, this) }
Element.prototype.selectSingleNode = function(xpath) { return this.ownerDocument.selectSingleNode(xpath, this) }

/**
 * @class
 */
class ProXslt {
	constructor() {
		this.data = {};
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

	transformToFragment(xmlNode, doc) {
		let xslNode = this.xslDoc.selectSingleNode(`//xsl:template[@match]`);
		let fragment = this.parse(xmlNode, xslNode);
		return fragment;
	}

	parse(xmlNode, xslNode) {
		let fragment = document.createDocumentFragment();

		switch (xslNode.nodeType) {
			case Node.ELEMENT_NODE:
				switch (xslNode.nodeName) {
					case 'xsl:template':
						let nodes = xmlNode.selectNodes(xslNode.getAttribute('match'));
						nodes.map(node => {
							xslNode.childNodes.forEach(child => {
								fragment.appendChild(this.parse(node, child));
							});
						});
						break;
					case 'xsl:call-template':
						break;
					case 'xsl:apply-templates':
						break;
					case 'xsl:for-each':
						break;
					case 'xsl:if':
						break;
					case 'xsl:choose':
						break;
					case 'xsl:when':
						break;
					case 'xsl:otherwise':
						break;
					case 'xsl:value-of':
						let matchNode = xmlNode.selectSingleNode(xslNode.getAttribute('select'));
						fragment.appendChild(document.createTextNode(matchNode.textContent));
						break;
				}
				break;
			case Node.ATTRIBUTE_NODE:
				fragment.appendChild(document.createTextNode(xslNode.value));
				break;
			case Node.TEXT_NODE:
				fragment.appendChild(document.createTextNode(xslNode.textContent));
				break;
			case Node.COMMENT_NODE:
				fragment.appendChild(document.createComment(xslNode.textContent));
				break;
			case Node.DOCUMENT_NODE:
				fragment.appendChild(xslNode.cloneNode(true));
				break;
		}

		return fragment;
	}
}

export default ProXslt;
