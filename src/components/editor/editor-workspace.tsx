"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Highlight from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  FileUp,
  Info,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import { publishPost, saveDraft, type DraftInput } from "@/app/actions/posts";
import { TEXT_TYPES, countWords, getTextType } from "@/lib/constants";
import { FORMAT_TIPS, HINTS } from "./hints";
import { PAD_TOP, PAD_X, PAGE_H, PAGE_W } from "@/components/document/page-frame";
import { CategoryInput } from "./category-input";
import { PAGE_GAP, Pagination } from "./pagination";
import { Toolbar } from "./toolbar";

export type EditorInitial = {
  id?: string;
  title: string;
  description: string;
  categories: string[];
  type: string;
  contentJson: unknown;
  contentHtml: string;
  isPublished: boolean;
};

const fieldCls =
  "mt-1.5 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

export function EditorWorkspace({
  initial,
  categories,
  authorName,
}: {
  initial: EditorInitial;
  categories: string[];
  authorName: string;
}) {
  const router = useRouter();
  const [id, setId] = useState(initial.id);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [categoryList, setCategoryList] = useState(initial.categories);
  const [type, setType] = useState(initial.type);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const published = initial.isPublished;
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [publishing, startPublishing] = useTransition();
  const [importing, setImporting] = useState(false);
  const [importInfo, setImportInfo] = useState<{ file: string; notes: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // Podział na strony A4 — tylko gdy kartka mieści się na ekranie w pełnej szerokości
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paged, setPaged] = useState(false);
  const [pages, setPages] = useState(1);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
        code: false,
        codeBlock: false,
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Subscript,
      Superscript,
      Highlight,
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: "Zacznij pisać, wklej tekst z Worda albo prześlij plik…" }),
      Pagination.configure({ onPageCount: (n) => setPages(n) }),
    ],
    content: (initial.contentJson as object | null) ?? (initial.contentHtml || ""),
    editorProps: {
      attributes: { class: "tiptap doc-content", spellcheck: "true", lang: "pl" },
    },
    onUpdate: () => setDirty(true),
  });

  const words = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? countWords(e.getText({ blockSeparator: "\n" })) : 0),
  }) ?? 0;

  const textType = getTextType(type);
  const busy = saving || publishing || importing;

  const payload = useCallback((): DraftInput | null => {
    if (!editor) return null;
    return {
      id,
      title,
      description,
      categories: categoryList,
      type,
      contentJson: editor.getJSON(),
      contentHtml: editor.getHTML(),
    };
  }, [editor, id, title, description, categoryList, type]);

  const afterSave = (newId: string) => {
    if (!id) {
      setId(newId);
      window.history.replaceState(null, "", `/edytor/${newId}`);
    }
  };

  const onSave = useCallback(() => {
    const data = payload();
    if (!data) return;
    startSaving(async () => {
      const res = await saveDraft(data);
      if (res.ok) {
        afterSave(res.id);
        setSavedAt(new Date(res.savedAt));
        setDirty(false);
      } else {
        setError(res.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  const onPublish = () => {
    const data = payload();
    if (!data) return;
    setError(null);
    startPublishing(async () => {
      const res = await publishPost(data);
      if (res.ok) {
        setDirty(false);
        router.push(`/wpis/${res.id}`);
        return;
      }
      if (res.id) {
        afterSave(res.id);
        setDirty(false);
        setSavedAt(new Date());
      }
      setError(res.error);
    });
  };

  // Prześlij plik Word/PDF → serwer zamienia go na HTML → treść trafia do edytora
  const onImport = async (file: File | undefined) => {
    if (!file || !editor) return;
    if (file.size > 15 * 1024 * 1024) {
      setError("Plik jest za duży (maksymalnie 15 MB).");
      return;
    }
    if (words > 0 && !window.confirm(`Zastąpić obecną treść dokumentu treścią z pliku „${file.name}”?`)) return;
    setError(null);
    setImportInfo(null);
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as {
        html?: string;
        title?: string | null;
        notes?: string[];
        error?: string;
      };
      if (!res.ok || !data.html) {
        setError(data.error ?? "Nie udało się wczytać pliku.");
        return;
      }
      editor.chain().setContent(data.html, { emitUpdate: true }).focus("start").run();
      if (!title.trim() && data.title) setTitle(data.title.slice(0, 200));
      setDirty(true);
      setImportInfo({ file: file.name, notes: data.notes ?? [] });
    } catch {
      setError("Nie udało się przesłać pliku. Sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const cs = getComputedStyle(el);
      const inner = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setPaged(inner >= PAGE_W);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Ctrl+S = zapisz szkic
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSave]);

  // Ostrzeżenie przed opuszczeniem strony z niezapisanymi zmianami
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const progress = Math.min(100, Math.round((words / textType.minWords) * 100));

  return (
    <div className="grid lg:h-[calc(100vh-4rem)] lg:grid-cols-[360px_1fr]">
      {/* ---------- Panel po lewej ---------- */}
      <aside className="border-b border-line bg-white lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between">
            <Link href="/moj-folder" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Mój folder
            </Link>
            <StatusPill published={published} />
          </div>

          <div>
            <input
              ref={fileInput}
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => onImport(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                onImport(e.dataTransfer.files?.[0]);
              }}
              disabled={busy || !editor}
              className={`flex w-full items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 text-left transition disabled:opacity-60 ${
                dragOver ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-500 hover:bg-brand-50/50"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {importing ? "Wczytywanie pliku…" : "Prześlij plik"}
                </span>
                <span className="block text-xs text-muted">Word (.docx) lub PDF — albo przeciągnij go tutaj</span>
              </span>
            </button>
            {importInfo && (
              <div className="mt-2 flex gap-2 rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-900 ring-1 ring-inset ring-sky-200">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p>
                    Wczytano <strong>{importInfo.file}</strong>. Sprawdź treść i zapisz szkic.
                  </p>
                  {importInfo.notes.map((n) => (
                    <p key={n} className="mt-1">
                      {n}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label className="block text-sm font-medium">
            Tytuł
            <input
              value={title}
              onChange={(e) => touch(setTitle)(e.target.value)}
              maxLength={200}
              placeholder="Np. Wpływ snu na pamięć"
              className={`${fieldCls} h-10 font-serif text-[15px]`}
            />
          </label>

          <label className="block text-sm font-medium">
            Krótki opis
            <textarea
              value={description}
              onChange={(e) => touch(setDescription)(e.target.value)}
              maxLength={400}
              rows={3}
              placeholder="1–2 zdania, które zobaczą czytelnicy na liście wpisów."
              className={`${fieldCls} resize-none py-2 leading-relaxed`}
            />
            <span className="mt-1 block text-right text-xs font-normal text-muted">{description.length}/400</span>
          </label>

          <div className="block text-sm font-medium">
            Kategorie
            <CategoryInput value={categoryList} onChange={touch(setCategoryList)} suggestions={categories} />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Rodzaj tekstu
              <select value={type} onChange={(e) => touch(setType)(e.target.value)} className={`${fieldCls} h-10`}>
                {TEXT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium text-ink">
                {words} / {textType.minWords} słów
              </span>
              <span className="text-muted">minimum dla: {textType.label.toLowerCase()}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper">
              <div
                className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-emerald-500" : "bg-brand-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onSave}
              disabled={busy || !editor}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line bg-white text-sm font-medium hover:bg-paper disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Zapisz szkic
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={busy || !editor}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {published ? "Opublikuj zmiany" : "Publikuj"}
            </button>
          </div>
          <p className="-mt-2 text-xs text-muted">
            {publishing
              ? "Publikowanie…"
              : savedAt
                ? `Zapisano o ${savedAt.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`
                : dirty
                  ? "Masz niezapisane zmiany."
                  : " "}
          </p>

          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Podpowiedzi</p>
            {HINTS.map((h) => (
              <Accordion key={h.type} title={h.title} defaultOpen={h.type === type}>
                <ul className="list-disc space-y-1.5 pl-4">
                  {h.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </Accordion>
            ))}
            <Accordion title="Formatowanie i skróty">
              <ul className="list-disc space-y-1.5 pl-4">
                {FORMAT_TIPS.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </Accordion>
          </div>
        </div>
      </aside>

      {/* ---------- Dokument po prawej ---------- */}
      <section className="flex min-w-0 flex-col bg-[#eceae4] lg:overflow-hidden">
        <div className="sticky top-16 z-10 border-b border-line bg-white/95 backdrop-blur lg:static">
          {editor ? <Toolbar editor={editor} /> : <div className="h-11" />}
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-6 sm:px-8 sm:py-10">
          <div
            className={
              paged
                ? "relative mx-auto"
                : "mx-auto w-full max-w-[210mm] rounded-sm bg-white px-6 py-10 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_20px_40px_-20px_rgba(0,0,0,0.25)] sm:px-[20mm] sm:py-[22mm] min-h-[297mm]"
            }
            data-paged={paged ? "true" : undefined}
            style={paged ? { width: PAGE_W, minHeight: pages * PAGE_H + (pages - 1) * PAGE_GAP } : undefined}
          >
            {paged &&
              Array.from({ length: pages }, (_, i) => (
                <div
                  key={i}
                  aria-hidden
                  className="pointer-events-none absolute left-0 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08),0_20px_40px_-20px_rgba(0,0,0,0.25)]"
                  style={{ top: i * (PAGE_H + PAGE_GAP), width: PAGE_W, height: PAGE_H }}
                >
                  <span className="absolute bottom-[22px] left-[30px] font-sans text-[10.5px] text-[#8a8f9c]">
                    {i + 1} / {pages}
                  </span>
                  <span className="absolute bottom-[22px] right-[30px] font-sans text-[10.5px] font-medium text-[#5d6270]">
                    {authorName}
                  </span>
                </div>
              ))}
            <div className={paged ? "relative" : undefined} style={paged ? { padding: `${PAD_TOP}px ${PAD_X}px 0` } : undefined}>
              <div data-page-content>
                {title && (
                  <div className="doc-content">
                    <h1 className="doc-title">{title}</h1>
                  </div>
                )}
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
          {!paged && <p className="mx-auto mt-4 max-w-[210mm] text-right text-xs text-muted">Autor: {authorName}</p>}
        </div>
      </section>
    </div>
  );
}

function StatusPill({ published }: { published: boolean }) {
  if (published)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Opublikowany
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-inset ring-line">
      <span className="h-2 w-2 rounded-full bg-slate-400" /> Szkic
    </span>
  );
}

function Accordion({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-line bg-white open:bg-paper/50">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="h-4 w-4 text-muted transition group-open:rotate-180" />
      </summary>
      <div className="px-3.5 pb-3.5 text-[13px] leading-relaxed text-muted">{children}</div>
    </details>
  );
}
