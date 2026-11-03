CREATE TABLE "clicks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clicks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"program" text NOT NULL,
	"session_date" date,
	"organizer" text NOT NULL,
	"from_path" text,
	"referrer_host" text,
	"country" text,
	"target" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "clicks_at_idx" ON "clicks" USING btree ("at");--> statement-breakpoint
CREATE INDEX "clicks_program_at_idx" ON "clicks" USING btree ("program","at");