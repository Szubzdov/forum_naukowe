import "server-only";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * DATABASE_URL ustawione  -> prawdziwy PostgreSQL (serwer / Coolify)
 * DATABASE_URL puste       -> PGlite: PostgreSQL w pliku .data/pglite (development bez Dockera)
 */
type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: DB };

/**
 * Na serwerze (produkcja) baza w kontenerze znikałaby przy każdym wdrożeniu razem z dokumentami,
 * dlatego bez DATABASE_URL aplikacja w ogóle nie startuje.
 */
export function assertDatabaseConfigured() {
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_DB !== "1") {
    throw new Error(
      "[db] Brak zmiennej DATABASE_URL. Ustaw ją w Coolify (Environment Variables → DATABASE_URL = adres bazy PostgreSQL) " +
        "i wdróż ponownie. Bez niej dokumenty zapisywałyby się w kontenerze i znikały przy każdym wdrożeniu.",
    );
  }
}

/** Opis bazy do logów — bez hasła */
export function describeDatabase(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return `PGlite (lokalny plik ${process.env.PGLITE_DIR ?? "./.data/pglite"})`;
  try {
    const u = new URL(url);
    return `PostgreSQL ${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "PostgreSQL (nieczytelny adres w DATABASE_URL)";
  }
}

function createDb(): DB {
  assertDatabaseConfigured();
  const url = process.env.DATABASE_URL;
  if (url) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as typeof import("pg");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
    return drizzle(new Pool({ connectionString: url }), { schema });
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  const dir = process.env.PGLITE_DIR ?? "./.data/pglite";
  fs.mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  return drizzle(client, { schema }) as unknown as DB;
}

// Połączenie tworzone dopiero przy pierwszym użyciu (nie podczas `next build`)
export const db: DB = new Proxy({} as DB, {
  get(_, prop) {
    const real = globalForDb.__db ?? (globalForDb.__db = createDb());
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
export { schema };
