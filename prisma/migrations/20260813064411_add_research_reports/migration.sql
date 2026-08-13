-- CreateTable
CREATE TABLE "ResearchReport" (
    "report_id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources_json" TEXT NOT NULL,
    "degraded" BOOLEAN NOT NULL DEFAULT false,
    "project_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchReport_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project" ("project_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ResearchReport_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
