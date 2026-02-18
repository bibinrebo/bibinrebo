# Commit Analytics Dashboard

A full-stack Next.js + PostgreSQL dashboard that automatically ingests GitHub commit events and visualizes commit analytics across repositories.

## Features

- **Automated tracking** via GitHub Webhooks (`/api/webhooks/github`)
- **Secure webhook validation** with `X-Hub-Signature-256`
- **PostgreSQL + Prisma** storage with analytics-friendly indexes
- **Deduplication** using unique commit SHA
- **Analytics cards** (total commits, streak, churn, active repo/branch)
- **Interactive table** with sorting, filtering, merge toggle, pagination, and CSV export
- **Charts**: daily line, monthly bars, repository pie, hourly activity histogram, contribution heatmap

## Tech Stack

- Next.js (App Router), TypeScript, TailwindCSS
- Prisma ORM + PostgreSQL
- TanStack Table + Recharts

## 1) Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+

Check versions:

```bash
node -v
npm -v
psql --version
```

## 2) Environment Variables

Create `.env` at project root:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/commit_analytics"
GITHUB_WEBHOOK_SECRET="your_webhook_secret"
GITHUB_TOKEN="ghp_xxx_optional_for_stats_and_pr_links"
```

## 3) Install + Database Setup

```bash
npm install
npm run prisma:generate
npx prisma migrate dev --name init
```

## 4) Start the App

```bash
npm run dev
```

Open `http://localhost:3000`.

## 5) Configure GitHub Webhook

1. Repo Settings → Webhooks → Add webhook
2. Payload URL: `https://<your-domain>/api/webhooks/github`
3. Content type: `application/json`
4. Secret: same as `GITHUB_WEBHOOK_SECRET`
5. Events: **Just the push event**

## 6) Testing / Validation

### Fast project validation (no dependency install required)

```bash
node scripts/validate-project.mjs
```

### Full checks (after dependencies install)

```bash
npm run typecheck
npm run lint
npm run build
```

## API Endpoints

- `POST /api/webhooks/github` – ingest push commits
- `GET /api/analytics/overview` – overview metrics + chart series (defaults to current month, accepts `from`/`to` ISO query params)
- `GET /api/commits` – filterable commit list (defaults to current month, accepts `from`/`to` ISO query params)

## Troubleshooting

- If `npm install` fails with `403 Forbidden`, your network or registry policy is blocking npm packages.
  - Verify registry: `npm config get registry`
  - Expected default: `https://registry.npmjs.org/`
  - If your company uses a private registry, ensure `@prisma/client`, `next`, and other packages are allowed.
- If webhook responses return `401 Invalid signature`, confirm the GitHub webhook secret exactly matches `GITHUB_WEBHOOK_SECRET`.
