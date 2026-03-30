
export const Editor = {
	init(app) {
		// save reference to app
		this.app = app;
		// fast references
		this.els = {
			xmlDoc: $(".xml-doc textarea"),
			xsltDoc: $(".xslt-doc textarea"),
		};
		// empty textarea content
		$("textarea").val("");
	},
	dispatch(event) {
		let Self = Editor,
			App = Self.app,
			el;
		// console.log(event);
		switch (event.type) {
			case "parse-xml-fixture":
				let templates = event.res.selectSingleNode("//xsl:stylesheet");
				Self.templates = $.xmlFromString(templates.xml);
				templates.parentNode.removeChild(templates);
				// extract description
				let description = event.res.selectSingleNode("//Description");
				Self.description = description.textContent;
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

