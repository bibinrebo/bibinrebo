'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import {
  Line,
  LineChart,
  Pie,
  PieChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Bar,
  BarChart,
  Legend,
  Cell
} from 'recharts';

const COLORS = ['#38bdf8', '#f97316', '#34d399', '#facc15', '#a78bfa', '#fb7185'];

type Commit = {
  sha: string;
  repository: string;
  branch: string;
  author: string;
  messageShort: string;
  commitUrl: string;
  pullRequestUrl: string | null;
  commitType: string;
  filesChangedCount: number;
  insertions: number;
  deletions: number;
  isMergeCommit: boolean;
  committedAt: string;
};

type Overview = {

  from: string;
  to: string | null;
  totalCommits: number;
  mostActiveRepository: string;
  mostActiveBranch: string;
  commitStreakDays: number;
  codeChurn: { insertions: number; deletions: number };
  commitsByDay: Array<{ day: string; commits: number }>;
  commitsByMonth: Array<{ month: string; commits: number }>;
  repositoryDistribution: Array<{ name: string; value: number }>;
  activityHistogram: Array<{ hour: string; commits: number }>;
  contributionHeatmap: Array<{ date: string; commits: number }>;
};

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [sortGranularity, setSortGranularity] = useState<'day' | 'month' | 'year'>('day');
  const [filters, setFilters] = useState({ repository: '', branch: '', commitType: '', search: '', includeMerge: true });

  const fetchData = async () => {
    setLoading(true);
    const query = new URLSearchParams({
      repository: filters.repository,
      branch: filters.branch,
      commitType: filters.commitType,
      search: filters.search,
      includeMerge: String(filters.includeMerge),
      sortBy: sortGranularity,
      page: '1',
      pageSize: '200'
    });

    const [overviewRes, commitsRes] = await Promise.all([
      fetch('/api/analytics/overview'),
      fetch(`/api/commits?${query.toString()}`)
    ]);

    const overviewJson = await overviewRes.json();
    const commitsJson = await commitsRes.json();
    setOverview(overviewJson);
    setCommits(commitsJson.commits ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.repository, filters.branch, filters.commitType, filters.search, filters.includeMerge, sortGranularity]);

  const columns = useMemo<ColumnDef<Commit>[]>(
    () => [
      { accessorKey: 'committedAt', header: 'Date', cell: (info) => new Date(info.getValue<string>()).toLocaleString() },
      { accessorKey: 'repository', header: 'Repository' },
      { accessorKey: 'branch', header: 'Branch' },
      { accessorKey: 'author', header: 'Author' },
      { accessorKey: 'commitType', header: 'Type' },
      { accessorKey: 'messageShort', header: 'Message' },
      {
        accessorKey: 'commitUrl',
        header: 'Links',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <a className="text-sky-400 underline" href={row.original.commitUrl} target="_blank" rel="noreferrer">
              Commit
            </a>
            {row.original.pullRequestUrl && (
              <a className="text-emerald-400 underline" href={row.original.pullRequestUrl} target="_blank" rel="noreferrer">
                PR
              </a>
            )}
          </div>
        )
      }
    ],
    []
  );


  const tableData = useMemo(() => {
    const rank = (date: Date) => {
      if (sortGranularity === 'year') return date.getUTCFullYear();
      if (sortGranularity === 'month') return date.getUTCFullYear() * 12 + date.getUTCMonth();
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    };

    return [...commits].sort((a, b) => {
      const dateA = new Date(a.committedAt);
      const dateB = new Date(b.committedAt);
      const diff = rank(dateB) - rank(dateA);
      if (diff !== 0) return diff;
      return dateB.getTime() - dateA.getTime();
    });
  }, [commits, sortGranularity]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  const exportCsv = () => {
    const header = ['sha', 'repository', 'branch', 'author', 'type', 'message', 'insertions', 'deletions', 'committedAt'];
    const rows = commits.map((c) =>
      [c.sha, c.repository, c.branch, c.author, c.commitType, c.messageShort, c.insertions, c.deletions, c.committedAt].join(',')
    );
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'commit-analytics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !overview) return <div className="p-10">Loading dashboard...</div>;

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Commit Analytics Dashboard</h1>
      <p className="text-sm text-slate-400">
        Showing data from {new Date(overview.from).toLocaleString()}
        {overview.to ? ` to ${new Date(overview.to).toLocaleString()}` : ''}
      </p>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Metric label="Total Commits" value={overview.totalCommits} />
        <Metric label="Most Active Repo" value={overview.mostActiveRepository} />
        <Metric label="Most Active Branch" value={overview.mostActiveBranch} />
        <Metric label="Commit Streak" value={`${overview.commitStreakDays} days`} />
        <Metric label="Insertions" value={overview.codeChurn.insertions} />
        <Metric label="Deletions" value={overview.codeChurn.deletions} />
      </section>

      <section className="card grid gap-4 md:grid-cols-6" aria-label="Filters">
        <input className="rounded bg-slate-800 p-2" placeholder="Repository" onChange={(e) => setFilters((s) => ({ ...s, repository: e.target.value }))} />
        <input className="rounded bg-slate-800 p-2" placeholder="Branch" onChange={(e) => setFilters((s) => ({ ...s, branch: e.target.value }))} />
        <input className="rounded bg-slate-800 p-2" placeholder="Commit type" onChange={(e) => setFilters((s) => ({ ...s, commitType: e.target.value }))} />
        <input className="rounded bg-slate-800 p-2" placeholder="Search message" onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} />
        <label className="flex items-center gap-2">
          <input type="checkbox" defaultChecked onChange={(e) => setFilters((s) => ({ ...s, includeMerge: e.target.checked }))} />
          Include merges
        </label>
        <select className="rounded bg-slate-800 p-2" value={sortGranularity} onChange={(e) => setSortGranularity(e.target.value as 'day' | 'month' | 'year')} aria-label="Sort by day month year">
          <option value="day">Sort by day</option>
          <option value="month">Sort by month</option>
          <option value="year">Sort by year</option>
        </select>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily Commits Line Chart">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={overview.commitsByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" hide />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="commits" stroke="#38bdf8" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Aggregation">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={overview.commitsByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="commits" fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Repository Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={overview.repositoryDistribution} dataKey="value" nameKey="name" outerRadius={90}>
                {overview.repositoryDistribution.map((entry, idx) => (
                  <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Coding Activity by Hour">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={overview.activityHistogram}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="commits" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">GitHub-style Contribution Heatmap</h2>
        <div className="grid grid-cols-24 gap-1">
          {overview.contributionHeatmap.map((day) => (
            <div
              key={day.date}
              className="h-4 w-4 rounded"
              style={{ backgroundColor: day.commits === 0 ? '#1e293b' : day.commits < 3 ? '#0ea5e9' : day.commits < 6 ? '#22c55e' : '#84cc16' }}
              title={`${day.date}: ${day.commits} commits`}
            />
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Commit History Table</h2>
          <button className="rounded bg-sky-600 px-3 py-2" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="cursor-pointer border-b border-slate-700 p-2 text-left"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-800">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-2 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button className="rounded border border-slate-700 px-3 py-1" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </button>
          <button className="rounded border border-slate-700 px-3 py-1" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card" role="status" aria-label={label}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}
