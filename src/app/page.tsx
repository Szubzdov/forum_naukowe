import Link from "next/link";
import { Search } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { TEXT_TYPES } from "@/lib/constants";
import { listPublishedPosts } from "@/lib/queries";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const type = typeof params.typ === "string" ? params.typ : undefined;
  const q = typeof params.q === "string" ? params.q.trim() : undefined;
  const posts = await listPublishedPosts({ type, q });

  const chipHref = (value?: string) => {
    const sp = new URLSearchParams();
    if (value) sp.set("typ", value);
    if (q) sp.set("q", q);
    const s = sp.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
      <section className="pt-10 pb-8 sm:pt-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-600">Biblioteka wpisów</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-[44px]">
              Najnowsze publikacje
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
              Artykuły, notatki, rozprawki i eseje autorów z całej Polski. Czytaj, ucz się i publikuj własne teksty.
            </p>
          </div>

          <form action="/" className="relative w-full lg:w-80">
            {type && <input type="hidden" name="typ" value={type} />}
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Szukaj po tytule lub opisie…"
              className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-4 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </form>
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[{ value: undefined, label: "Wszystkie" }, ...TEXT_TYPES].map((t) => {
            const active = t.value === type;
            return (
              <Link
                key={t.label}
                href={chipHref(t.value)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-white text-muted hover:border-ink/30 hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </section>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-20 text-center">
          <p className="font-serif text-xl font-semibold">Brak wpisów</p>
          <p className="mt-2 text-sm text-muted">
            {q || type ? "Nic nie pasuje do wybranych filtrów." : "Bądź pierwszą osobą, która coś opublikuje."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <PostCard key={post.id} post={post} featured={i === 0 && !q && !type && posts.length >= 4} />
          ))}
        </div>
      )}
    </main>
  );
}
