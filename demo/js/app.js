
import Resize from "./resize.js"
import Toolbar from "./toolbar.js"
import Sidebar from "./sidebar.js"
import XmlDoc from "./xml-doc.js"
import XsltDoc from "./xslt-doc.js"
import Output from "./output.js"

(() => {

const App = {
	init() {
		// init modules
		Object.keys(this).map(mod => this[mod].init ? this[mod].init(this) : void(0));
		// bind event handlers
		$(document).on("click", "[data-click]", this.dispatch);
	},
	dispatch(event) {
		let Self = App,
			type,
			pEl,
			el;
		switch (event.type) {
			// native events
			case "click":
				el = $(event.target);
				type = el.data("click");
				// prevent default behaviour
				event.stopPropagation();
				event.preventDefault();

				pEl = el.parents("[data-area]");
				if (pEl.length) {
					// proxy event
					Self[pEl.data("area")].dispatch({ el, type, orgEvent: event });
				}
				break;
			// custom events
			case "banana":
				break;
		}
	},
	resize: Resize,
	toolbar: Toolbar,
	sidebar: Sidebar,
	xmlDoc: XmlDoc,
	xsltDoc: XsltDoc,
	output: Output,
};

// init App
$.ready_(() => App.init());

})();
