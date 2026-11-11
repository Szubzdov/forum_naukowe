"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  Underline,
  Undo2,
} from "lucide-react";
import type { ReactNode } from "react";

function Btn({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-[13px] transition disabled:opacity-35 ${
        active ? "bg-brand-100 text-brand-700" : "text-ink/80 hover:bg-paper hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />;

export function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "p",
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      sub: e.isActive("subscript"),
      sup: e.isActive("superscript"),
      highlight: e.isActive("highlight"),
      left: e.isActive({ textAlign: "left" }),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      justify: e.isActive({ textAlign: "justify" }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      canSink: e.can().sinkListItem("listItem"),
      canLift: e.can().liftListItem("listItem"),
    }),
  });

  const chain = () => editor.chain().focus();

  const setBlock = (value: string) => {
    if (value === "p") chain().setParagraph().run();
    else chain().setHeading({ level: Number(value[1]) as 1 | 2 | 3 }).run();
  };

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Adres linku (zostaw puste, aby usunąć):", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "" || url === "https://") {
      chain().extendMarkRange("link").unsetLink().run();
      return;
    }
    chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
      <Btn label="Cofnij (Ctrl+Z)" onClick={() => chain().undo().run()} disabled={!s.canUndo}>
        <Undo2 className="h-4 w-4" />
      </Btn>
      <Btn label="Ponów (Ctrl+Y)" onClick={() => chain().redo().run()} disabled={!s.canRedo}>
        <Redo2 className="h-4 w-4" />
      </Btn>
      <Sep />
      <select
        value={s.block}
        onChange={(e) => setBlock(e.target.value)}
        aria-label="Styl akapitu"
        className="h-8 rounded-md border border-line bg-white px-2 text-[13px] outline-none hover:bg-paper focus:border-brand-500"
      >
        <option value="p">Tekst</option>
        <option value="h1">Nagłówek 1</option>
        <option value="h2">Nagłówek 2</option>
        <option value="h3">Nagłówek 3</option>
      </select>
      <Sep />
      <Btn label="Pogrubienie (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn label="Kursywa (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </Btn>
      <Btn label="Podkreślenie (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <Underline className="h-4 w-4" />
      </Btn>
      <Btn label="Przekreślenie" active={s.strike} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </Btn>
      <Btn label="Zakreślacz" active={s.highlight} onClick={() => chain().toggleHighlight().run()}>
        <Highlighter className="h-4 w-4" />
      </Btn>
      <Btn label="Indeks dolny" active={s.sub} onClick={() => chain().toggleSubscript().run()}>
        <Subscript className="h-4 w-4" />
      </Btn>
      <Btn label="Indeks górny" active={s.sup} onClick={() => chain().toggleSuperscript().run()}>
        <Superscript className="h-4 w-4" />
      </Btn>
      <Sep />
      <Btn label="Do lewej" active={s.left} onClick={() => chain().setTextAlign("left").run()}>
        <AlignLeft className="h-4 w-4" />
      </Btn>
      <Btn label="Do środka" active={s.center} onClick={() => chain().setTextAlign("center").run()}>
        <AlignCenter className="h-4 w-4" />
      </Btn>
      <Btn label="Do prawej" active={s.right} onClick={() => chain().setTextAlign("right").run()}>
        <AlignRight className="h-4 w-4" />
      </Btn>
      <Btn label="Wyjustuj" active={s.justify} onClick={() => chain().setTextAlign("justify").run()}>
        <AlignJustify className="h-4 w-4" />
      </Btn>
      <Sep />
      <Btn label="Lista punktowana" active={s.bullet} onClick={() => chain().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </Btn>
      <Btn label="Lista numerowana" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </Btn>
      <Btn label="Zmniejsz wcięcie" disabled={!s.canLift} onClick={() => chain().liftListItem("listItem").run()}>
        <IndentDecrease className="h-4 w-4" />
      </Btn>
      <Btn label="Zwiększ wcięcie" disabled={!s.canSink} onClick={() => chain().sinkListItem("listItem").run()}>
        <IndentIncrease className="h-4 w-4" />
      </Btn>
      <Sep />
      <Btn label="Cytat" active={s.quote} onClick={() => chain().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </Btn>
      <Btn label="Link" active={s.link} onClick={setLink}>
        <Link2 className="h-4 w-4" />
      </Btn>
      <Btn label="Linia pozioma" onClick={() => chain().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </Btn>
      <Btn
        label="Wstaw tabelę 3×3"
        active={s.table}
        onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <Table className="h-4 w-4" />
      </Btn>
      <Btn label="Wyczyść formatowanie" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
        <RemoveFormatting className="h-4 w-4" />
      </Btn>

      {s.table && (
        <div className="flex w-full flex-wrap items-center gap-0.5 border-t border-line pt-1.5 mt-1 text-[12px]">
          <span className="px-2 font-medium text-muted">Tabela:</span>
          <Btn label="Dodaj wiersz" onClick={() => chain().addRowAfter().run()}>+ wiersz</Btn>
          <Btn label="Dodaj kolumnę" onClick={() => chain().addColumnAfter().run()}>+ kolumna</Btn>
          <Btn label="Usuń wiersz" onClick={() => chain().deleteRow().run()}>− wiersz</Btn>
          <Btn label="Usuń kolumnę" onClick={() => chain().deleteColumn().run()}>− kolumna</Btn>
          <Btn label="Scal / rozdziel komórki" onClick={() => chain().mergeOrSplit().run()}>scal</Btn>
          <Btn label="Usuń tabelę" onClick={() => chain().deleteTable().run()}>
            <span className="text-red-700">usuń tabelę</span>
          </Btn>
        </div>
      )}
    </div>
  );
}
