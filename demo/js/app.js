
import { Sidebar, Toolbar, Resize } from "./ui.js"
import { XmlDoc, XsltDoc, Output } from "./workarea.js"

(() => {

const App = {
	init() {
		// fast references
		this.els = {
			body: $("body"),
			layout: $(".layout"),
			sidebar: $(".sidebar"),
		};
		// init modules
		Object.keys(this).map(mod => this[mod].init ? this[mod].init(this) : void(0));
		// init app
		this.dispatch({ type: "load-ledger" });
		// bind event handlers
		$(document).on("click", "[data-click]", this.dispatch);
	},
	dispatch(event) {
		let Self = App,
			type,
			arg,
			pEl,
			el;
		switch (event.type) {
			// native events
			case "click":
				el = $(event.target);
				type = el.parents("?[data-click]").data("click");
				if (el.hasClass("disabled")) return;
				// prevent default behaviour
				event.stopPropagation();
				event.preventDefault();

				if (el.hasClass("tool") && el.hasClass("toggle")) {
					let isOn = el.hasClass("on");
					el.toggleClass("on", isOn);
				}
				if (el.parent().hasClass("options")) {
					if (el.hasClass("on")) return;
					el.parent().find(".on").removeClass("on");
					el.addClass("on");
				}

				if (el.data("arg")) {
					arg = el.data("arg");
				}

				pEl = el.parents("?[data-area]");
				if (pEl.length) {
					// proxy event
					Self[pEl.data("area")].dispatch({ el, type, arg, orgEvent: event });
				} else {
					// falls through
					Self.dispatch({ el, type, arg, orgEvent: event });
				}
				break;
			// custom events
			case "load-ledger":
				$.fetch("./xml/ledger.xml").then(xDoc => {
					let templates = xDoc.selectSingleNode("//xsl:stylesheet");
					Self.templates = $.xmlFromString(templates.xml);
					templates.parentNode.removeChild(templates);
					// import templates
					Self.processor = new ProXslt;
					Self.processor.importStylesheet(Self.templates.documentElement);
					// save reference to ledger
					Self.ledger = xDoc.documentElement;
					// console.log(Self.ledger);

					// auto render tree
					Self.dispatch({
						type: "render-template",
						template: "tree",
						match: `//Tree`,
						target: Self.els.layout.find(".sidebar"),
					});

					// temp test
					setTimeout(() => Self.els.layout.find(".leaf").get(5).trigger("click"), 200);
				});
				break;
			case "render-template":
				let span = document.createElement("span");
			    let template = Self.templates.selectSingleNode(`//xsl:template[@name='${event.template}']`);
			    template.setAttribute('match', event.match);
			    let fragment = Self.processor.transformToFragment(Self.ledger, document);
			    template.removeAttribute('match');
				
				if (fragment) span.appendChild(fragment);
				event.target.html(span.innerHTML);
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

// temp
window.App = App;

})();
