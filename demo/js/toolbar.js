
const Toolbar = {
	init(app) {
		// save reference to app
		this.app = app;
	},
	dispatch(event) {
		let Self = Toolbar,
			App = Self.app,
			value,
			el;
		// console.log(event);
		switch (event.type) {
			case "toggle-sidebar":
				value = App.els.layout.hasClass("hide-sidebar");
				App.els.layout.toggleClass("hide-sidebar", value);
				break;
			case "toggle-theme":
				value = event.el.hasClass("on") ? "dark" : "light";
				App.els.body.data({ theme: value });
				break;
			case "set-processor":
				console.log(event);
				break;
		}
	}
};

export default Toolbar;
