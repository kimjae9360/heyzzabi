-- AlterTable
ALTER TABLE "Task" ADD COLUMN "github_pr_number" INTEGER;
ALTER TABLE "Task" ADD COLUMN "github_pr_state" TEXT;
ALTER TABLE "Task" ADD COLUMN "github_pr_url" TEXT;
