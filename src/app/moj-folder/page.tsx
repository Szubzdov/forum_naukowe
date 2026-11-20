import type { Metadata } from "next";
import Link from "next/link";
import { Eye, FilePlus2, PenLine } from "lucide-react";
import { DeleteDraftButton } from "@/components/delete-draft-button";
import { TypeBadge } from "@/components/type-badge";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/constants";
import { getMyPosts } from "@/lib/queries";

export const metadata: Metadata = { title: "Mój folder" };

export default async function MyFolderPage() {
  const user = await requireUser("/moj-folder");
  const docs = await getMyPosts(user.id);

  const stats = {
    all: docs.length,
    published: docs.filter((d) => d.publishedAt).length,
    drafts: docs.filter((d) => !d.publishedAt).length,
  };

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-20 pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">Mój folder</h1>
          <p className="mt-2 text-sm text-muted">Szkice i opublikowane dokumenty.</p>
        </div>
        <Link
          href="/edytor"
          className="inline-flex h-10 items-center gap-2 self-start rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700 sm:self-auto"
        >
          <FilePlus2 className="h-4 w-4" /> Nowy dokument
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat label="Wszystkie" value={stats.all} />
        <Stat label="Opublikowane" value={stats.published} />
        <Stat label="Szkice" value={stats.drafts} />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white">
        {docs.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <p className="font-serif text-xl font-semibold">Folder jest pusty</p>
            <p className="mt-2 text-sm text-muted">Utwórz pierwszy dokument — zapisze się tutaj jako szkic.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {docs.map((doc) => {
              const published = !!doc.publishedAt;
              // zapisane zmiany, których jeszcze nie opublikowano
              const unpublishedChanges = published && doc.updatedAt > doc.publishedAt!;
              return (
                <li key={doc.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <span
                      title={published ? "Opublikowany" : "Szkic"}
                      className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
                        published
                            ? "bg-emerald-500 ring-4 ring-emerald-50"
                            : "bg-slate-300 ring-4 ring-slate-100"
                      }`}
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/edytor/${doc.id}`}
                        className="block truncate font-serif text-[17px] font-semibold hover:text-brand-700"
                      >
                        {doc.title || "Bez tytułu"}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
                        <TypeBadge type={doc.type} />
                        {doc.categories.length > 0 && <span>{doc.categories.join(", ")}</span>}
                        <span>{doc.wordCount} słów</span>
                        <span>edytowano {formatDate(doc.updatedAt)}</span>
                        {published && <span className="text-emerald-700">opublikowano</span>}
                        {unpublishedChanges && (
                          <span className="text-amber-700">masz nieopublikowane zmiany</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 pl-6 sm:pl-0">
                    {published && (
                      <Link
                        href={`/wpis/${doc.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted hover:bg-paper hover:text-ink"
                      >
                        <Eye className="h-4 w-4" /> Zobacz
                      </Link>
                    )}
                    <Link
                      href={`/edytor/${doc.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-sm font-medium hover:bg-paper"
                    >
                      <PenLine className="h-4 w-4" /> Edytuj
                    </Link>
                    {!published && (
                      <DeleteDraftButton id={doc.id} title={doc.title} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold">{value}</p>
    </div>
  );
}
