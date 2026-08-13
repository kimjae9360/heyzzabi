-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "connection_id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "external_login" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "connected_by" TEXT NOT NULL,
    "connected_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationConnection_connected_by_fkey" FOREIGN KEY ("connected_by") REFERENCES "User" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_provider_key" ON "IntegrationConnection"("provider");
