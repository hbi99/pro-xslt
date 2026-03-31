
export const Editor = {
	init(app) {
		// save reference to app
		this.app = app;
		// fast references
		this.els = {
			info: $(".description span"),
			xmlDoc: $(".xml-doc textarea"),
			xsltDoc: $(".xslt-doc textarea"),
		};
		// empty textarea content
		$("textarea").val("");
	},
	dispatch(event) {
		let Self = Editor,
			App = Self.app,
			pEl,
			el;
		// console.log(event);
		switch (event.type) {
			// native events
			case "keyup":
				// try to import xml data
				try {
					Self.xDoc = $.xmlFromString(Self.xmlEditor.getValue());
				} catch (err) {
					return console.log("show xml error icon");
				}
				// try to import template
				try {
					let tmp = `<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="//page">
        <b><xsl:value-of select="word[1]"/></b>
        <xsl:text> </xsl:text>
        <u><xsl:value-of select="word[2]"/></u>
    </xsl:template>
</xsl:stylesheet>`;
					// Self.templates = $.xmlFromString(tmp);
					Self.templates = $.xmlFromString(Self.xsltEditor.getValue());
					Output.processor.importStylesheet(Self.templates.documentElement);
				} catch (err) {
					return console.log("show xslt error icon");
				}
				// render xslt
				Output.dispatch({ type: "render-xslt" });
				break;
			// custom events
			case "parse-xml-fixture":
				let templates = event.res.selectSingleNode("//xsl:stylesheet");
				console.log(templates.xml);
				Self.templates = $.xmlFromString(templates.xml);
				templates.parentNode.removeChild(templates);
				// extract description
				let description = event.res.selectSingleNode("//Description");
				Self.els.info.html(description.textContent);
				description.parentNode.removeChild(description);
				// import templates
				Output.processor.importStylesheet(Self.templates.documentElement);
				// save reference xml doc
				Self.xDoc = $.xmlFromString(event.res.selectSingleNode("/*/*").xml);

				Self.xmlEditor.setValue(Self.xDoc.xml);
				Self.xsltEditor.setValue(Self.templates.xml);

				// render xslt
				Output.dispatch({ type: "render-xslt" });
				break;
			case "init-editors":
				Self.xmlEditor = CodeMirror.fromTextArea(Self.els.xmlDoc[0], { mode: "text/html", lineNumbers: true });
				Self.xsltEditor = CodeMirror.fromTextArea(Self.els.xsltDoc[0], { mode: "text/html", lineNumbers: true });
				Output.htmlView = CodeMirror.fromTextArea(Output.els.html[0], { mode: "text/html", lineNumbers: true, readOnly: true });
				// attache event handlers
				Self.xmlEditor.on("keyup", e => Self.dispatch({ type: "keyup", event: e }));
				Self.xsltEditor.on("keyup", e => Self.dispatch({ type: "keyup", event: e }));
				break;
		}
	}
};


export const Output = {
	init(app) {
		// save reference to app
		this.app = app;
		// fast references
		this.els = {
			output: $(".output"),
			html: $(".output .html textarea"),
			rendered: $(".output .rendered"),
		};
		// set processor
		this.dispatch({ type: "set-processor" });
	},
	dispatch(event) {
		let Self = Output,
			App = Self.app,
			el;
		// console.log(event);
		switch (event.type) {
			case "set-processor":
				Self.useProxslt = (event.arg || "pro-xslt") === "pro-xslt";
				Self.processor = Self.useProxslt ? new ProXslt : new XSLTProcessor;
				if (!Editor.templates) return;
				// import templates
				Self.processor.importStylesheet(Editor.templates.documentElement);
				// re-render xslt
				Self.dispatch({ type: "render-xslt" });
				break;
			case "set-output-mode":
				Self.els.output.data({ view: event.arg });
				break;
			case "render-xslt":
				let span = document.createElement("span");
			    let template = Editor.templates.selectSingleNode(`//xsl:template`); // [@name='${event.template}']
			    let fragment = Self.processor.transformToFragment(Editor.xDoc, document);
				
				if (fragment) span.appendChild(fragment);
				Output.htmlView.setValue(span.innerHTML);
				Output.els.rendered.html(span.innerHTML);
				break;
		}
	}
};

