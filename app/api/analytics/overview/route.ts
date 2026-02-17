import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { summarizeOverview } from '@/lib/analytics';

export async function GET() {
  const commits = await prisma.commit.findMany({
    orderBy: { committedAt: 'desc' }
  });

  return NextResponse.json(summarizeOverview(commits));
}
