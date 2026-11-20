ALTER TABLE "posts" ADD COLUMN "category_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "published_category_ids" text[];--> statement-breakpoint
-- przeniesienie dotychczasowej (jednej) kategorii do nowych list
UPDATE "posts" SET "category_ids" = ARRAY["category_id"] WHERE "category_id" IS NOT NULL;--> statement-breakpoint
UPDATE "posts" SET "published_category_ids" = ARRAY["published_category_id"] WHERE "published_category_id" IS NOT NULL;
