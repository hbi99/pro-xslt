
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
			case "some-event":
				break;
		}
	}
};


export const XsltDoc = {
	init(app) {
		// save reference to app
		this.app = app;
	},
	dispatch(event) {
		let Self = XsltDoc,
			App = Self.app,
			el;
		// console.log(event);
		switch (event.type) {
			case "some-event":
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
			case "set-processor":
				Self.useProxslt = (event.arg || "pro-xslt") === "pro-xslt";
				Self.processor = Self.useProxslt ? new ProXslt : new XSLTProcessor;
				if (!Self.templates) return;
				// import templates
				Self.processor.importStylesheet(Self.templates.documentElement);
				break;
			case "set-output-mode":
				console.log(event);
				break;
		}
	}
};

