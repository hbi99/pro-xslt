
export const Editor = {
	init(app) {
		// save reference to app
		this.app = app;
		// fast references
		this.els = {
			xmlDoc: $(".xml-doc"),
			xsltDoc: $(".xslt-doc"),
		};
		// init editors
		this.dispatch({ type: "init-editor" });
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
			case "init-editor":
				// Initialize Monaco Editor
		        require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });

		        require(["vs/editor/editor.main"], function () {
		        	// Define editor theme
		            monaco.editor.defineTheme("xslt-theme", {
		                base: "vs",
		                inherit: true,
		                rules: [],
		                colors: {
		                	"editor.background": "#ffffff00",
		                }
		            });

		            let commonOptions = {
		                theme: "xslt-theme",
		                minimap: { enabled: false },
		                fontSize: 12,
		                lineNumbers: "on",
		                scrollBeyondLastLine: false,
		                automaticLayout: true,
		                tabSize: 3,
		                insertSpaces: true,
		                wordWrap: "on",
		                padding: { top: 10 }
		            };

		            Self.xmlEditor = monaco.editor.create(Self.els.xmlDoc[0], { ...commonOptions, language: "xml" });
		            Self.xsltEditor = monaco.editor.create(Self.els.xsltDoc[0], { ...commonOptions, language: "xml" });
		            Output.htmlView = monaco.editor.create(Output.els.html[0], { ...commonOptions, language: "html", readOnly: true });
       			});
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
			html: $(".output .html"),
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
				console.log(span.innerHTML);
				break;
		}
	}
};

