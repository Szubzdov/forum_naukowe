import "server-only";
import sanitizeHtml from "sanitize-html";

/** Czyści HTML z edytora — zostają tylko bezpieczne tagi formatowania. */
export function cleanHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s", "mark",
      "sub", "sup", "blockquote", "ul", "ol", "li", "a", "hr", "span",
      "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      "*": ["style"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
      col: ["style"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
      },
      col: { "min-width": [/^\d+px$/], width: [/^\d+px$/] },
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
    },
  });
}
