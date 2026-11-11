import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    // Blokada publikowania (5 aktywnych odrzuceń => 7 dni)
    publishBlockedUntil: timestamp("publish_blocked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable("sessions", {
  // sha256 tokenu z ciasteczka — sam token nigdy nie trafia do bazy
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const categories = pgTable(
  "categories",
  {
    id: id(),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("categories_name_idx").on(sql`lower(${t.name})`)],
);

/**
 * Jeden wiersz = jeden dokument autora.
 * Kolumny bez prefiksu to wersja robocza (edytowana w edytorze).
 * Kolumny published_* to ostatnia wersja, która przeszła weryfikację —
 * tylko ją widzą czytelnicy.
 */
export const posts = pgTable(
  "posts",
  {
    id: id(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // wersja robocza
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    categoryId: text("category_id").references(() => categories.id),
    type: text("type").notNull().default("wpis"),
    contentJson: jsonb("content_json"),
    contentHtml: text("content_html").notNull().default(""),
    contentText: text("content_text").notNull().default(""),
    wordCount: integer("word_count").notNull().default(0),

    // wynik ostatniej weryfikacji wersji roboczej
    moderationStatus: text("moderation_status").notNull().default("none"), // none | rejected
    rejectionReason: text("rejection_reason"),

    // wersja opublikowana
    publishedTitle: text("published_title"),
    publishedDescription: text("published_description"),
    publishedCategoryId: text("published_category_id").references(() => categories.id),
    publishedType: text("published_type"),
    publishedHtml: text("published_html"),
    publishedText: text("published_text"),
    publishedWordCount: integer("published_word_count"),
    firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("posts_author_idx").on(t.authorId),
    index("posts_published_idx").on(t.publishedAt),
  ],
);

export const moderationLogs = pgTable(
  "moderation_logs",
  {
    id: id(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    result: text("result").notNull(), // approved | rejected
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("moderation_user_idx").on(t.userId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
