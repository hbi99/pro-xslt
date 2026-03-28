
(() => {

const App = {
	init() {
		Resize.init();
	}
};

let Resize = {
	init() {
		// bind event handlers
		$(".divider").on("mousedown", this.dispatch);
	},
	dispatch(event) {
		let Drag = Resize.drag;
		switch (event.type) {
			case "mousedown":
				let el = $(event.target),
					dir = el.prop("className").split(" ")[1];
				// locked divider
				if (el.prop("className").includes("locked")) return;

				console.log(el);

				// bind more event handlers
				break;
			case "mousemove":
				break;
			case "mouseup":
				// unbind more event handlers
				break;
		}
	}
};

// init App
$.ready_(() => App.init());

})();
