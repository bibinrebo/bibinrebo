import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const querySchema = z.object({
  repository: z.string().optional(),
  branch: z.string().optional(),
  commitType: z.string().optional(),
  search: z.string().optional(),
  includeMerge: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['day', 'month', 'year', 'latest']).optional().default('latest'),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(20)
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { repository, branch, commitType, search, includeMerge, sortBy, page, pageSize } = parsed.data;
  const where: Record<string, unknown> = {};

  if (repository) where.repository = repository;
  if (branch) where.branch = branch;
  if (commitType) where.commitType = commitType;
  if (includeMerge === 'false') where.isMergeCommit = false;
  if (search) where.messageFull = { contains: search, mode: 'insensitive' };

  try {
    const [total, commits, repositories, branches, commitTypes] = await Promise.all([
      prisma.commit.count({ where }),
      prisma.commit.findMany({
        where,
        orderBy: { committedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.commit.findMany({ distinct: ['repository'], select: { repository: true } }),
      prisma.commit.findMany({ distinct: ['branch'], select: { branch: true } }),
      prisma.commit.findMany({ distinct: ['commitType'], select: { commitType: true } })
    ]);

    return NextResponse.json({
      total,
      page,
      pageSize,
      sortBy,
      commits,
      repositories,
      branches,
      commitTypes
    });
  } catch (error) {
    console.error('Error fetching commits:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
}
