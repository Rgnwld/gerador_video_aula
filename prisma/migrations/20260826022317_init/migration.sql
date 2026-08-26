-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Trilha" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sourceFileName" TEXT,
    "sourceText" TEXT,
    "questionsPerAula" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "errorMessage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trilha_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Aula" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trilhaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "summary" TEXT NOT NULL,
    "videoScript" TEXT NOT NULL,
    "videoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Aula_trilhaId_fkey" FOREIGN KEY ("trilhaId") REFERENCES "Trilha" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aulaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correctOptionIndex" INTEGER NOT NULL,
    CONSTRAINT "Question_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AulaProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "videoCompleted" BOOLEAN NOT NULL DEFAULT false,
    "quizCompleted" BOOLEAN NOT NULL DEFAULT false,
    "quizScore" INTEGER,
    "answers" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AulaProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AulaProgress_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "Aula" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Aula_trilhaId_idx" ON "Aula"("trilhaId");

-- CreateIndex
CREATE INDEX "Question_aulaId_idx" ON "Question"("aulaId");

-- CreateIndex
CREATE INDEX "AulaProgress_aulaId_idx" ON "AulaProgress"("aulaId");

-- CreateIndex
CREATE UNIQUE INDEX "AulaProgress_userId_aulaId_key" ON "AulaProgress"("userId", "aulaId");
