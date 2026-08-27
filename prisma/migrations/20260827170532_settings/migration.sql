-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "aiProvider" TEXT NOT NULL DEFAULT 'acp',
    "anthropicApiKey" TEXT,
    "anthropicModel" TEXT,
    "ollamaBaseUrl" TEXT,
    "ollamaModel" TEXT,
    "updatedAt" DATETIME NOT NULL
);
