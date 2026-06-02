const SELF_CLOSING_TAGS = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
    "param", "source", "stop", "track", "wbr",
]);

function formatAttributes(el) {
    let parts = [];
    for (let i = 0; i < el.attributes.length; i++) {
        let attr = el.attributes[i];
        if (attr.name === "xmlns" || attr.name.startsWith("xmlns:")) continue;
        parts.push(`${attr.name}="${attr.value}"`);
    }
    return parts.length ? " " + parts.join(" ") : "";
}

function elementChildren(el) {
    let out = [];
    for (let c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === Node.ELEMENT_NODE) out.push(c);
    }
    return out;
}

function serializeMarkupChildren(el, depth, blockLayout) {
    let inner = "";
    for (let c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === Node.ELEMENT_NODE) {
            inner += serializeMarkupElement(c, depth + 1);
        } else if (c.nodeType === Node.TEXT_NODE) {
            let t = c.textContent || "";
            if (blockLayout && /^\s*$/.test(t)) continue;
            inner += t;
        }
    }
    return inner;
}

export function serializeMarkupElement(el, depth = 0) {
    let tag = el.localName.toLowerCase();
    let attrStr = formatAttributes(el);
    let kids = elementChildren(el);
    let pad = depth > 0 ? "\n" + "    ".repeat(depth) : "";
    let blockLayout = kids.length > 0;

    if (
        (kids.length === 0 && (el.textContent || "").trim() === "") ||
        SELF_CLOSING_TAGS.has(tag)
    ) {
        return `${pad}<${tag}${attrStr} />`;
    }
    if (!blockLayout) {
        return `${pad}<${tag}${attrStr}>${el.textContent || ""}</${tag}>`;
    }
    let inner = serializeMarkupChildren(el, depth, true);
    let closePad = "\n" + "    ".repeat(depth);
    return `${pad}<${tag}${attrStr}>${inner}${closePad}</${tag}>`;
}

export function serializeFragmentMarkup(fragment) {
    let parts = [];
    for (let c = fragment.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === Node.ELEMENT_NODE) parts.push(serializeMarkupElement(c, 0));
        else if (c.nodeType === Node.TEXT_NODE) {
            let t = c.textContent || "";
            if (!/^\s*$/.test(t)) parts.push(t);
        }
    }
    return parts.join("");
}

function importMarkupElement(el) {
    let out = document.createElement(el.localName.toLowerCase());
    for (let i = 0; i < el.attributes.length; i++) {
        let attr = el.attributes[i];
        if (attr.name === "xmlns" || attr.name.startsWith("xmlns:")) continue;
        out.setAttribute(attr.name, attr.value);
    }
    for (let c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === Node.ELEMENT_NODE) out.appendChild(importMarkupElement(c));
        else if (c.nodeType === Node.TEXT_NODE) {
            let t = c.textContent || "";
            if (!/^\s*$/.test(t)) out.appendChild(document.createTextNode(t));
        }
    }
    return out;
}

function appendFromInnerHtml(fragment, markup) {
    let tpl = document.createElement("template");
    tpl.innerHTML = markup;
    fragment.appendChild(tpl.content.cloneNode(true));
}

function appendFromXml(fragment, markup) {
    let doc = new DOMParser().parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,
        "application/xml"
    );
    if (doc.querySelector("parsererror")) {
        appendFromInnerHtml(fragment, markup);
        return;
    }
    for (let c = doc.documentElement.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === Node.ELEMENT_NODE) fragment.appendChild(importMarkupElement(c));
        else if (c.nodeType === Node.TEXT_NODE) {
            let t = c.textContent || "";
            if (!/^\s*$/.test(t)) fragment.appendChild(document.createTextNode(t));
        }
    }
}

/** Parse disable-output-escaping markup; XML path when self-closing tags need it. */
export function appendDisableOutputEscaping(fragment, markup) {
    let trimmed = String(markup ?? "");
    if (!trimmed) return;
    if (/\/>/.test(trimmed)) appendFromXml(fragment, trimmed);
    else appendFromInnerHtml(fragment, trimmed);
}
