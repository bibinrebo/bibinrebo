#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const requiredFiles = [
  'package.json',
  'prisma/schema.prisma',
  'app/api/webhooks/github/route.ts',
  'app/api/analytics/overview/route.ts',
  'app/api/commits/route.ts',
  'components/analytics-dashboard.tsx',
  'README.md'
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.resolve(file)));
if (missing.length) {
  console.error('Missing required files:\n' + missing.map((m) => ` - ${m}`).join('\n'));
  process.exit(1);
}

const prismaSchema = fs.readFileSync('prisma/schema.prisma', 'utf8');
const requiredSchemaBits = ['model Commit', '@@index([committedAt])', '@@index([repository])', '@@index([branch])', '@@index([author])'];
const schemaMissing = requiredSchemaBits.filter((bit) => !prismaSchema.includes(bit));
if (schemaMissing.length) {
  console.error('Schema is missing expected sections:\n' + schemaMissing.map((m) => ` - ${m}`).join('\n'));
  process.exit(1);
}

const webhookRoute = fs.readFileSync('app/api/webhooks/github/route.ts', 'utf8');
const webhookChecks = ['x-hub-signature-256', 'verifyGithubSignature', 'prisma.commit.upsert'];
const webhookMissing = webhookChecks.filter((bit) => !webhookRoute.includes(bit));
if (webhookMissing.length) {
  console.error('Webhook route missing expected logic:\n' + webhookMissing.map((m) => ` - ${m}`).join('\n'));
  process.exit(1);
}

console.log('Project validation passed.');
