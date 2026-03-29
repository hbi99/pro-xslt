
const XmlDoc = {
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

export default XmlDoc;
