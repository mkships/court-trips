import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon over HTTP: no connection pool to manage, which suits short-lived serverless functions.
// DATABASE_URL is set by the Neon integration in Vercel; locally from the Neon `dev` branch (`npx neon checkout dev`).
const url = process.env.DATABASE_URL;

export const db = url ? drizzle({ client: neon(url), schema, casing: "snake_case" }) : null;
