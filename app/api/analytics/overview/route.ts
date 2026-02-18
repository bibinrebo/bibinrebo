import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { summarizeOverview } from '@/lib/analytics';
import { getStartOfCurrentMonthUtc, parseDateOrNull } from '@/lib/date-range';

export async function GET(request: NextRequest) {
  const from = parseDateOrNull(request.nextUrl.searchParams.get('from')) ?? getStartOfCurrentMonthUtc();
  const to = parseDateOrNull(request.nextUrl.searchParams.get('to'));

  const commits = await prisma.commit.findMany({
    where: {
      committedAt: {
        gte: from,
        ...(to ? { lte: to } : {})
      }
    },
    orderBy: { committedAt: 'desc' }
  });

  return NextResponse.json({
    from: from.toISOString(),
    to: to?.toISOString() ?? null,
    ...summarizeOverview(commits)
  });
}
