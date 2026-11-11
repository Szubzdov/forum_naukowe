"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import {
  DAY_MS,
  PUBLISH_BLOCK_DAYS,
  REJECTION_LIMIT,
  TEXT_TYPES,
  countWords,
  formatDate,
  getTextType,
  htmlToText,
} from "@/lib/constants";
import { moderate } from "@/lib/moderation";
import { getPublishState } from "@/lib/queries";
import { cleanHtml } from "@/lib/sanitize";

const { posts, categories, moderationLogs, users } = schema;

const DraftSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(200),
  description: z.string().max(400),
  category: z.string().max(60),
  type: z.enum(TEXT_TYPES.map((t) => t.value) as [string, ...string[]]),
  contentJson: z.unknown(),
  contentHtml: z.string().max(2_000_000),
});

export type DraftInput = z.infer<typeof DraftSchema>;

export type SaveResult =
  | { ok: true; id: string; savedAt: string }
  | { ok: false; error: string };

export type PublishResult =
  | { ok: true; id: string }
  | {
      ok: false;
      id?: string;
      error: string;
      rejected?: boolean;
      activeRejections?: number;
      blockedUntil?: string | null;
    };

async function findOrCreateCategory(name: string): Promise<string | null> {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return null;
  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(sql`lower(${categories.name}) = lower(${clean})`)
    .limit(1);
  if (existing) return existing.id;
  const label = clean.charAt(0).toUpperCase() + clean.slice(1);
  const [created] = await db
    .insert(categories)
    .values({ name: label })
    .onConflictDoNothing()
    .returning({ id: categories.id });
  if (created) return created.id;
  const [again] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(sql`lower(${categories.name}) = lower(${clean})`);
  return again?.id ?? null;
}

/** Zapisuje wersję roboczą. Opublikowana wersja pozostaje bez zmian. */
async function persistDraft(userId: string, input: DraftInput) {
  const html = cleanHtml(input.contentHtml);
  const text = htmlToText(html);
  const values = {
    title: input.title.trim(),
    description: input.description.trim(),
    categoryId: await findOrCreateCategory(input.category),
    type: input.type,
    contentJson: input.contentJson ?? null,
    contentHtml: html,
    contentText: text,
    wordCount: countWords(text),
    updatedAt: new Date(),
  };

  if (input.id) {
    const [updated] = await db
      .update(posts)
      .set(values)
      .where(and(eq(posts.id, input.id), eq(posts.authorId, userId)))
      .returning({ id: posts.id });
    if (!updated) throw new Error("Nie znaleziono dokumentu.");
    return { id: updated.id, ...values };
  }
  const [created] = await db
    .insert(posts)
    .values({ ...values, authorId: userId })
    .returning({ id: posts.id });
  return { id: created.id, ...values };
}

export async function saveDraft(raw: DraftInput): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Zaloguj się, aby zapisać dokument." };
  const parsed = DraftSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowe dane dokumentu." };

  try {
    const saved = await persistDraft(user.id, parsed.data);
    revalidatePath("/moj-folder");
    return { ok: true, id: saved.id, savedAt: new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Nie udało się zapisać." };
  }
}

export async function publishPost(raw: DraftInput): Promise<PublishResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Zaloguj się, aby opublikować dokument." };
  const parsed = DraftSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Nieprawidłowe dane dokumentu." };

  // 1. Czy autor może publikować?
  const state = await getPublishState(user.id);
  if (state.blockedUntil) {
    return {
      ok: false,
      error: `Publikowanie jest zablokowane do ${formatDate(state.blockedUntil)} (${REJECTION_LIMIT} odrzuconych dokumentów w ciągu 7 dni). Możesz dalej pisać i zapisywać szkice.`,
      blockedUntil: state.blockedUntil.toISOString(),
      activeRejections: state.activeRejections,
    };
  }

  // 2. Zapis wersji roboczej
  const saved = await persistDraft(user.id, parsed.data);
  const textType = getTextType(saved.type);

  // 3. Szybkie sprawdzenie w kodzie (nie liczy się jako odrzucenie)
  if (!saved.title) return { ok: false, id: saved.id, error: "Dodaj tytuł dokumentu." };
  if (!saved.categoryId) return { ok: false, id: saved.id, error: "Wpisz kategorię dokumentu." };
  if (saved.wordCount < textType.minWords) {
    return {
      ok: false,
      id: saved.id,
      error: `${textType.label} musi mieć co najmniej ${textType.minWords} słów (teraz: ${saved.wordCount}).`,
    };
  }

  // 4. Weryfikacja AI
  let verdict;
  try {
    verdict = await moderate({
      title: saved.title,
      description: saved.description,
      type: textType.label,
      category: parsed.data.category,
      text: saved.contentText,
    });
  } catch (e) {
    console.error("[moderacja] błąd", e);
    return {
      ok: false,
      id: saved.id,
      error: "Weryfikacja jest chwilowo niedostępna. Dokument zapisano jako szkic — spróbuj za chwilę.",
    };
  }

  await db.insert(moderationLogs).values({
    postId: saved.id,
    userId: user.id,
    result: verdict.approved ? "approved" : "rejected",
    reason: verdict.reason,
  });

  if (!verdict.approved) {
    await db
      .update(posts)
      .set({ moderationStatus: "rejected", rejectionReason: verdict.reason })
      .where(eq(posts.id, saved.id));

    const after = await getPublishState(user.id);
    let blockedUntil: Date | null = null;
    if (after.activeRejections >= REJECTION_LIMIT) {
      blockedUntil = new Date(Date.now() + PUBLISH_BLOCK_DAYS * DAY_MS);
      await db.update(users).set({ publishBlockedUntil: blockedUntil }).where(eq(users.id, user.id));
    }
    revalidatePath("/moj-folder");
    return {
      ok: false,
      id: saved.id,
      rejected: true,
      error: verdict.reason,
      activeRejections: after.activeRejections,
      blockedUntil: blockedUntil?.toISOString() ?? null,
    };
  }

  // 5. Zatwierdzone — wersja robocza staje się wersją publiczną
  const now = new Date();
  await db
    .update(posts)
    .set({
      moderationStatus: "none",
      rejectionReason: null,
      publishedTitle: saved.title,
      publishedDescription: saved.description,
      publishedCategoryId: saved.categoryId,
      publishedType: saved.type,
      publishedHtml: saved.contentHtml,
      publishedText: saved.contentText,
      publishedWordCount: saved.wordCount,
      publishedAt: now,
      firstPublishedAt: sql`coalesce(${posts.firstPublishedAt}, ${now.toISOString()}::timestamptz)`,
    })
    .where(eq(posts.id, saved.id));

  revalidatePath("/");
  revalidatePath("/moj-folder");
  revalidatePath(`/wpis/${saved.id}`);
  return { ok: true, id: saved.id };
}

export async function deleteDraft(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
  // Usuwać można tylko dokumenty, które nigdy nie były opublikowane
  await db
    .delete(posts)
    .where(and(eq(posts.id, id), eq(posts.authorId, user.id), isNull(posts.publishedAt)));
  revalidatePath("/moj-folder");
}
