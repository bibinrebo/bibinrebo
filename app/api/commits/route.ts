import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getStartOfCurrentMonthUtc, parseDateOrNull } from '@/lib/date-range';

const querySchema = z.object({
  repository: z.string().optional(),
  branch: z.string().optional(),
  commitType: z.string().optional(),
  search: z.string().optional(),
  includeMerge: z.enum(['true', 'false']).optional(),
  sortBy: z.enum(['day', 'month', 'year', 'latest']).optional().default('latest'),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(20)
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { repository, branch, commitType, search, includeMerge, sortBy, from: fromRaw, to: toRaw, page, pageSize } = parsed.data;

  const from = parseDateOrNull(fromRaw ?? null) ?? getStartOfCurrentMonthUtc();
  const to = parseDateOrNull(toRaw ?? null);

  const committedAtFilter: Prisma.DateTimeFilter = {
    gte: from,
    ...(to ? { lte: to } : {})
  };

  const where: Prisma.CommitWhereInput = {
    committedAt: committedAtFilter
  };

  if (repository) where.repository = repository;
  if (branch) where.branch = branch;
  if (commitType) where.commitType = commitType;
  if (includeMerge === 'false') where.isMergeCommit = false;
  if (search) where.messageFull = { contains: search, mode: 'insensitive' };

  const [total, commits, repositories, branches, commitTypes] = await Promise.all([
    prisma.commit.count({ where }),
    prisma.commit.findMany({
      where,
      orderBy: { committedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.commit.findMany({
      where: { ...where, repository: undefined },
      distinct: ['repository'],
      select: { repository: true }
    }),
    prisma.commit.findMany({
      where: { ...where, branch: undefined },
      distinct: ['branch'],
      select: { branch: true }
    }),
    prisma.commit.findMany({
      where: { ...where, commitType: undefined },
      distinct: ['commitType'],
      select: { commitType: true }
    })
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    sortBy,
    from: from.toISOString(),
    to: to?.toISOString() ?? null,
    commits,
    repositories,
    branches,
    commitTypes
  });
}
