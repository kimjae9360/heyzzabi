-- AlterTable
ALTER TABLE "Project" ADD COLUMN "github_owner" TEXT;
ALTER TABLE "Project" ADD COLUMN "github_repo" TEXT;
ALTER TABLE "Project" ADD COLUMN "github_token" TEXT;
ALTER TABLE "Project" ADD COLUMN "github_linked_at" DATETIME;
