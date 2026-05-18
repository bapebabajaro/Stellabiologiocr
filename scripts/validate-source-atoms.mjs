#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const subject = 'biologi';
const bookEditionId = 'bookedition-stella-biologi-ocr-v1';
const allowedReviewStatuses = new Set(['reviewed_not_runtime', 'request_fix', 'reject']);
const allowedVisualKinds = new Set(['figure', 'model', 'table', 'diagram', 'lab_setup']);
const sourceAtomFields = new Set([
  'id',
  'schemaVersion',
  'subject',
  'bookEditionId',
  'sourceClaimIds',
  'evidenceRefIds',
  'atomText',
  'reviewStatus',
  'containsRawOcr',
  'runtimeEligible'
]);
const visualSourceAtomFields = new Set([
  'id',
  'schemaVersion',
  'subject',
  'bookEditionId',
  'sourceAtomId',
  'visualKind',
  'visualSummary',
  'reviewStatus',
  'containsPageImage',
  'runtimeEligible'
]);
const claimTableFields = new Set([
  'id',
  'schemaVersion',
  'subject',
  'bookEditionId',
  'sourceClaimId',
  'sourceAtomIds',
  'decision',
  'runtimeEligible'
]);
const forbiddenPatterns = [
  /raw_ocr_text/i,
  /raw_ocr_excerpt/i,
  /rawOcrText/i,
  /rawOcrExcerpt/i,
  /questionText/i,
  /answerText/i,
  /private-source:\/\//i,
  /[A-Z]:[\\/]+Users[\\/]+/i,
  /\bOneDrive\b|\bSkrivbord\b/i,
  /student[_-]?id|student[_-]?name|student_pin|studentPin|pinCode|\bPIN\b|elev\s*[=:]|elevId|elevNamn|loginId|klassId|\blogin\s*[=:]|\bklass\s*[=:]/i,
  /set-cookie|cookie/i,
  /kvKey|KV key|UPSTASH|KV_REST|kv:/i
];

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8').replace(/^\uFEFF/, ''));
}

function runPreconditionValidator(rel) {
  try {
    execFileSync(process.execPath, [rel], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    const detail = String(error.stdout || error.stderr || error.message || '').trim();
    assert.fail(`${rel} failed${detail ? `: ${detail}` : ''}`);
  }
}

function readJsonl(rel) {
  const text = readFileSync(join(root, rel), 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${rel}:${index + 1}: ${error.message}`);
    }
  });
}

function asString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function statusValues(row) {
  return ['status', 'reviewStatus', 'decisionStatus', 'decision']
    .map((key) => asString(row[key]))
    .filter(Boolean)
    .map((value) => value.toLowerCase());
}

function isReadyDecision(row) {
  const values = statusValues(row);
  return values.length > 0 && values.every((value) => value === 'reviewed_not_runtime');
}

function targetClaimId(row, sourceClaimIds, reviewItemById, reviewItemByBookLocationId) {
  const claimId = asString(row.sourceClaimId) ?? asString(row.claimId);
  if (claimId) return sourceClaimIds.has(claimId) ? claimId : null;
  const reviewItemId = asString(row.sourceClaimReviewItemId) ?? asString(row.reviewItemId);
  if (reviewItemId) return reviewItemById.get(reviewItemId)?.sourceClaimId ?? null;
  const bookLocationId = asString(row.bookLocationId);
  if (bookLocationId) return reviewItemByBookLocationId.get(bookLocationId)?.sourceClaimId ?? null;
  return null;
}

function scanNoLeaks(label, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `${label} contains forbidden text: ${pattern}`);
  }
}

function assertNoUnknownFields(row, allowedFields, label) {
  const unknownFields = Object.keys(row).filter((field) => !allowedFields.has(field));
  assert.equal(unknownFields.length, 0, `${label}: unknown fields ${unknownFields.join(', ')}`);
}

function assertIdentifier(value, label, { prefix = null, maxLength = 180 } = {}) {
  assert.equal(typeof value, 'string', `${label}: must be a string`);
  assert.ok(value.length > 0 && value.length <= maxLength, `${label}: invalid length`);
  assert.match(value, /^[A-Za-z0-9][A-Za-z0-9._-]*$/, `${label}: must be a short identifier`);
  if (prefix) assert.ok(value.startsWith(prefix), `${label}: must start with ${prefix}`);
}

function assertIdentifierArray(value, label, { prefix = null, minItems = 1, maxItems = 20 } = {}) {
  assert.ok(Array.isArray(value), `${label}: must be an array`);
  assert.ok(value.length >= minItems && value.length <= maxItems, `${label}: invalid item count`);
  const seen = new Set();
  for (const item of value) {
    assertIdentifier(item, `${label} item`, { prefix });
    assert.equal(seen.has(item), false, `${label}: duplicate identifier ${item}`);
    seen.add(item);
  }
}

function assertPublicSummary(value, label) {
  assert.equal(typeof value, 'string', `${label}: must be a string`);
  assert.equal(value.trim(), value, `${label}: must not have surrounding whitespace`);
  assert.ok(value.length >= 20 && value.length <= 180, `${label}: invalid public summary length`);
  assert.equal(/[\r\n]/.test(value), false, `${label}: must be a single line`);
  assert.equal(/["'`“”‘’«»]/.test(value), false, `${label}: must not contain quote markers`);
  assert.ok(value.split(/\s+/).length <= 24, `${label}: too many words for a neutral atom`);
  scanNoLeaks(label, value);
}

const sourceAtoms = readJsonl('lineage/source-atoms.jsonl');
const visualSourceAtoms = readJsonl('lineage/visual-source-atoms.jsonl');
const claimTable = readJsonl('lineage/claim-table.jsonl');
const sourceClaims = readJsonl('lineage/source-claims.jsonl');
const sourceClaimReviewWorklist = readJson('lineage/source-claim-review-worklist.json');
const sourceClaimReviewDecisions = readJsonl('lineage/source-claim-review-decisions.jsonl');
const report = readFileSync(join(root, 'reports/validation/source-atom-readiness.md'), 'utf8');
const reviewItems = Array.isArray(sourceClaimReviewWorklist.reviewItems) ? sourceClaimReviewWorklist.reviewItems : [];
const sourceClaimIds = new Set(sourceClaims.map((claim) => claim.id).filter(Boolean));
const reviewItemById = new Map(reviewItems.map((item) => [item.id, item]).filter(([id]) => id));
const reviewItemByBookLocationId = new Map(reviewItems.map((item) => [item.bookLocationId, item]).filter(([bookLocationId]) => bookLocationId));
const reviewItemBySourceClaimId = new Map(reviewItems.map((item) => [item.sourceClaimId, item]).filter(([sourceClaimId]) => sourceClaimId));
const readyClaimIds = new Set();

runPreconditionValidator('scripts/validate-source-claim-review-decisions.mjs');

for (const decision of sourceClaimReviewDecisions) {
  if (!isReadyDecision(decision)) continue;
  const claimId = targetClaimId(decision, sourceClaimIds, reviewItemById, reviewItemByBookLocationId);
  if (claimId) readyClaimIds.add(claimId);
}

scanNoLeaks('source atoms', sourceAtoms);
scanNoLeaks('visual source atoms', visualSourceAtoms);
scanNoLeaks('claim table', claimTable);

if (sourceAtoms.length + visualSourceAtoms.length + claimTable.length > 0) {
  assert.equal(
    readyClaimIds.size,
    reviewItems.length,
    'source atoms require reviewed_not_runtime SourceClaim review decisions for every review item first'
  );
}

for (const pattern of [/C:\\/i, /C:\//i, /rawOcrText/i, /rawOcrExcerpt/i, /studentPin/i, /set-cookie/i, /upstash/i, /private-source:\/\//i]) {
  assert.equal(pattern.test(report), false, `leaky token in source atom report: ${pattern}`);
}

const sourceAtomIds = new Set();
const sourceAtomById = new Map();
const sourceClaimIdBySourceAtomId = new Map();
const sourceAtomRowsByClaimId = new Map();
for (const [index, atom] of sourceAtoms.entries()) {
  const label = `source atom #${index + 1}`;
  assertNoUnknownFields(atom, sourceAtomFields, label);
  assertIdentifier(atom.id, `${label}: id`, { prefix: 'source-atom-' });
  assert.equal(sourceAtomIds.has(atom.id), false, `${label}: duplicate id ${atom.id}`);
  sourceAtomIds.add(atom.id);
  sourceAtomById.set(atom.id, atom);
  assert.equal(atom.schemaVersion, 'source-atom-v1', `${label}: schemaVersion`);
  assert.equal(atom.subject, subject, `${label}: subject`);
  assert.equal(atom.bookEditionId, bookEditionId, `${label}: bookEditionId`);
  assertIdentifierArray(atom.sourceClaimIds, `${label}: sourceClaimIds`, { prefix: 'sourceclaim-', minItems: 1, maxItems: 1 });
  const [sourceClaimId] = atom.sourceClaimIds;
  assert.ok(sourceClaimIds.has(sourceClaimId), `${label}: unknown SourceClaim ${sourceClaimId}`);
  assert.ok(readyClaimIds.has(sourceClaimId), `${label}: SourceClaim is not reviewed_not_runtime`);
  const reviewItem = reviewItemBySourceClaimId.get(sourceClaimId);
  assert.ok(reviewItem, `${label}: SourceClaim is missing review item`);
  assertIdentifierArray(atom.evidenceRefIds, `${label}: evidenceRefIds`, { prefix: 'evidence-ref-', minItems: 1, maxItems: 120 });
  for (const evidenceRefId of atom.evidenceRefIds) {
    assert.ok(reviewItem.evidenceRefIds.includes(evidenceRefId), `${label}: evidenceRefId does not belong to SourceClaim ${sourceClaimId}`);
  }
  assertPublicSummary(atom.atomText, `${label}: atomText`);
  assert.ok(allowedReviewStatuses.has(atom.reviewStatus), `${label}: invalid reviewStatus`);
  assert.equal(atom.containsRawOcr, false, `${label}: containsRawOcr`);
  assert.equal(atom.runtimeEligible, false, `${label}: runtimeEligible`);
  sourceClaimIdBySourceAtomId.set(atom.id, sourceClaimId);
  const rows = sourceAtomRowsByClaimId.get(sourceClaimId) ?? [];
  rows.push(atom);
  sourceAtomRowsByClaimId.set(sourceClaimId, rows);
}

const visualSourceAtomIds = new Set();
for (const [index, atom] of visualSourceAtoms.entries()) {
  const label = `visual source atom #${index + 1}`;
  assertNoUnknownFields(atom, visualSourceAtomFields, label);
  assertIdentifier(atom.id, `${label}: id`, { prefix: 'visual-source-atom-' });
  assert.equal(visualSourceAtomIds.has(atom.id), false, `${label}: duplicate id ${atom.id}`);
  visualSourceAtomIds.add(atom.id);
  assert.equal(atom.schemaVersion, 'visual-source-atom-v1', `${label}: schemaVersion`);
  assert.equal(atom.subject, subject, `${label}: subject`);
  assert.equal(atom.bookEditionId, bookEditionId, `${label}: bookEditionId`);
  assertIdentifier(atom.sourceAtomId, `${label}: sourceAtomId`, { prefix: 'source-atom-' });
  assert.ok(sourceAtomById.has(atom.sourceAtomId), `${label}: unknown sourceAtomId`);
  assert.ok(allowedVisualKinds.has(atom.visualKind), `${label}: invalid visualKind`);
  assertPublicSummary(atom.visualSummary, `${label}: visualSummary`);
  assert.ok(allowedReviewStatuses.has(atom.reviewStatus), `${label}: invalid reviewStatus`);
  assert.equal(atom.containsPageImage, false, `${label}: containsPageImage`);
  assert.equal(atom.runtimeEligible, false, `${label}: runtimeEligible`);
}

const claimTableIds = new Set();
const claimTableRowsByClaimId = new Map();
for (const [index, row] of claimTable.entries()) {
  const label = `claim table row #${index + 1}`;
  assertNoUnknownFields(row, claimTableFields, label);
  assertIdentifier(row.id, `${label}: id`, { prefix: 'claim-table-' });
  assert.equal(claimTableIds.has(row.id), false, `${label}: duplicate id ${row.id}`);
  claimTableIds.add(row.id);
  assert.equal(row.schemaVersion, 'claim-table-row-v1', `${label}: schemaVersion`);
  assert.equal(row.subject, subject, `${label}: subject`);
  assert.equal(row.bookEditionId, bookEditionId, `${label}: bookEditionId`);
  assertIdentifier(row.sourceClaimId, `${label}: sourceClaimId`, { prefix: 'sourceclaim-' });
  assert.ok(readyClaimIds.has(row.sourceClaimId), `${label}: SourceClaim is not reviewed_not_runtime`);
  assertIdentifierArray(row.sourceAtomIds, `${label}: sourceAtomIds`, { prefix: 'source-atom-', minItems: 1, maxItems: 20 });
  for (const sourceAtomId of row.sourceAtomIds) {
    assert.ok(sourceAtomById.has(sourceAtomId), `${label}: unknown sourceAtomId ${sourceAtomId}`);
    assert.equal(sourceClaimIdBySourceAtomId.get(sourceAtomId), row.sourceClaimId, `${label}: sourceAtomId does not belong to SourceClaim`);
    if (row.decision === 'reviewed_not_runtime') {
      assert.equal(sourceAtomById.get(sourceAtomId).reviewStatus, 'reviewed_not_runtime', `${label}: reviewed table row needs reviewed source atoms`);
    }
  }
  assert.ok(allowedReviewStatuses.has(row.decision), `${label}: invalid decision`);
  assert.equal(row.runtimeEligible, false, `${label}: runtimeEligible`);
  const rows = claimTableRowsByClaimId.get(row.sourceClaimId) ?? [];
  rows.push(row);
  claimTableRowsByClaimId.set(row.sourceClaimId, rows);
}

for (const [sourceAtomId, sourceClaimId] of sourceClaimIdBySourceAtomId.entries()) {
  assert.ok(claimTableRowsByClaimId.has(sourceClaimId), `${sourceAtomId}: source atom requires a claim-table row`);
}

const completeClaimCoverage =
  readyClaimIds.size === reviewItems.length &&
  [...readyClaimIds].every((sourceClaimId) =>
    (sourceAtomRowsByClaimId.get(sourceClaimId) ?? []).length > 0 &&
    (claimTableRowsByClaimId.get(sourceClaimId) ?? []).length > 0
  );
const allReviewed =
  sourceAtoms.every((atom) => atom.reviewStatus === 'reviewed_not_runtime') &&
  visualSourceAtoms.every((atom) => atom.reviewStatus === 'reviewed_not_runtime') &&
  claimTable.every((row) => row.decision === 'reviewed_not_runtime');
const sourceAtomStatus =
  sourceAtoms.length + visualSourceAtoms.length + claimTable.length === 0
    ? 'blocked_empty_until_source_claim_review'
    : completeClaimCoverage && allReviewed
      ? 'source_atom_review_ready'
      : 'source_atom_review_incomplete';

console.log(JSON.stringify({
  ok: true,
  sourceAtomStatus,
  sourceAtoms: sourceAtoms.length,
  visualSourceAtoms: visualSourceAtoms.length,
  claimTableRows: claimTable.length,
  readySourceClaimDecisions: readyClaimIds.size,
  coveredSourceClaims: [...readyClaimIds].filter((sourceClaimId) =>
    (sourceAtomRowsByClaimId.get(sourceClaimId) ?? []).length > 0 &&
    (claimTableRowsByClaimId.get(sourceClaimId) ?? []).length > 0
  ).length,
  runtimePromotionAllowed: false,
  candidateGenerationAllowed: false,
  kvWriteAllowed: false,
  importApplyAllowed: false
}, null, 2));
