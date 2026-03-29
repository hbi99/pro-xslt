
export const Sidebar = {
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
			case "select-tree-item":
				console.log(event);
				break;
		}
	}
};


export const Toolbar = {
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
				App.output.dispatch(event);
				break;
		}
	}
};


export const Resize = {
	init(app) {
		// save reference to app
		this.app = app;
		// fast references
		this.els = {
			doc: $(document),
			body: $("body"),
		};
		// resize constraints for areas
		this.constrains = {
			tree: { min: { x: 100 }, max: { x: 300 } },
			xmlDoc: { min: { x: 200 }, max: { x: 600 } },
			workarea: { min: { x: 600 }, max: { x: 1050 } },
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
				if (!org.prop("className").includes("divider") || org.prop("className").includes("locked")) return;
				// collect info
				let bEl = org.prevAll("div:first"),
					aEl = org.nextAll("div:first"),
					off = org.offset(),
					el = org.clone().addClass("clone").css(off),
					click = {
						x : event.clientX - off.left - event.offsetX - 14,
						y : event.clientY - off.top - event.offsetY - 14,
					},
					min = {
						x: 440,
						y: 500
					},
					max = {
						x: 950,
						y: 1050
					};
				// insert clone in to DOM and cover body
				Resize.els.body.addClass("covered").append(el);
				el = Resize.els.body.find(".clone");
				// safe drag details
				Resize.drag = { el, bEl, aEl, dir, click, off, min, max };
				// bind more event handlers
				Resize.els.doc.bind("mousemove mouseup", Resize.dispatch);
				break;
			case "mousemove":
				if (Drag.dir === "vertical") {
					data.left = Math.min(Drag.max.x, Math.max(Drag.min.x, event.clientX + Drag.click.x));
				} else { // horisontal
					data.top = Math.min(Drag.max.y, Math.max(Drag.min.y, event.clientY + Drag.click.y));
				}
				Drag.el.css(data);
				break;
			case "mouseup":
				if (Drag.dir === "vertical") {
					let offset = Drag.el.offset(),
						diff = offset.left - Drag.off.left,
						bW = Drag.bEl.width() + diff - 7,
						aW = Drag.aEl.width() - diff - 7;
					Drag.bEl.css({ width: bW });
					Drag.aEl.css({ width: aW });
				} else { // horisontal
					let offset = Drag.el.offset(),
						diff = offset.top - Drag.off.top,
						bH = Drag.bEl.height() + diff - 7,
						aH = Drag.aEl.height() - diff - 7;
					Drag.bEl.css({ height: bH });
					Drag.aEl.css({ height: aH });
				}
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

