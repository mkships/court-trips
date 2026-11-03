import { defineConfig } from "drizzle-kit";

// Migrations are generated from src/db/schema.ts into drizzle/ and checked into git.
// The unpooled URL is for schema changes; the site itself uses the pooled DATABASE_URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
