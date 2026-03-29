
const Sidebar = {
	init(app) {
		// save reference to app
		this.app = app;
	},
	dispatch(event) {
		let Self = Sidebar,
			App = Self.app,
			el;
		// console.log(event);
		switch (event.type) {
			case "some-event":
				break;
		}
	}
};

export default Sidebar;
