
export const Editor = {
	init(app) {
		// save reference to app
		this.app = app;
		// fast references
		this.els = {
			info: $(".description span"),
			xmlDoc: $(".xml-doc textarea"),
			xsltDoc: $(".xslt-doc textarea"),
			xmlDocState: $(".xml-doc .doc-state"),
			xsltDocState: $(".xslt-doc .doc-state"),
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
				let xmlDoc;
				let xslDoc;
				// try to import xml data
				try {
					xmlDoc = $.xmlFromString(Self.xmlEditor.getValue());
				} catch (err) {
					Self.els.xmlDocState.removeClass("valid").addClass("invalid");
					return;
				}
				Self.els.xmlDocState.removeClass("invalid").addClass("valid");

				// try to import template
				try {
					// Self.templates = $.xmlFromString(tmp);
					xslDoc = $.xmlFromString(Self.xsltEditor.getValue());
				} catch (err) {
					Self.els.xsltDocState.removeClass("valid").addClass("invalid");
					return;
				}
				Self.els.xsltDocState.removeClass("invalid").addClass("valid");
				
				Self.xDoc = xmlDoc;
				Self.templates = xslDoc;
				// update local storage, if needed
				Self.dispatch({ type: "save-to-local-storage" });
				// render xslt
				Output.processor.importStylesheet(Self.templates.documentElement);
				Output.dispatch({ type: "render-xslt" });
				break;
			// custom events
			case "parse-xml-fixture":
				let template = event.res.selectSingleNode("//Template");
				let xsltStr = template.textContent.trim();
				Self.templates = $.xmlFromString(xsltStr);
				// extract description
				let description = event.res.selectSingleNode("//Description");
				Self.els.info.html(description.textContent);
				// import templates
				Output.processor.importStylesheet(Self.templates.documentElement);
				// save reference xml doc
				Self.xDoc = $.xmlFromString(event.res.selectSingleNode("//XmlData/*").xml);

				Self.xmlEditor.setValue(Self.xDoc.xml);
				Self.xsltEditor.setValue(xsltStr);

				// render xslt
				Output.dispatch({ type: "render-xslt" });
				break;
			case "save-to-local-storage":
				let xmlDigest = Self.xDoc.xml.sha1();
				let templateDigest = Self.templates.xml.sha1();
				if (Self.xmlDigest === xmlDigest && Self.templateDigest === templateDigest) return;
				// save changed state to local storage
				Self.xmlDigest = xmlDigest;
				Self.templateDigest = templateDigest;
				let scheme = `<Scheme>
								<Description><![CDATA[This is a stored state]]></Description>
								<XmlData>${Self.xmlEditor.getValue()}</XmlData>
								<Template><![CDATA[${Self.xsltEditor.getValue()}]]></Template>
							</Scheme>`;
				localStorage.setItem("scheme", scheme);

				// tree focus local storage leaf
				App.sidebar.dispatch({ type: "show-focus-local-stored" });
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
			    let template = Editor.templates.selectSingleNode(`//xsl:template`);
			    let fragment = Self.processor.transformToFragment(Editor.xDoc, document);
				
				if (fragment) span.appendChild(fragment);
				Output.htmlView.setValue(span.innerHTML);
				Output.els.rendered.html(span.innerHTML);
				break;
		}
	}
};

