import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Lock, PenLine } from "lucide-react";
import { DocumentPages } from "@/components/document/document-pages";
import { PageFrame } from "@/components/document/page-frame";
import { ScaleToFit } from "@/components/document/scale-to-fit";
import { TypeBadge } from "@/components/type-badge";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, initials, readingMinutes } from "@/lib/constants";
import { getPublishedPost } from "@/lib/queries";
import { buildPreview } from "@/lib/preview";

export async function generateMetadata({ params }: PageProps<"/wpis/[id]">): Promise<Metadata> {
  const { id } = await params;
  const post = await getPublishedPost(id);
  return post ? { title: post.title ?? "Wpis", description: post.description ?? undefined } : {};
}

// Atrapa pod rozmyciem — prawdziwa treść nigdy nie trafia do przeglądarki niezalogowanego czytelnika
const FAKE_TEXT = [
  "Dalsza część dokumentu jest dostępna wyłącznie dla zalogowanych czytelników forum. Ta treść jest tylko wypełnieniem, które pokazuje, jak wygląda kolejna część strony, i nie zawiera właściwego tekstu autora.",
  "Po zalogowaniu zobaczysz pełny dokument z podziałem na strony, podpisem autora i wszystkimi elementami formatowania, takimi jak tabele, listy, wzory czy cytaty.",
  "Rejestracja jest bezpłatna i zajmuje mniej niż minutę. Dzięki kontu możesz także publikować własne artykuły, notatki i rozprawki.",
];

export default async function PostPage({ params }: PageProps<"/wpis/[id]">) {
  const { id } = await params;
  const [post, user] = await Promise.all([getPublishedPost(id), getCurrentUser()]);
  if (!post) notFound();

  const title = post.title ?? "";
  const isAuthor = user?.id === post.authorId;
  const next = encodeURIComponent(`/wpis/${post.id}`);

  return (
    <main className="pb-20">
      <div className="mx-auto max-w-[850px] px-4 pt-8 sm:px-6 sm:pt-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Wszystkie wpisy
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          <TypeBadge type={post.type} />
          {post.category && <span className="font-medium text-muted">{post.category}</span>}
        </div>
        <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-[40px]">{title}</h1>
        {post.description && <p className="mt-3 text-[16px] leading-relaxed text-muted">{post.description}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {initials(post.authorName)}
            </span>
            <div className="text-sm leading-tight">
              <p className="font-semibold">{post.authorName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-muted">
                {formatDate(post.firstPublishedAt)}
                {post.publishedAt && post.firstPublishedAt && post.publishedAt > post.firstPublishedAt && (
                  <span>(aktualizacja {formatDate(post.publishedAt)})</span>
                )}
                <span aria-hidden>·</span>
                <Clock className="h-3.5 w-3.5" /> {readingMinutes(post.wordCount ?? 0)} min czytania
              </p>
            </div>
          </div>
          {isAuthor && (
            <Link
              href={`/edytor/${post.id}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-medium hover:bg-paper"
            >
              <PenLine className="h-4 w-4" /> Edytuj
            </Link>
          )}
        </div>
      </div>

      <div className="mt-10 px-3 sm:px-6">
        {user ? (
          <DocumentPages title={title} html={post.html ?? ""} author={post.authorName} />
        ) : (
          <ScaleToFit>
            <PageFrame author={post.authorName} pageNumber={1} pageCount={0}>
              <div className="doc-content">
                <h1 className="doc-title">{title}</h1>
                {buildPreview(post.text ?? "").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div className="relative mt-3">
                <div aria-hidden className="doc-content select-none blur-[5px]">
                  {FAKE_TEXT.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  {FAKE_TEXT.map((p, i) => (
                    <p key={`b${i}`}>{p}</p>
                  ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/80 to-white" />
                <div className="absolute inset-x-0 top-10 flex justify-center px-6">
                  <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-[0_24px_60px_-20px_rgba(16,24,40,0.35)]">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Lock className="h-5 w-5" />
                    </span>
                    <p className="mt-4 font-serif text-2xl font-semibold">UPS!</p>
                    <p className="mt-1 font-sans text-[15px] text-ink">Nie masz dostępu do dalszego czytania.</p>
                    <p className="mt-2 font-sans text-sm text-muted">
                      Zaloguj się lub załóż bezpłatne konto, aby przeczytać cały dokument.
                    </p>
                    <div className="mt-6 flex flex-col gap-2.5 font-sans sm:flex-row sm:justify-center">
                      <Link
                        href={`/logowanie?next=${next}`}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700"
                      >
                        Zaloguj się
                      </Link>
                      <Link
                        href={`/rejestracja?next=${next}`}
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-line px-5 text-sm font-medium hover:bg-paper"
                      >
                        Załóż konto
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </PageFrame>
          </ScaleToFit>
        )}
      </div>
    </main>
  );
}
