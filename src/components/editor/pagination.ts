import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { CONTENT_H, PAGE_H } from "@/components/document/page-frame";

/** Odstęp między kartkami w edytorze (px) */
export const PAGE_GAP = 28;

type Spacer = { pos: number; height: number };

type PaginationOptions = {
  /** Liczba stron po każdym przeliczeniu */
  onPageCount: (pages: number) => void;
};

const key = new PluginKey<DecorationSet>("pagination");
const SPACER_CLASS = "pb-spacer";

function spacerWidget(height: number) {
  const el = document.createElement("div");
  el.className = SPACER_CLASS;
  el.contentEditable = "false";
  el.setAttribute("aria-hidden", "true");
  el.style.height = `${height}px`;
  el.style.margin = "0";
  return el;
}

/**
 * Liczy, przed którymi blokami zaczyna się nowa strona — tak samo jak widok wpisu
 * (`DocumentPages`): blok, który nie mieści się na stronie, przechodzi w całości na następną,
 * a listy dzielone są po punktach. Wysokości mierzymy „naturalne”, czyli bez wstawionych odstępów,
 * więc wynik nie zależy od poprzedniego podziału.
 */
function measure(view: EditorView): { spacers: Spacer[]; pages: number } {
  const root = view.dom as HTMLElement;
  const content = root.closest("[data-page-content]") as HTMLElement | null;
  if (!content) return { spacers: [], pages: 1 };
  const box = content.getBoundingClientRect();
  const scale = box.width / content.offsetWidth || 1; // gdy strona jest pomniejszona (zoom)
  const top = (el: Element) => (el.getBoundingClientRect().top - box.top) / scale;
  const height = (el: HTMLElement) => el.getBoundingClientRect().height / scale;
  const marginTop = (el: Element | undefined) => (el ? parseFloat(getComputedStyle(el).marginTop) || 0 : 0);

  const spacers: Spacer[] = [];
  let page = 0; // indeks bieżącej strony
  let pageStart = 0; // „naturalna” pozycja początku treści bieżącej strony
  let oldSpacers = 0; // suma wysokości obecnych odstępów nad mierzonym elementem
  let newSpacers = 0; // suma wysokości nowych odstępów
  // poprzedni blok, jeśli to nagłówek — nie może zostać sam na dole strony (jak w widoku wpisu)
  let prevHeading: { pos: number; natTop: number } | null = null;

  /** Nowa strona zaczyna się od elementu, którego naturalna góra to `natTop` */
  const breakBefore = (pos: number, natTop: number) => {
    if (prevHeading && prevHeading.natTop > pageStart + 0.5) {
      // przenieś nagłówek razem z blokiem, który po nim następuje
      pos = prevHeading.pos;
      natTop = prevHeading.natTop;
    }
    prevHeading = null;
    page += 1;
    const target = page * (PAGE_H + PAGE_GAP); // góra treści nowej strony
    const h = Math.max(0, target - (natTop + newSpacers));
    spacers.push({ pos, height: Math.round(h * 100) / 100 });
    newSpacers += h;
    pageStart = natTop;
  };

  const children = Array.from(root.children) as HTMLElement[];
  const blocks = children.filter((c) => !c.classList.contains(SPACER_CLASS));
  // pozycje węzłów najwyższego poziomu (DOM bez odstępów odpowiada im 1:1)
  const nodes: { pos: number; childPos: number[] }[] = [];
  view.state.doc.forEach((node, offset) => {
    const childPos: number[] = [];
    node.forEach((_child, childOffset) => childPos.push(offset + 1 + childOffset));
    nodes.push({ pos: offset, childPos });
  });
  if (nodes.length !== blocks.length) return { spacers: [], pages: 1 }; // DOM jeszcze nieaktualny

  for (let i = 0, ci = 0; ci < children.length; ci++) {
    const el = children[ci];
    if (el.classList.contains(SPACER_CLASS)) {
      oldSpacers += height(el);
      continue;
    }
    const next = blocks[i + 1];
    const node = nodes[i];
    i += 1;
    const inner = Array.from(el.querySelectorAll(`:scope > .${SPACER_CLASS}`)) as HTMLElement[];
    const innerH = inner.reduce((s, x) => s + height(x), 0);
    const natTop = top(el) - oldSpacers;
    const natBottom = natTop + height(el) - innerH;
    const fits = natTop <= pageStart + 0.5 || natBottom + marginTop(next) - pageStart <= CONTENT_H;

    const isList = el.tagName === "UL" || el.tagName === "OL";
    const items = isList ? (Array.from(el.children) as HTMLElement[]).filter((c) => c.tagName === "LI") : [];

    if (isList && !fits && items.length > 1) {
      // lista dzielona po punktach
      for (const child of Array.from(el.children) as HTMLElement[]) {
        if (child.classList.contains(SPACER_CLASS)) {
          oldSpacers += height(child);
          continue;
        }
        if (child.tagName !== "LI") continue;
        const j = items.indexOf(child);
        const liTop = top(child) - oldSpacers;
        const liBottom = liTop + height(child);
        const after = j < items.length - 1 ? marginTop(items[j + 1]) : 12;
        if (liTop > pageStart + 0.5 && liBottom + after - pageStart > CONTENT_H && node.childPos[j] !== undefined) {
          // nagłówek idzie z listą tylko wtedy, gdy nie mieści się już pierwszy punkt
          if (j > 0) prevHeading = null;
          breakBefore(node.childPos[j], liTop);
        }
        prevHeading = null;
      }
      continue;
    }

    oldSpacers += innerH;
    if (!fits) breakBefore(node.pos, natTop);
    prevHeading = /^H[1-6]$/.test(el.tagName) ? { pos: node.pos, natTop } : null;
  }

  return { spacers, pages: page + 1 };
}

function sameSpacers(a: Spacer[], b: Spacer[]) {
  return a.length === b.length && a.every((s, i) => s.pos === b[i].pos && Math.abs(s.height - b[i].height) < 1);
}

export const Pagination = Extension.create<PaginationOptions>({
  name: "pagination",

  addOptions() {
    return { onPageCount: () => {} };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    let current: Spacer[] = [];

    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            const next = tr.getMeta(key) as Spacer[] | undefined;
            if (next) {
              return DecorationSet.create(
                tr.doc,
                next.map((s) =>
                  Decoration.widget(s.pos, () => spacerWidget(s.height), {
                    side: -1,
                    ignoreSelection: true,
                    key: `pb-${s.pos}-${s.height}`,
                  }),
                ),
              );
            }
            return set.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations: (state) => key.getState(state),
        },
        view(view) {
          let frame = 0;
          const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
              if (view.isDestroyed) return;
              // na wąskich ekranach edytor jest ciągły (kartka bez atrybutu data-paged)
              const enabled = !!(view.dom as HTMLElement).closest('[data-paged="true"]');
              const { spacers, pages } = enabled ? measure(view) : { spacers: [], pages: 1 };
              options.onPageCount(pages);
              if (!sameSpacers(spacers, current)) {
                current = spacers;
                view.dispatch(view.state.tr.setMeta(key, spacers).setMeta("addToHistory", false));
              }
            });
          };
          // zmiana rozmiaru treści (tytuł, czcionki, szerokość okna) też przelicza strony
          const content = (view.dom as HTMLElement).closest("[data-page-content]");
          const observer = new ResizeObserver(schedule);
          if (content) observer.observe(content);
          document.fonts?.ready.then(schedule);
          schedule();
          return {
            update: (_view, prev) => {
              if (!prev.doc.eq(view.state.doc)) schedule();
            },
            destroy: () => {
              cancelAnimationFrame(frame);
              observer.disconnect();
            },
          };
        },
      }),
    ];
  },
});
