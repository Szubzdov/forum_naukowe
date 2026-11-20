import "server-only";
import { type AnyColumn, and, asc, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const { posts, users, categories } = schema;

/** Nazwy kategorii z listy id (w kolejności wpisania przez autora) */
function categoryNames(column: AnyColumn) {
  return sql<string[]>`coalesce(array(
    select c.name from unnest(${column}) with ordinality as u(id, ord)
    join ${categories} c on c.id = u.id order by u.ord
  ), '{}')`;
}

export async function listPublishedPosts(filters: { type?: string; q?: string; category?: string }) {
  const conditions = [isNotNull(posts.publishedAt)];
  if (filters.type) conditions.push(eq(posts.publishedType, filters.type));
  if (filters.category) {
    conditions.push(
      sql`exists (select 1 from ${categories} c where c.id = any(${posts.publishedCategoryIds}) and lower(c.name) = lower(${filters.category}))`,
    );
  }
  if (filters.q) {
    const like = `%${filters.q}%`;
    conditions.push(or(ilike(posts.publishedTitle, like), ilike(posts.publishedDescription, like))!);
  }
  return db
    .select({
      id: posts.id,
      title: posts.publishedTitle,
      description: posts.publishedDescription,
      type: posts.publishedType,
      wordCount: posts.publishedWordCount,
      excerpt: sql<string | null>`left(${posts.publishedText}, 600)`,
      publishedAt: posts.firstPublishedAt,
      authorName: users.name,
      categories: categoryNames(posts.publishedCategoryIds),
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(and(...conditions))
    .orderBy(desc(posts.firstPublishedAt))
    .limit(60);
}

export async function getPublishedPost(id: string) {
  const rows = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
      title: posts.publishedTitle,
      description: posts.publishedDescription,
      type: posts.publishedType,
      html: posts.publishedHtml,
      text: posts.publishedText,
      wordCount: posts.publishedWordCount,
      firstPublishedAt: posts.firstPublishedAt,
      publishedAt: posts.publishedAt,
      authorName: users.name,
      categories: categoryNames(posts.publishedCategoryIds),
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(and(eq(posts.id, id), isNotNull(posts.publishedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getMyPosts(userId: string) {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      publishedTitle: posts.publishedTitle,
      type: posts.type,
      wordCount: posts.wordCount,
      moderationStatus: posts.moderationStatus,
      rejectionReason: posts.rejectionReason,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      categories: categoryNames(posts.categoryIds),
    })
    .from(posts)
    .where(eq(posts.authorId, userId))
    .orderBy(desc(posts.updatedAt));
}

export async function getPostForEdit(id: string, userId: string) {
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      description: posts.description,
      type: posts.type,
      contentJson: posts.contentJson,
      contentHtml: posts.contentHtml,
      moderationStatus: posts.moderationStatus,
      rejectionReason: posts.rejectionReason,
      publishedAt: posts.publishedAt,
      categories: categoryNames(posts.categoryIds),
    })
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.authorId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCategoryNames() {
  const rows = await db.select({ name: categories.name }).from(categories).orderBy(asc(categories.name));
  return rows.map((r) => r.name);
}

/** Aktywne odrzucenia (młodsze niż 7 dni) i ewentualna blokada publikowania */
