
const XsltDoc = {
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

export default XsltDoc;
