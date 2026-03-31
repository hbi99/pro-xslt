
export const Sidebar = {
	init(app) {
		// save reference to app
		this.app = app;
	},
	dispatch(event) {
		let Self = Sidebar,
			App = Self.app,
			value, xDoc, 
			el;
		// console.log(event);
		switch (event.type) {
			case "init-tree":
				// set leaf id
				App.ledger.selectNodes(`//Tree//*`).map((xLeaf, i) => xLeaf.setAttribute("_id", i+1));
				// auto render tree
				App.dispatch({
					type: "render-template",
					template: "tree",
					match: `//Tree`,
					target: App.els.layout.find(".sidebar"),
				});
				break;
			case "select-tree-item":
				el = $(event.orgEvent.target);
				if (el.hasClass("icon-chevron-right")) {
					let leaf = el.parents(".leaf").get(0);
					let target = leaf.find(".children:first");
					if (!target[0].childNodes.length) {
						// render childnodes
						App.dispatch({
							type: "render-template",
							template: "tree",
							match: `//Tree//*[@_id="${leaf.data("id")}"]`,
							target,
						});
					}
					setTimeout(() => leaf.toggleClass("open", leaf.hasClass("open")), 20);
					return;
				}
				// get leaf item
				el = event.el.parents("?.leaf").get(0);
				// toggle folder icon
				if (el.find("> span").data("type") != "xml") {
					return el.find(".icon-chevron-right").trigger("click");
				}
				// UI update
				App.els.sidebar.find(".active").removeClass("active");
				el.addClass("active");

				let folder = el.parents(".leaf").get(0).find("> span > b").text(),
					name = el.find("> span > b").text(),
					type = el.find("> span").data("type");
				if (type) {
					$.fetch(`../tests/fixture/${folder}/${name}.${type}`)
						.then(res => App.editor.dispatch({ type: "parse-xml-fixture", res }));
				}
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
			case "toggle-info":
				value = App.els.layout.hasClass("show-info");
				App.els.layout.toggleClass("show-info", value);
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
			"sidebar": { min: { x: 100 }, max: { x: 300 } },
			"xml-doc": { min: { x: 500 }, max: { x: 1050 } },
			"workarea": { min: { y: 600 }, max: { y: 1050 } },
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
					{ min, max } = Resize.constrains[bEl.prop("className").split(" ")[0]];
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

