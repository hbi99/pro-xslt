export function parseAttributeSets(xslDoc) {
    let defs = xslDoc.selectNodes("//xsl:stylesheet/xsl:attribute-set");
    let byName = {};

    defs.forEach((def) => {
        let name = def.getAttribute("name");
        if (!name) return;

        let use = def.getAttribute("use-attribute-sets") || "";
        let uses = use.split(/\s+/).map((s) => s.trim()).filter(Boolean);
        let attrs = Array.from(def.childNodes).filter((n) => {
            return n.nodeType === Node.ELEMENT_NODE && n.nodeName === "xsl:attribute";
        });

        if (!byName[name]) byName[name] = [];
        byName[name].push({ uses, attrs });
    });

    return byName;
}

