
const Toolbar = {
	init(app) {
		// save reference to app
		this.app = app;
	},
	dispatch(event) {
		let Self = Toolbar,
			App = Self.app,
			el;
		// console.log(event);
		switch (event.type) {
			case "toggle-sidebar":
				console.log(event);
				break;
		}
	}
};

export default Toolbar;
