import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractCommitType } from '@/lib/commit-type';
import { verifyGithubSignature } from '@/lib/github';

type PushCommit = {
  id: string;
  message: string;
  timestamp: string;
  url: string;
  author?: { name?: string };
  added?: string[];
  removed?: string[];
  modified?: string[];
};

const getCommitStats = async (owner: string, repo: string, sha: string) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { filesChangedCount: 0, insertions: 0, deletions: 0, pullRequestUrl: null as string | null };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json'
  };

  const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, { headers, cache: 'no-store' });
  const commitJson = commitRes.ok ? await commitRes.json() : null;

  const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}/pulls`, {
    headers: {
      ...headers,
      Accept: 'application/vnd.github+json'
    },
    cache: 'no-store'
  });
  const pulls = prRes.ok ? ((await prRes.json()) as Array<{ html_url?: string }>) : [];

  return {
    filesChangedCount: Number(commitJson?.files?.length ?? 0),
    insertions: Number(commitJson?.stats?.additions ?? 0),
    deletions: Number(commitJson?.stats?.deletions ?? 0),
    pullRequestUrl: pulls[0]?.html_url ?? null
  };
};

export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Missing GITHUB_WEBHOOK_SECRET' }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const isValid = verifyGithubSignature(rawBody, signature, secret);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = request.headers.get('x-github-event');
  if (event !== 'push') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payload = JSON.parse(rawBody) as {
    ref: string;
    repository: { full_name: string; name: string; owner: { name?: string; login?: string } };
    commits: PushCommit[];
  };

  const repository = payload.repository.full_name;
  const branch = payload.ref.replace('refs/heads/', '');
  const owner = payload.repository.owner.login ?? payload.repository.owner.name ?? '';
  const repo = payload.repository.name;

  for (const commit of payload.commits ?? []) {
    const stats = await getCommitStats(owner, repo, commit.id);
    const fallbackFilesChanged = new Set([...(commit.added ?? []), ...(commit.removed ?? []), ...(commit.modified ?? [])]).size;

    await prisma.commit.upsert({
      where: { sha: commit.id },
      create: {
        sha: commit.id,
        repository,
        branch,
        author: commit.author?.name ?? 'unknown',
        messageShort: commit.message.split('\n')[0] ?? '',
        messageFull: commit.message,
        commitUrl: commit.url,
        pullRequestUrl: stats.pullRequestUrl,
        commitType: extractCommitType(commit.message),
        filesChangedCount: stats.filesChangedCount || fallbackFilesChanged,
        insertions: stats.insertions,
        deletions: stats.deletions,
        isMergeCommit: commit.message.startsWith('Merge '),
        committedAt: new Date(commit.timestamp)
      },
      update: {
        repository,
        branch,
        author: commit.author?.name ?? 'unknown',
        messageShort: commit.message.split('\n')[0] ?? '',
        messageFull: commit.message,
        commitUrl: commit.url,
        pullRequestUrl: stats.pullRequestUrl,
        commitType: extractCommitType(commit.message),
        filesChangedCount: stats.filesChangedCount || fallbackFilesChanged,
        insertions: stats.insertions,
        deletions: stats.deletions,
        isMergeCommit: commit.message.startsWith('Merge '),
        committedAt: new Date(commit.timestamp)
      }
    });
  }

  return NextResponse.json({ ok: true, processed: payload.commits?.length ?? 0 });
}
