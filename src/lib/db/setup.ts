import path from "node:path";
import { assertDatabaseConfigured, db, describeDatabase, schema } from "./index";
import { seedDemo } from "./seed";

export async function setupDatabase() {
  assertDatabaseConfigured();
  console.log(`[db] Baza danych: ${describeDatabase()}`);
  const migrationsFolder = path.join(process.cwd(), "drizzle");

  if (process.env.DATABASE_URL) {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder });
  }

  console.log(`[db] Gotowe. Dokumentów w bazie: ${await db.$count(schema.posts)}`);

  const shouldSeed = process.env.SEED_DEMO ?? (process.env.NODE_ENV === "production" ? "0" : "1");
  if (shouldSeed === "1") {
    const count = await db.$count(schema.posts);
    if (count === 0) {
      await seedDemo();
      console.log("[db] Dodano przykładowe wpisy.");
    }
  }
}
