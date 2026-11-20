import Link from "next/link";
import { ArrowUpRight, Clock, FileText } from "lucide-react";
import { formatDate, initials, readingMinutes } from "@/lib/constants";
import { buildPreview } from "@/lib/preview";
import { PAGE_H, PAGE_W, PageFrame } from "./document/page-frame";
import { TypeBadge } from "./type-badge";

export type PostCardData = {
  id: string;
  title: string | null;
  description: string | null;
  type: string | null;
  categories: string[];
  wordCount: number | null;
  excerpt: string | null;
  publishedAt: Date | null;
  authorName: string;
};

/** Szacunkowa liczba słów na stronie A4 w widoku wpisu */
const WORDS_PER_PAGE = 420;

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Krótka linijka bez kropki na końcu to najpewniej śródtytuł */
function looksLikeHeading(p: string) {
  return p.length < 70 && !/[.!?:;…,]$/.test(p);
}

/** Miniatura pierwszej strony dokumentu — ta sama ramka A4 co w widoku wpisu, przeskalowana przez SVG */
function PagePreview({ post }: { post: PostCardData }) {
  const paragraphs = buildPreview(post.excerpt ?? "");
  return (
    <svg viewBox={`0 0 ${PAGE_W} ${PAGE_H}`} className="block h-auto w-full" aria-hidden>
      <foreignObject x="0" y="0" width={PAGE_W} height={PAGE_H}>
        <PageFrame author={post.authorName} pageNumber={1} pageCount={0}>
          <div className="doc-content">
            <h1 className="doc-title">{post.title}</h1>
            {paragraphs.map((p, i) =>
              looksLikeHeading(p) ? <h2 key={i}>{p}</h2> : <p key={i}>{p}</p>,
            )}
          </div>
        </PageFrame>
      </foreignObject>
    </svg>
  );
}

export function PostCard({ post, featured = false }: { post: PostCardData; featured?: boolean }) {
  const pages = Math.max(1, Math.ceil((post.wordCount ?? 0) / WORDS_PER_PAGE));
  const authorHue = hashString(post.authorName) % 360;

  return (
    <Link
      href={`/wpis/${post.id}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition duration-300 hover:-translate-y-1 hover:border-[#d6d3cb] hover:shadow-[0_24px_48px_-24px_rgba(20,22,28,0.3)] ${
        featured ? "sm:col-span-2 lg:col-span-3 lg:flex-row" : ""
      }`}
    >
      {/* ---------- Podgląd pliku: górna część pierwszej strony ---------- */}
      <div
        className={`relative shrink-0 overflow-hidden border-line bg-[#eceae4] ${
          featured
            ? "h-72 border-b px-8 pt-8 sm:h-80 lg:h-[400px] lg:w-[48%] lg:border-b-0 lg:border-r lg:px-12 lg:pt-10"
            : "h-60 border-b px-7 pt-6"
        }`}
      >
        <div
          className={`mx-auto rounded-t-[2px] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_12px_28px_-10px_rgba(0,0,0,0.25)] transition duration-500 ease-out group-hover:-translate-y-1.5 ${
            featured ? "max-w-[440px]" : ""
          }`}
        >
          <PagePreview post={post} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#eceae4] to-transparent" />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-muted shadow-sm ring-1 ring-line">
          <FileText className="h-3 w-3" />
          {pages} {pages === 1 ? "strona" : pages < 5 ? "strony" : "stron"}
        </span>
      </div>

      {/* ---------- Opis ---------- */}
      <div className={`flex flex-1 flex-col ${featured ? "p-6 sm:p-8 lg:p-10" : "p-5"}`}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {featured && (
            <span className="rounded-full bg-ink px-2.5 py-0.5 font-semibold text-white">Najnowsze</span>
          )}
          <TypeBadge type={post.type} />
          {post.categories.length > 0 && (
            <span className="min-w-0 truncate font-medium text-muted">
              {post.categories.slice(0, 3).join(" · ")}
              {post.categories.length > 3 && ` +${post.categories.length - 3}`}
            </span>
          )}
        </div>

        <h2
          className={`mt-3 font-serif font-semibold tracking-tight text-ink transition-colors group-hover:text-brand-700 ${
            featured ? "text-[28px] leading-[1.15] sm:text-[34px] line-clamp-3" : "text-[19px] leading-snug line-clamp-2"
          }`}
        >
          {post.title}
        </h2>
        {post.description && (
          <p
            className={`mt-2 leading-relaxed text-muted ${featured ? "text-base line-clamp-4" : "text-[14px] line-clamp-2"}`}
          >
            {post.description}
          </p>
        )}

        <div className="mt-auto flex items-center gap-3 pt-5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
            style={{
              background: `linear-gradient(135deg, hsl(${authorHue} 55% 52%), hsl(${(authorHue + 40) % 360} 50% 36%))`,
            }}
          >
            {initials(post.authorName)}
          </span>
          <div className="min-w-0 flex-1 text-[13px] leading-tight">
            <p className="truncate font-medium text-ink">{post.authorName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-muted">
              {formatDate(post.publishedAt)}
              <span aria-hidden>·</span>
              <Clock className="h-3 w-3" />
              {readingMinutes(post.wordCount ?? 0)} min
            </p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted ring-1 ring-line transition duration-300 group-hover:bg-ink group-hover:text-white group-hover:ring-ink">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
