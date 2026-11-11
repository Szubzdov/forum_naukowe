/**
 * Uruchamiane raz przy starcie serwera Next.js:
 * - nakłada migracje bazy (folder ./drizzle)
 * - przy pustej bazie i SEED_DEMO=1 dodaje przykładowe wpisy
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { setupDatabase } = await import("./lib/db/setup");
  await setupDatabase();
}
