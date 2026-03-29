
const Output = {
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

export default Output;
