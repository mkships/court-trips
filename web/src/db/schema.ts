import { bigint, date, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// One row per visitor hand-off through /go. No IPs or user agents: enough to count leads per
// program, date and organizer, and to see where they came from, without tracking people.
// `program` is the slug as text, not a foreign key, so a click survives a program being renamed or removed.
export const clicks = pgTable(
  "clicks",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    program: text().notNull(),
    sessionDate: date(),
    organizer: text().notNull(),
    // the page on Court Trips the click came from, or the other site's host when it came from elsewhere
    fromPath: text(),
    referrerHost: text(),
    country: text(),
    target: text().notNull(),
  },
  (t) => [index("clicks_at_idx").on(t.at), index("clicks_program_at_idx").on(t.program, t.at)],
);
