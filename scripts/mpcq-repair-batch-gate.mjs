#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const root = process.cwd();
const repairScript = 'scripts/repair-mpcq-k1-sec01-first3.mjs';
const candidatesPath = 'questions/intake-candidates.jsonl';
const reviewDir = 'reports/validation/mpcq-batch-reviews';
const ledgerPath = join(reviewDir, 'review-ledger.json');
const requiredStandards = [
  'skill:singaporempc/SKILL.md',
  'skill:singapore-format-4-pure-text/SKILL.md',
  'skill:singaporempc/references/high-inference-doctrine.md'
];

function arg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
}

function readJsonl(rel) {
  const text = readFileSync(join(root, rel), 'utf8').trim();
  return text ? text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : [];
}

function readRepairIds() {
  const source = readFileSync(join(root, repairScript), 'utf8');
  return [...source.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);
}

function loadCandidateById() {
  return new Map(readJsonl(candidatesPath).map((candidate, index) => [
    candidate.id,
    { ...candidate, __line: index + 1 }
  ]));
}

function readPositiveInt(name, fallback = undefined) {
  const raw = arg(name);
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) fail(`${name} must be a non-negative integer, got ${raw}`);
  return parsed;
}

function resolveBatch() {
  const idsArg = arg('ids');
  if (idsArg) {
    const ids = idsArg.split(',').map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) fail('--ids must contain at least one id');
    if (ids.length > 3) fail(`Max 3 questions per review batch. Got ${ids.length}.`);
    if (new Set(ids).size !== ids.length) fail(`Duplicate ids in --ids: ${idsArg}`);
    if (hasFlag('apply')) fail('--apply requires --offset and --count, not --ids');
    return {
      selector: 'ids',
      offset: null,
      count: ids.length,
      ids
    };
  }

  const offset = readPositiveInt('offset');
  const count = readPositiveInt('count', 3);
  if (offset === undefined) fail('Expected --offset plus --count, or --ids.');
  if (count < 1) fail('--count must be at least 1');
  if (count > 3) fail(`Max 3 repairs per batch. Requested ${count}.`);

  const repairIds = readRepairIds();
  const ids = repairIds.slice(offset, offset + count);
  if (ids.length !== count) fail(`Requested ${count} repairs from offset ${offset}, found ${ids.length}.`);
  return {
    selector: 'offset',
    offset,
    count,
    ids
  };
}

function commandResult(command, args, allowFailure = false) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { command: [basename(command), ...args].join(' '), exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (error) {
    const result = {
      command: [basename(command), ...args].join(' '),
      exitCode: error.status ?? 1,
      stdout: String(error.stdout ?? '').trim(),
      stderr: String(error.stderr ?? '').trim()
    };
    if (!allowFailure) {
      console.error(JSON.stringify({ ok: false, failedCommand: result }, null, 2));
      process.exit(result.exitCode || 1);
    }
    return result;
  }
}

function stableStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, 'Z');
}

function candidateSummary(candidate) {
  return {
    id: candidate.id,
    candidateHash: stableCandidateHash(candidate),
    line: null,
    studentStem: candidate.studentStem,
    stemWordCount: String(candidate.studentStem ?? '').trim().split(/\s+/).filter(Boolean).length,
    stemCharCount: String(candidate.studentStem ?? '').length,
    options: candidate.options,
    correctOptionId: candidate.correctOptionId,
    correctText: candidate.options?.find((option) => option.id === candidate.correctOptionId)?.text ?? null,
    runtimeProjection: candidate.runtimeProjection,
    qklCount: candidate.questionKnowledgeLinks?.length ?? 0,
    knowledgeLinkMapCount: candidate.knowledge_link_map?.length ?? 0,
    construction_note_en: candidate.construction_note_en,
    shortcut_check: candidate.shortcut_check,
    validationReport: {
      runtimeImportAllowed: candidate.validationReport?.runtimeImportAllowed,
      importApplyAllowed: candidate.validationReport?.importApplyAllowed,
      kvWriteAllowed: candidate.validationReport?.kvWriteAllowed,
      safeActiveWriteAllowed: candidate.validationReport?.safeActiveWriteAllowed,
      pixelWriteAllowed: candidate.validationReport?.pixelWriteAllowed
    }
  };
}

function stableHash(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function stableCandidateHash(candidate) {
  const { __line, ...stableCandidate } = candidate;
  return stableHash(stableCandidate);
}

function readLedger() {
  if (!existsSync(join(root, ledgerPath))) {
    return { schemaVersion: 'mpcq-readonly-review-ledger-v1', updatedAt: null, batches: [] };
  }
  return JSON.parse(readFileSync(join(root, ledgerPath), 'utf8'));
}

function writeLedger(ledger) {
  ledger.updatedAt = new Date().toISOString();
  mkdirSync(dirname(join(root, ledgerPath)), { recursive: true });
  const tmp = join(root, `${ledgerPath}.tmp`);
  writeFileSync(tmp, JSON.stringify(ledger, null, 2) + '\n');
  renameSync(tmp, join(root, ledgerPath));
}

function upsertLedgerBatch(batch) {
  const ledger = readLedger();
  const next = ledger.batches.filter((item) => item.batchId !== batch.batchId);
  next.push(batch);
  ledger.batches = next;
  writeLedger(ledger);
}

const batch = resolveBatch();
let candidateById = loadCandidateById();
let missing = batch.ids.filter((id) => !candidateById.has(id));
if (missing.length) fail(`Missing candidates in ${candidatesPath}: ${missing.join(', ')}`);

const commandsRun = [];
commandsRun.push(commandResult(process.execPath, ['--check', repairScript]));

if (hasFlag('apply')) {
  commandsRun.push(commandResult(process.execPath, [repairScript, `--offset=${batch.offset}`, `--count=${batch.count}`]));
  commandsRun.push(commandResult(process.execPath, ['scripts/validate-question-intake-candidates.mjs']));
  commandsRun.push(commandResult(process.execPath, ['scripts/audit-mpcq-quality.mjs', '--write'], true));
  candidateById = loadCandidateById();
  missing = batch.ids.filter((id) => !candidateById.has(id));
  if (missing.length) fail(`Missing candidates after repair in ${candidatesPath}: ${missing.join(', ')}`);
}

const stamp = stableStamp();
const selectorLabel = batch.selector === 'offset'
  ? `offset${batch.offset}-count${batch.count}`
  : `ids-${batch.ids.map((id) => id.replace(/^bio-q-/, '')).join('_')}`;
const batchId = arg('batch-id') ?? `mpcq-${stamp}-${selectorLabel}`;
const jsonPath = join(reviewDir, `${batchId}.review.json`);
const mdPath = join(reviewDir, `${batchId}.review.md`);

const reviewPacket = {
  schemaVersion: 'mpcq-readonly-review-v1',
  batch: {
    batchId,
    selector: batch.selector,
    offset: batch.offset,
    count: batch.count,
    ids: batch.ids,
    sourceFile: candidatesPath,
    createdAt: new Date().toISOString(),
    status: 'readonly_review_required'
  },
  reviewer: {
    name: 'TODO',
    mode: 'read_only_separate_context',
    reviewedAt: null,
    didNotEditFiles: false,
    reviewerNotRepairAuthor: false,
    didReadStandards: []
  },
  requiredStandards,
  requiredChecks: [
    'stemWithin50WordsAnd320Chars',
    'neutralAnswerLabels',
    'noOneFactSolvability',
    'noAnswerShapeShortcut',
    'noLongestRowShortcut',
    'constructionNoteEnglishOnly',
    'qklAndKlmAtLeast4',
    'runtimeProjectionKemiCompatible',
    'noRuntimeImportKvPixelWrites'
  ],
  commandsRun,
  candidates: batch.ids.map((id) => {
    const summary = candidateSummary(candidateById.get(id));
    summary.line = candidateById.get(id).__line;
    return summary;
  }),
  verdicts: batch.ids.map((id) => ({
    id,
    verdict: 'TODO',
    checks: {
      stemWithin50WordsAnd320Chars: false,
      neutralAnswerLabels: false,
      noOneFactSolvability: false,
      noAnswerShapeShortcut: false,
      noLongestRowShortcut: false,
      constructionNoteEnglishOnly: false,
      qklAndKlmAtLeast4: false,
      runtimeProjectionKemiCompatible: false,
      noRuntimeImportKvPixelWrites: false
    },
    findings: [],
    exactRepairTextIfFail: null
  }))
};

const prompt = `Read-only review. In this repository, review exactly these questions in ${candidatesPath}: ${batch.ids.join(', ')}.

Do not edit files. Apply singaporempc / pure-text MPCQ standards:
- stem <=50 words and <=320 chars
- neutral answer labels
- no one-fact solvability
- no answer-shape shortcut
- no longest-row shortcut
- construction_note_en English-only
- at least 4 QKL/KLM entries
- runtimeProjection typ Kemi-compatible
- no runtime/import/KV/pixel writes

You must read these standards first:
${requiredStandards.map((standard) => `- ${standard}`).join('\n')}

Return PASS/FAIL per id. For FAIL, include exact repair text for failed stems/notes. Fill ${jsonPath} or return equivalent JSON with schemaVersion mpcq-readonly-review-v1.
`;

mkdirSync(join(root, reviewDir), { recursive: true });
writeFileSync(join(root, jsonPath), JSON.stringify(reviewPacket, null, 2) + '\n');
writeFileSync(join(root, mdPath), prompt);

upsertLedgerBatch({
  batchId,
  selector: batch.selector,
  offset: batch.offset,
  count: batch.count,
  ids: batch.ids,
  reviewJson: jsonPath,
  reviewMarkdown: mdPath,
  status: 'readonly_review_required',
  createdAt: reviewPacket.batch.createdAt,
  appliedByThisRun: hasFlag('apply')
});

console.log(JSON.stringify({
  ok: true,
  status: 'readonly_review_required',
  batchId,
  ids: batch.ids,
  reviewJson: jsonPath,
  reviewMarkdown: mdPath,
  ledger: ledgerPath,
  note: 'This batch is not complete until validate-mpcq-readonly-review.mjs passes for the review JSON.'
}, null, 2));
