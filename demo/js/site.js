
(() => {

const App = {
	init() {
		Resize.init();
	},
	dispatch(event) {
		switch (event.type) {
			case "resize-layout":
				break;
		}
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
				let off = org.offset(),
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
				Resize.drag = { el, org, dir, click, off, min, max };
				// bind more event handlers
				Resize.els.doc.bind("mousemove mouseup", Resize.dispatch);
				break;
			case "mousemove":
				switch (Drag.dir) {
					case "vertical":
						data.left = Math.min(Drag.max.x, Math.max(Drag.min.x, event.clientX + Drag.click.x));
						break;
					case "horisontal":
						data.top = Math.min(Drag.max.y, Math.max(Drag.min.y, event.clientY + Drag.click.y));
						break;
				}
				Drag.el.css(data);
				break;
			case "mouseup":
				let offset = Drag.el.offset(),
					bEl = Drag.org.prevAll("div:first"),
					aEl = Drag.org.nextAll("div:first"),
					diff = offset.left - Drag.off.left,
					bW = bEl.width() + diff - 7,
					aW = aEl.width() - diff - 7;
				bEl.css({ width: bW });
				aEl.css({ width: aW });

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
