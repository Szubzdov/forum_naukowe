CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"result" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category_id" text,
	"type" text DEFAULT 'wpis' NOT NULL,
	"content_json" jsonb,
	"content_html" text DEFAULT '' NOT NULL,
	"content_text" text DEFAULT '' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"moderation_status" text DEFAULT 'none' NOT NULL,
	"rejection_reason" text,
	"published_title" text,
	"published_description" text,
	"published_category_id" text,
	"published_type" text,
	"published_html" text,
	"published_text" text,
	"published_word_count" integer,
	"first_published_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"publish_blocked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_published_category_id_categories_id_fk" FOREIGN KEY ("published_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_idx" ON "categories" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "moderation_user_idx" ON "moderation_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "posts_published_idx" ON "posts" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree (lower("email"));