
export const XmlDoc = {
	init(app) {
		// save reference to app
		this.app = app;
	},
	dispatch(event) {
		let Self = XmlDoc,
			App = Self.app,
			el;
		// console.log(event);
		switch (event.type) {
			case "parse-xml-fixture":
				return console.log(event.res);
				let templates = event.res.selectSingleNode("//xsl:stylesheet");
				XsltDoc.templates = $.xmlFromString(templates.xml);
				templates.parentNode.removeChild(templates);
				// import templates
				XsltDoc.processor.importStylesheet(XsltDoc.templates.documentElement);
				// save reference to ledger
				Self.ledger = event.res.documentElement;
				break;
		}
	}
};


export const XsltDoc = {
	init(app) {
		// save reference to app
		this.app = app;
		// set processor
		this.dispatch({ type: "set-processor" });
	},
	dispatch(event) {
		let Self = XsltDoc,
			App = Self.app,
			el;
		// console.log(event);
		switch (event.type) {
			case "set-processor":
				Self.useProxslt = (event.arg || "pro-xslt") === "pro-xslt";
				Self.processor = Self.useProxslt ? new ProXslt : new XSLTProcessor;
				if (!Self.templates) return;
				// import templates
				Self.processor.importStylesheet(Self.templates.documentElement);
				break;
		}
	}
};


export const Output = {
	init(app) {
		// save reference to app
		this.app = app;
	},
	dispatch(event) {
		let Self = Output,
			App = Self.app,
			el;
		// console.log(event);
		switch (event.type) {
			case "set-output-mode":
				console.log(event);
				break;
		}
	}
};

