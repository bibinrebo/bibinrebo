export type CommitRecord = {
  sha: string;
  repository: string;
  branch: string;
  author: string;
  messageShort: string;
  messageFull: string;
  commitUrl: string;
  pullRequestUrl: string | null;
  commitType: string;
  filesChangedCount: number;
  insertions: number;
  deletions: number;
  isMergeCommit: boolean;
  committedAt: string;
};
