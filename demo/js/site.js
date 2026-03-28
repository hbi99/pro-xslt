
(() => {

const App = {
	init() {
		Resize.init();
	}
};

let Resize = {
	init() {
		// fast references
		this.els = {
			doc: $(document),
			body: $("body"),
		};
		// bind event handlers
		$(".divider").on("mousedown", this.dispatch);
	},
	dispatch(event) {
		let Drag = Resize.drag,
			data = {};
		switch (event.type) {
			case "mousedown":
				// prevent default behaviour
				event.preventDefault();
				// element info
				let org = $(event.target),
					dir = org.prop("className").split(" ")[1];
				// locked divider
				if (org.prop("className").includes("locked")) return;
				// collect info
				let offset = org.offset(),
					el = org.clone().addClass("clone").css(offset),
					click = {
						x : event.clientX - offset.left - event.offsetX - 14,
						y : event.clientY - offset.top - event.offsetY - 7,
					},
					min = {
						x: 0,
						y: 0
					},
					max = {
						x: 1e3,
						y: 1e3
					};
				// insert clone in to DOM and cover body
				Resize.els.body.addClass("covered").append(el);
				el = Resize.els.body.find(".clone");
				// safe drag details
				Resize.drag = { el, dir, click, min, max };
				// bind more event handlers
				Resize.els.doc.bind("mousemove mouseup", Resize.dispatch);
				break;
			case "mousemove":
				switch (Drag.dir) {
					case "vertical":
						data.left = Math.max(Drag.min.x, event.clientX + Drag.click.x);
						break;
					case "horisontal":
						data.top = Math.max(Drag.min.y, event.clientY + Drag.click.y);
						break;
				}
				Drag.el.css(data);
				break;
			case "mouseup":
				// delete clone from DOM
				Drag.el.remove();
				// reset body
				Resize.els.body.removeClass("covered");
				// unbind more event handlers
				Resize.els.doc.unbind("mousemove mouseup", Resize.dispatch);
				break;
		}
	}
};

// init App
$.ready_(() => App.init());

})();
