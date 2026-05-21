#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const reviewDir = 'reports/validation/mpcq-batch-reviews';
const ledgerPath = join(reviewDir, 'review-ledger.json');
const requiredStandards = [
  'skill:singaporempc/SKILL.md',
  'skill:singapore-format-4-pure-text/SKILL.md',
  'skill:singaporempc/references/high-inference-doctrine.md'
];
const requiredChecks = [
  'stemWithin50WordsAnd320Chars',
  'neutralAnswerLabels',
  'noOneFactSolvability',
  'noAnswerShapeShortcut',
  'noLongestRowShortcut',
  'constructionNoteEnglishOnly',
  'qklAndKlmAtLeast4',
  'runtimeProjectionKemiCompatible',
  'noRuntimeImportKvPixelWrites'
];
const allowedRuntimeTypes = new Set([
  'analys',
  'begrepp',
  'beräkning',
  'faktagrund',
  'flerval',
  'förståelse',
  'jämförelse',
  'metod',
  'modell',
  'process',
  'resonemang',
  'samband',
  'singapore-combination',
  'singapore-graph-mcq',
  'singapore-single-visual',
  'singapore-single-visual-mcq',
  'singapore-statement-visual-mcq',
  'singapore-table',
  'singapore-table-mcq',
  'tillämpning'
]);

function arg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function fail(errors) {
  const list = Array.isArray(errors) ? errors : [errors];
  console.error(JSON.stringify({ ok: false, errors: list }, null, 2));
  process.exit(1);
}

function readJsonl(rel) {
  const text = readFileSync(join(root, rel), 'utf8').trim();
  return text ? text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : [];
}

function readLedger() {
  if (!existsSync(join(root, ledgerPath))) {
    return { schemaVersion: 'mpcq-readonly-review-ledger-v1', updatedAt: null, batches: [] };
  }
  return JSON.parse(readFileSync(join(root, ledgerPath), 'utf8'));
}

function writeLedger(ledger) {
  ledger.updatedAt = new Date().toISOString();
  const tmp = join(root, `${ledgerPath}.tmp`);
  writeFileSync(tmp, JSON.stringify(ledger, null, 2) + '\n');
  renameSync(tmp, join(root, ledgerPath));
}

function wordCount(value) {
  return String(value ?? '').trim().split(/\s+/).filter(Boolean).length;
}

function stableHash(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function stableCandidateHash(candidate) {
  const { __line, ...stableCandidate } = candidate;
  return stableHash(stableCandidate);
}

function constructionNoteLooksEnglish(note) {
  const text = String(note ?? '');
  if (!text) return false;
  if (/[^\x00-\x7F]/.test(text)) return false;
  if (/\b(r\u00e4tt|fr\u00e5ga|elev|beh\u00f6ver|\u00e5terkoppla|svar|vilken|vilket)\b/i.test(text)) return false;
  return true;
}

function writeFlagsClosed(candidate) {
  const report = candidate.validationReport ?? {};
  return [
    report.runtimeImportAllowed,
    report.importApplyAllowed,
    report.kvWriteAllowed,
    report.safeActiveWriteAllowed,
    report.pixelWriteAllowed,
    report.runtimeActivationAllowed,
    report.productionDeployAllowed
  ].every((value) => value === false || value === undefined);
}

function normalizeStandard(value) {
  return String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/^[A-Za-z]:\/Users\/[^/]+\/\.Codex\/memories\/singapore_stella_protocol\.md$/i, 'memory:singapore_stella_protocol')
    .replace(/^[A-Za-z]:\/Users\/[^/]+\/\.agents\/skills\//i, 'skill:')
    .replace(/^singaporempc\/SKILL\.md$/i, 'skill:singaporempc/SKILL.md')
    .replace(/^singapore-format-4-pure-text\/SKILL\.md$/i, 'skill:singapore-format-4-pure-text/SKILL.md')
    .replace(/^high-inference-doctrine\.md$/i, 'skill:singaporempc/references/high-inference-doctrine.md');
}

function didReadStandard(values, standard) {
  const normalized = new Set((values ?? []).map(normalizeStandard));
  return normalized.has(standard);
}

const reviewPath = arg('review');
if (!reviewPath) fail('Expected --review=reports/validation/mpcq-batch-reviews/<batch>.review.json');

const fullReviewPath = join(root, reviewPath);
if (!existsSync(fullReviewPath)) fail(`Review file not found: ${reviewPath}`);

const review = JSON.parse(readFileSync(fullReviewPath, 'utf8'));
const errors = [];

if (review.schemaVersion !== 'mpcq-readonly-review-v1') errors.push('schemaVersion must be mpcq-readonly-review-v1');
if (!review.batch?.batchId) errors.push('batch.batchId is required');
if (!Array.isArray(review.batch?.ids) || review.batch.ids.length < 1) errors.push('batch.ids must contain 1-3 ids');
if (review.batch?.ids?.length > 3) errors.push(`Max 3 ids per review batch, got ${review.batch.ids.length}`);
if (new Set(review.batch?.ids ?? []).size !== (review.batch?.ids ?? []).length) errors.push('batch.ids contains duplicates');
if (review.reviewer?.mode !== 'read_only_separate_context') errors.push('reviewer.mode must be read_only_separate_context');
if (!review.reviewer?.name || review.reviewer.name === 'TODO') errors.push('reviewer.name must identify the separate reviewer');
if (!review.reviewer?.reviewedAt || review.reviewer.reviewedAt === 'TODO') errors.push('reviewer.reviewedAt is required');
if (review.reviewer?.didNotEditFiles !== true) errors.push('reviewer.didNotEditFiles must be true');
if (review.reviewer?.reviewerNotRepairAuthor !== true) errors.push('reviewer.reviewerNotRepairAuthor must be true');

for (const standard of requiredStandards) {
  if (!didReadStandard(review.reviewer?.didReadStandards, standard)) {
    errors.push(`reviewer.didReadStandards must include ${standard}`);
  }
}

const verdicts = Array.isArray(review.verdicts) ? review.verdicts : [];
const verdictById = new Map(verdicts.map((verdict) => [verdict.id, verdict]));
for (const id of review.batch?.ids ?? []) {
  if (!verdictById.has(id)) errors.push(`Missing verdict for ${id}`);
}
for (const verdict of verdicts) {
  if (!review.batch.ids.includes(verdict.id)) errors.push(`Unexpected verdict id ${verdict.id}`);
}

const candidateById = new Map(readJsonl(review.batch?.sourceFile ?? 'questions/intake-candidates.jsonl').map((candidate) => [candidate.id, candidate]));
const reviewCandidateById = new Map((review.candidates ?? []).map((candidate) => [candidate.id, candidate]));
for (const id of review.batch?.ids ?? []) {
  const candidate = candidateById.get(id);
  if (!candidate) {
    errors.push(`Candidate not found: ${id}`);
    continue;
  }
  const reviewCandidate = reviewCandidateById.get(id);
  if (!reviewCandidate?.candidateHash) {
    errors.push(`${id} review packet is missing candidateHash; regenerate the review packet`);
  } else if (reviewCandidate.candidateHash !== stableCandidateHash(candidate)) {
    errors.push(`${id} candidate changed after the review packet was created; regenerate and re-review`);
  }

  const verdict = verdictById.get(id);
  if (!verdict) continue;
  if (verdict.verdict !== 'PASS') {
    errors.push(`${id} verdict is ${verdict.verdict}; exactRepairTextIfFail is required and batch remains blocked`);
    if (!verdict.exactRepairTextIfFail) errors.push(`${id} missing exactRepairTextIfFail`);
    continue;
  }

  for (const check of requiredChecks) {
    if (verdict.checks?.[check] !== true) errors.push(`${id} missing reviewer PASS check: ${check}`);
  }

  const stem = String(candidate.studentStem ?? '');
  if (wordCount(stem) > 50 || stem.length > 320) {
    errors.push(`${id} mechanical stem limit failed: ${wordCount(stem)} words, ${stem.length} chars`);
  }
  if (!constructionNoteLooksEnglish(candidate.construction_note_en)) {
    errors.push(`${id} construction_note_en is missing or not English-only`);
  }
  if ((candidate.questionKnowledgeLinks?.length ?? 0) < 4 || (candidate.knowledge_link_map?.length ?? 0) < 4) {
    errors.push(`${id} needs at least 4 QKL and 4 KLM entries`);
  }
  if (!allowedRuntimeTypes.has(candidate.runtimeProjection?.typ)) {
    errors.push(`${id} runtimeProjection.typ is not Kemi-compatible: ${candidate.runtimeProjection?.typ}`);
  }
  if (!writeFlagsClosed(candidate)) {
    errors.push(`${id} has an open runtime/import/KV/pixel/deploy flag`);
  }
}

if (errors.length) fail(errors);

const ledger = readLedger();
const ledgerItem = ledger.batches.find((item) => item.batchId === review.batch.batchId);
if (!ledgerItem) fail(`Review batch ${review.batch.batchId} is not registered in ${ledgerPath}`);
ledgerItem.status = 'readonly_review_passed';
ledgerItem.reviewedAt = new Date().toISOString();
ledgerItem.reviewJson = reviewPath;
ledgerItem.reviewValidatedBy = 'scripts/validate-mpcq-readonly-review.mjs';
writeLedger(ledger);

console.log(JSON.stringify({
  ok: true,
  status: 'readonly_review_passed',
  batchId: review.batch.batchId,
  ids: review.batch.ids,
  ledger: ledgerPath
}, null, 2));
