import { differenceInCalendarDays, format, startOfDay, subDays } from 'date-fns';
import type { Commit } from '@prisma/client';

export const summarizeOverview = (commits: Commit[]) => {
  const totalCommits = commits.length;
  const repoCounts = new Map<string, number>();
  const branchCounts = new Map<string, number>();
  const daily = new Map<string, number>();
  const monthly = new Map<string, number>();
  const histogram = new Map<number, number>();
  let insertions = 0;
  let deletions = 0;

  commits.forEach((commit) => {
    repoCounts.set(commit.repository, (repoCounts.get(commit.repository) ?? 0) + 1);
    branchCounts.set(commit.branch, (branchCounts.get(commit.branch) ?? 0) + 1);
    const day = format(commit.committedAt, 'yyyy-MM-dd');
    const month = format(commit.committedAt, 'yyyy-MM');
    daily.set(day, (daily.get(day) ?? 0) + 1);
    monthly.set(month, (monthly.get(month) ?? 0) + 1);
    histogram.set(commit.committedAt.getHours(), (histogram.get(commit.committedAt.getHours()) ?? 0) + 1);
    insertions += commit.insertions;
    deletions += commit.deletions;
  });

  const sortedDays = [...daily.keys()].sort();
  let currentStreak = 0;
  let dateCursor = startOfDay(new Date());
  while (daily.has(format(dateCursor, 'yyyy-MM-dd'))) {
    currentStreak += 1;
    dateCursor = subDays(dateCursor, 1);
  }

  return {
    totalCommits,
    mostActiveRepository: [...repoCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A',
    mostActiveBranch: [...branchCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A',
    commitStreakDays: currentStreak,
    codeChurn: { insertions, deletions },
    commitsByDay: sortedDays.map((day) => ({ day, commits: daily.get(day) ?? 0 })),
    commitsByMonth: [...monthly.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, commits]) => ({ month, commits })),
    repositoryDistribution: [...repoCounts.entries()].map(([name, value]) => ({ name, value })),
    activityHistogram: [...histogram.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([hour, commits]) => ({ hour: `${hour}:00`, commits })),
    contributionHeatmap: Array.from({ length: 120 }).map((_, i) => {
      const day = subDays(startOfDay(new Date()), 119 - i);
      const key = format(day, 'yyyy-MM-dd');
      return {
        date: key,
        commits: daily.get(key) ?? 0,
        age: differenceInCalendarDays(new Date(), day)
      };
    })
  };
};
