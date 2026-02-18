import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { summarizeOverview } from '@/lib/analytics';

export async function GET() {
  try {
    const commits = await prisma.commit.findMany({
      orderBy: { committedAt: 'desc' }
    });

    return NextResponse.json(summarizeOverview(commits));
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 });
  }
}
