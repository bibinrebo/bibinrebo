-- CreateTable
CREATE TABLE "Commit" (
    "id" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "repository" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "messageShort" TEXT NOT NULL,
    "messageFull" TEXT NOT NULL,
    "commitUrl" TEXT NOT NULL,
    "pullRequestUrl" TEXT,
    "commitType" TEXT NOT NULL,
    "filesChangedCount" INTEGER NOT NULL,
    "insertions" INTEGER NOT NULL,
    "deletions" INTEGER NOT NULL,
    "isMergeCommit" BOOLEAN NOT NULL DEFAULT false,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commit_sha_key" ON "Commit"("sha");

-- CreateIndex
CREATE INDEX "Commit_committedAt_idx" ON "Commit"("committedAt");

-- CreateIndex
CREATE INDEX "Commit_repository_idx" ON "Commit"("repository");

-- CreateIndex
CREATE INDEX "Commit_branch_idx" ON "Commit"("branch");

-- CreateIndex
CREATE INDEX "Commit_author_idx" ON "Commit"("author");

-- CreateIndex
CREATE INDEX "Commit_commitType_idx" ON "Commit"("commitType");

-- CreateIndex
CREATE INDEX "Commit_isMergeCommit_idx" ON "Commit"("isMergeCommit");
