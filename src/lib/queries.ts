import "server-only";
import { and, asc, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";

const { posts, users, categories } = schema;

export async function listPublishedPosts(filters: { type?: string; q?: string }) {
  const conditions = [isNotNull(posts.publishedAt)];
  if (filters.type) conditions.push(eq(posts.publishedType, filters.type));
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
      category: categories.name,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .leftJoin(categories, eq(categories.id, posts.publishedCategoryId))
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
      category: categories.name,
    })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .leftJoin(categories, eq(categories.id, posts.publishedCategoryId))
    .where(and(eq(posts.id, id), isNotNull(posts.publishedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getMyPosts(userId: string) {
  const draftCategory = alias(categories, "draft_category");
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
      category: draftCategory.name,
    })
    .from(posts)
    .leftJoin(draftCategory, eq(draftCategory.id, posts.categoryId))
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
      category: categories.name,
    })
    .from(posts)
    .leftJoin(categories, eq(categories.id, posts.categoryId))
    .where(and(eq(posts.id, id), eq(posts.authorId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCategoryNames() {
  const rows = await db.select({ name: categories.name }).from(categories).orderBy(asc(categories.name));
  return rows.map((r) => r.name);
}

/** Aktywne odrzucenia (młodsze niż 7 dni) i ewentualna blokada publikowania */
