#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const write = process.argv.includes('--write');
const outIndex = process.argv.indexOf('--out');
const outDir = outIndex >= 0 ? process.argv[outIndex + 1] : null;

const included = [
  'docs/ocr-agent-runbook.md',
  'manifest/book-edition.json',
  'manifest/toc.json',
  'manifest/source-policy.json',
  'manifest/rotation-contract.json',
  'manifest/source-inventory.json',
  'manifest/edition-registry.json',
  'manifest/private-source-registry.md',
  'manifest/ocr-run-contract.json',
  'lineage/README.md',
  'lineage/book-locations.jsonl',
  'lineage/source-claims.jsonl',
  'lineage/knowledge-point-candidates.jsonl',
  'lineage/atomic-knowledge-point-worklist.json',
  'lineage/source-claim-review-worklist.json',
  'lineage/page-records.jsonl',
  'lineage/source-evidence.jsonl',
  'lineage/section-boundary-decisions.jsonl',
  'questions/intake-candidates.jsonl',
  'questions/intake-contract.json',
  'questions/intake-worklist.json',
  'assets/pixel-briefs/README.md',
  'assets/pixel-briefs/pixel-brief-template.json',
  'schemas/book-edition.schema.json',
  'schemas/toc.schema.json',
  'schemas/book-location.schema.json',
  'schemas/source-claim.schema.json',
  'schemas/page-record.schema.json',
  'schemas/knowledge-point-candidate.schema.json',
  'reports/validation/ocr-contract-summary.md',
  'reports/validation/page-boundary-conflicts.md',
  'reports/validation/ocr-agent-worklist.json',
  'reports/validation/pixel-readiness-gates.md',
  'reports/validation/question-intake-readiness.md',
  'reports/validation/atomic-kp-readiness.md',
  'reports/validation/source-claim-review-readiness.md',
  'reports/validation/rotation-readiness.md',
  'reports/validation/page-coverage-matrix.md',
  'reports/validation/public-safety-audit.md',
  'reports/validation/source-lineage-review.md',
  'reports/validation/ocr-quality-report.md',
  'reports/validation/no-runtime-before-ocr.md',
  'reports/validation/generated-contract-hashes.json',
  'scripts/regenerate-biologi-contract.mjs',
  'scripts/build-question-intake-worklist.mjs',
  'scripts/build-atomic-kp-worklist.mjs',
  'scripts/build-source-claim-review-worklist.mjs',
  'scripts/validate-ocr-contract.mjs',
  'scripts/validate-question-intake-worklist.mjs',
  'scripts/validate-atomic-kp-worklist.mjs',
  'scripts/validate-source-claim-review-worklist.mjs',
  'scripts/sanitize-handoff.mjs'
];

const excluded = ['page_renders/', 'ocr_data/', 'margin_samples/', '.firecrawl/', '.git/'];
const leakPatterns = [/C:\\/i, /C:\//i, /\bOneDrive\b/i, /\bSkrivbord\b/i, /\/home\/user\/workspace/i, /rawOcrText/i, /rawOcrExcerpt/i, /studentPin/i, /cookie\s*=/i, /set-cookie/i, /upstash/i];
const scannerToolFiles = new Set([
  'scripts/validate-ocr-contract.mjs',
  'scripts/validate-question-intake-worklist.mjs',
  'scripts/validate-atomic-kp-worklist.mjs',
  'scripts/validate-source-claim-review-worklist.mjs',
  'scripts/sanitize-handoff.mjs'
]);
const errors = [];

for (const rel of included) {
  const abs = join(root, rel);
  if (!existsSync(abs)) errors.push(`missing sanitized input: ${rel}`);
  else {
    const text = readFileSync(abs, 'utf8');
    if (!scannerToolFiles.has(rel)) {
      for (const pattern of leakPatterns) if (pattern.test(text)) errors.push(`leaky token in sanitized input ${rel}: ${pattern}`);
    }
  }
}

if (write) {
  if (!outDir) errors.push('use --out <dir> with --write');
  if (errors.length === 0) {
    for (const rel of included) {
      const target = join(root, outDir, rel);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(join(root, rel), target);
    }
  }
}

console.log(JSON.stringify({ ok: errors.length === 0, write, outDir, included, excluded, errors }, null, 2));
if (errors.length > 0) process.exit(1);
