#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const root = process.cwd();
const ledgerPath = 'reports/validation/mpcq-batch-reviews/review-ledger.json';

function run(command, args) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { command: [basename(command), ...args].join(' '), exitCode: 0, stdout: stdout.trim() };
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      failedCommand: [basename(command), ...args].join(' '),
      exitCode: error.status ?? 1,
      stdout: String(error.stdout ?? '').trim(),
      stderr: String(error.stderr ?? '').trim()
    }, null, 2));
    process.exit(error.status || 1);
  }
}

function fail(message, details = undefined) {
  console.error(JSON.stringify({ ok: false, error: message, details }, null, 2));
  process.exit(1);
}

const commands = [
  run(process.execPath, ['--check', 'scripts/repair-mpcq-k1-sec01-first3.mjs']),
  run(process.execPath, ['--check', 'scripts/audit-mpcq-quality.mjs']),
  run(process.execPath, ['scripts/validate-question-intake-candidates.mjs'])
];

const auditCommand = run(process.execPath, ['scripts/audit-mpcq-quality.mjs']);
commands.push(auditCommand);
let audit;
try {
  audit = JSON.parse(auditCommand.stdout);
} catch (error) {
  fail('Audit command did not return parseable JSON', {
    error: String(error.message ?? error),
    stdout: auditCommand.stdout
  });
}
if (audit.totalCandidates <= 0) fail('Audit totalCandidates must be positive', audit);
if (audit.hardFailedCandidates !== 0) fail('MPCQ audit still has hard failures', audit);
if (audit.likelyMpcqPassCandidates !== audit.totalCandidates) fail('MPCQ audit likely pass count does not equal total candidates', audit);
if (Array.isArray(audit.sampleFailures) && audit.sampleFailures.length !== 0) fail('MPCQ audit still has sample failures', audit.sampleFailures);

if (!existsSync(join(root, ledgerPath))) {
  fail(`Missing read-only review ledger: ${ledgerPath}`);
}
const ledger = JSON.parse(readFileSync(join(root, ledgerPath), 'utf8'));
if (!Array.isArray(ledger.batches) || ledger.batches.length === 0) {
  fail('Read-only review ledger has no registered batches');
}

const passedBatchIds = new Set(ledger.batches
  .filter((batch) => batch.status === 'readonly_review_passed')
  .map((batch) => batch.batchId));
const invalidBatches = ledger.batches.filter((batch) => {
  if (batch.status === 'readonly_review_passed') return false;
  if (batch.status === 'superseded_by_repair' && passedBatchIds.has(batch.supersededByBatchId)) return false;
  return true;
});
if (invalidBatches.length) {
  fail('Final gate blocked: every active MPCQ repair batch requires separate read-only PASS review', invalidBatches.map((batch) => ({
    batchId: batch.batchId,
    ids: batch.ids,
    status: batch.status,
    supersededByBatchId: batch.supersededByBatchId,
    reviewJson: batch.reviewJson,
    reviewMarkdown: batch.reviewMarkdown
  })));
}

for (const batch of ledger.batches) {
  if (batch.status === 'superseded_by_repair') continue;
  if (!batch.reviewJson) fail(`Ledger batch ${batch.batchId} is missing reviewJson`);
  commands.push(run(process.execPath, ['scripts/validate-mpcq-readonly-review.mjs', `--review=${batch.reviewJson}`]));
}

console.log(JSON.stringify({
  ok: true,
  status: 'mpcq_final_gate_passed',
  audit: {
    totalCandidates: audit.totalCandidates,
    hardFailedCandidates: audit.hardFailedCandidates,
    likelyMpcqPassCandidates: audit.likelyMpcqPassCandidates
  },
  reviewedBatches: ledger.batches.length,
  commands: commands.map(({ command, exitCode }) => ({ command, exitCode }))
}, null, 2));
