#!/usr/bin/env node
/**
 * Applies any pending migrations in drizzle/ to the database. Runs before every build.
 *   - On Vercel each deployment migrates its own database: production, or a preview's Neon branch.
 *   - On Vercel without a database the build fails on purpose: the site has no listings without
 *     one, and /go would silently drop every click.
 *   - Locally it skips when DATABASE_URL isn't set (run `npx neon checkout dev` to use the dev branch).
 * The build then runs scripts/db-seed.mjs --if-empty, so a new database starts with seed/'s listings.
 * Generate a migration after changing src/db/schema.ts with `npm run db:generate`.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!url) {
  if (process.env.VERCEL) {
    console.error(
      "DATABASE_URL is not set. Connect the Neon database to this Vercel project " +
        "(Storage → Neon, all environments) and redeploy.",
    );
    process.exit(1);
  }
  console.log("migrate: no DATABASE_URL, skipping (the site needs one to show listings: npx neon checkout dev)");
  process.exit(0);
}

await migrate(drizzle({ client: neon(url) }), { migrationsFolder: "drizzle" });
console.log("migrate: database is up to date");
