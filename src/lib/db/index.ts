import "server-only";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * DATABASE_URL ustawione  -> prawdziwy PostgreSQL (serwer / Coolify)
 * DATABASE_URL puste       -> PGlite: PostgreSQL w pliku .data/pglite (development bez Dockera)
 */
type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: DB };

function createDb(): DB {
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
