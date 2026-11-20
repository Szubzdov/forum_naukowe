// Eksport lokalnej bazy PGlite (.data/pglite) do jednego pliku SQL dla PostgreSQL.
// Użycie: zatrzymaj `npm run dev`, potem `npm run db:export` -> database/forum.sql
import crypto from "node:crypto";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const OUT = "database/forum.sql";
// Konta testowe nie trafiają na serwer (ich hasła są zapisane w .env.example)
const EXCLUDED_EMAIL = /@forum\.test$/i;

const journal = JSON.parse(fs.readFileSync("drizzle/meta/_journal.json", "utf8"));

function lit(v) {
  if (v === null || v === undefined) return "NULL";
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return v.length ? `ARRAY[${v.map(lit).join(", ")}]::text[]` : "'{}'::text[]";
  if (typeof v === "object") return `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;
  return `'${String(v).replaceAll("'", "''")}'`;
}

function inserts(table, rows) {
  if (rows.length === 0) return `-- ${table}: brak wierszy\n`;
  const cols = Object.keys(rows[0]);
  const head = `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES\n`;
  const body = rows.map((r) => `  (${cols.map((c) => lit(r[c])).join(", ")})`).join(",\n");
  return `${head}${body};\n`;
}

const db = new PGlite("./.data/pglite");
try {
  const users = (await db.query(`select * from users order by created_at`)).rows.filter(
    (u) => !EXCLUDED_EMAIL.test(u.email),
  );
  const userIds = new Set(users.map((u) => u.id));
  const posts = (await db.query(`select * from posts order by created_at`)).rows.filter((p) =>
    userIds.has(p.author_id),
  );
  const postIds = new Set(posts.map((p) => p.id));
  const categories = (await db.query(`select * from categories order by name`)).rows;
  const logs = (await db.query(`select * from moderation_logs order by created_at`)).rows.filter(
    (l) => userIds.has(l.user_id) && postIds.has(l.post_id),
  );

  let out = `-- Forum Naukowe — schemat i dane dla PostgreSQL
-- Wygenerowano: ${new Date().toISOString()} (npm run db:export)
-- Wgrywanie: psql "postgres://UZYTKOWNIK:HASLO@HOST:5432/BAZA" -f database/forum.sql
-- Plik jest przeznaczony dla PUSTEJ bazy. Wszystko wykonuje się w jednej transakcji:
-- jeśli coś się nie uda, baza zostaje bez zmian.

BEGIN;

-- ===================== Schemat =====================
`;
  for (const entry of journal.entries) {
    const sql = fs.readFileSync(`drizzle/${entry.tag}.sql`, "utf8");
    const statements = sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    out += `\n-- migracja ${entry.tag}\n${statements.map((s) => s.replace(/;?$/, ";")).join("\n\n")}\n`;
  }

  out += `
-- Informacja dla aplikacji, że migracje są już wykonane (inaczej przy starcie próbowałaby utworzyć tabele ponownie)
CREATE SCHEMA IF NOT EXISTS "drizzle";
CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
`;
  for (const entry of journal.entries) {
    const sql = fs.readFileSync(`drizzle/${entry.tag}.sql`).toString();
    const hash = crypto.createHash("sha256").update(sql).digest("hex");
    out += `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ('${hash}', ${entry.when});\n`;
  }

  out += `
-- ===================== Dane =====================
-- Użytkownicy: ${users.length}, kategorie: ${categories.length}, dokumenty: ${posts.length}, wpisy moderacji: ${logs.length}

${inserts("users", users)}
${inserts("categories", categories)}
${inserts("posts", posts)}
${inserts("moderation_logs", logs)}
COMMIT;
`;

  fs.mkdirSync("database", { recursive: true });
  fs.writeFileSync(OUT, out);
  console.log(`Zapisano ${OUT}: ${users.length} użytkowników, ${categories.length} kategorii, ${posts.length} dokumentów`);
} finally {
  await db.close();
}
