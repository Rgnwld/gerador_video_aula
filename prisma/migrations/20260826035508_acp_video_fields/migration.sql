-- AlterTable
ALTER TABLE "Trilha" ADD COLUMN "sourceFilePath" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Aula" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trilhaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "summary" TEXT NOT NULL,
    "videoScript" TEXT NOT NULL,
    "videoUrl" TEXT,
    "videoStatus" TEXT NOT NULL DEFAULT 'NONE',
    "videoError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Aula_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "Trilha" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Aula" ("createdAt", "difficulty", "id", "order", "summary", "title", "trilhaId", "videoScript", "videoUrl") SELECT "createdAt", "difficulty", "id", "order", "summary", "title", "trilhaId", "videoScript", "videoUrl" FROM "Aula";
DROP TABLE "Aula";
ALTER TABLE "new_Aula" RENAME TO "Aula";
CREATE INDEX "Aula_trilhaId_idx" ON "Aula"("trilhaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
