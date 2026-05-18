#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const subject = 'biologi';
const bookEditionId = 'bookedition-stella-biologi-ocr-v1';
const allowedReviewStatuses = new Set(['candidate_review_required', 'reviewed_not_runtime', 'request_fix', 'reject']);
const allowedQklRoles = new Set(['core', 'support', 'extension']);
const atomicKpFields = new Set([
  'id',
  'schemaVersion',
  'subject',
  'bookEditionId',
  'atomicKpReviewItemId',
  'reviewItemId',
  'bookLocationIds',
  'sourceClaimIds',
  'sourceAtomIds',
  'label',
  'studentGoal',
  'qklRole',
  'reviewStatus',
  'status',
  'runtimeEligible',
  'pixelEligible'
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

function runJsonValidator(rel) {
  try {
    return JSON.parse(execFileSync(process.execPath, [rel], { cwd: root, encoding: 'utf8', stdio: 'pipe' }));
  } catch (error) {
    const detail = String(error.stdout || error.stderr || error.message || '').trim();
    assert.fail(`${rel} failed${detail ? `: ${detail}` : ''}`);
  }
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

function assertIdentifier(value, label, { prefix = null, allowColon = false, maxLength = 180 } = {}) {
  assert.equal(typeof value, 'string', `${label}: must be a string`);
  assert.ok(value.length > 0 && value.length <= maxLength, `${label}: invalid length`);
  const pattern = allowColon ? /^[A-Za-z0-9][A-Za-z0-9._:-]*$/ : /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  assert.match(value, pattern, `${label}: must be a short identifier`);
  if (prefix) assert.ok(value.startsWith(prefix), `${label}: must start with ${prefix}`);
}

function assertIdentifierArray(value, label, { prefix = null, allowColon = false, minItems = 1, maxItems = 20 } = {}) {
  assert.ok(Array.isArray(value), `${label}: must be an array`);
  assert.ok(value.length >= minItems && value.length <= maxItems, `${label}: invalid item count`);
  const seen = new Set();
  for (const item of value) {
    assertIdentifier(item, `${label} item`, { prefix, allowColon });
    assert.equal(seen.has(item), false, `${label}: duplicate identifier ${item}`);
    seen.add(item);
  }
}

function assertPublicText(value, label, { minLength, maxLength, maxWords }) {
  assert.equal(typeof value, 'string', `${label}: must be a string`);
  assert.equal(value.trim(), value, `${label}: must not have surrounding whitespace`);
  assert.ok(value.length >= minLength && value.length <= maxLength, `${label}: invalid length`);
  assert.equal(/[\r\n]/.test(value), false, `${label}: must be a single line`);
  assert.equal(/["'`“”‘’«»]/.test(value), false, `${label}: must not contain quote markers`);
  assert.ok(value.split(/\s+/).length <= maxWords, `${label}: too many words`);
  scanNoLeaks(label, value);
}

runJsonValidator('scripts/validate-atomic-kp-review-worklist.mjs');
const sourceAtomStatus = runJsonValidator('scripts/validate-source-atoms.mjs');
const reviewWorklist = readJson('lineage/atomic-kp-review-worklist.json');
const atomicKps = readJsonl('lineage/atomic-knowledge-points.jsonl');
const sourceAtoms = readJsonl('lineage/source-atoms.jsonl');

const reviewItems = Array.isArray(reviewWorklist.reviewItems) ? reviewWorklist.reviewItems : [];
assert.equal(reviewWorklist.reviewItemCount, reviewItems.length, 'atomic KP review item count must match reviewItems length');
assert.equal(reviewWorklist.reviewItemCount, 240, 'atomic KP review item count must stay at 240');
assert.equal(reviewWorklist.plannedAtomicKnowledgePointCount, 240, 'planned atomic KP count must stay at 240');
const reviewItemByExpectedKpId = new Map(
  reviewItems
    .map((item) => [item.requiredAtomicKnowledgePointPatchShape?.id, item])
    .filter(([id]) => id)
);
const sourceAtomById = new Map(sourceAtoms.map((atom) => [atom.id, atom]).filter(([id]) => id));
const sourceClaimIdsBySourceAtomId = new Map(sourceAtoms.map((atom) => [atom.id, new Set(atom.sourceClaimIds ?? [])]).filter(([id]) => id));

scanNoLeaks('atomic knowledge points', atomicKps);

if (atomicKps.length > 0) {
  assert.equal(
    sourceAtomStatus.sourceAtomStatus,
    'source_atom_review_ready',
    'atomic KnowledgePoints require source_atom_review_ready first'
  );
}

const seenKpIds = new Set();
const coveredReviewItemIds = new Set();
for (const [index, kp] of atomicKps.entries()) {
  const label = `atomic KnowledgePoint #${index + 1}`;
  assertNoUnknownFields(kp, atomicKpFields, label);
  assertIdentifier(kp.id, `${label}: id`, { prefix: 'kp-biologi-' });
  assert.equal(seenKpIds.has(kp.id), false, `${label}: duplicate id ${kp.id}`);
  seenKpIds.add(kp.id);
  assert.equal(kp.schemaVersion, 'knowledge-point-v1', `${label}: schemaVersion`);
  assert.equal(kp.subject, subject, `${label}: subject`);
  assert.equal(kp.bookEditionId, bookEditionId, `${label}: bookEditionId`);
  const reviewItem = reviewItemByExpectedKpId.get(kp.id);
  assert.ok(reviewItem, `${label}: id does not match a planned atomic KP review slot`);
  if (kp.atomicKpReviewItemId !== undefined) {
    assertIdentifier(kp.atomicKpReviewItemId, `${label}: atomicKpReviewItemId`);
    assert.equal(kp.atomicKpReviewItemId, reviewItem.id, `${label}: atomicKpReviewItemId must match review slot`);
  }
  if (kp.reviewItemId !== undefined) {
    assertIdentifier(kp.reviewItemId, `${label}: reviewItemId`);
    assert.equal(kp.reviewItemId, reviewItem.id, `${label}: reviewItemId must match review slot`);
  }
  coveredReviewItemIds.add(reviewItem.id);
  assertIdentifierArray(kp.bookLocationIds, `${label}: bookLocationIds`, { allowColon: true, minItems: 1, maxItems: 1 });
  assert.deepEqual(kp.bookLocationIds, [reviewItem.bookLocationId], `${label}: bookLocationIds must match review slot`);
  assertIdentifierArray(kp.sourceClaimIds, `${label}: sourceClaimIds`, { prefix: 'sourceclaim-', minItems: 1, maxItems: 4 });
  assert.deepEqual(kp.sourceClaimIds, reviewItem.sourceClaimIds, `${label}: sourceClaimIds must match review slot`);
  assertIdentifierArray(kp.sourceAtomIds, `${label}: sourceAtomIds`, { prefix: 'source-atom-', minItems: 1, maxItems: 6 });
  for (const sourceAtomId of kp.sourceAtomIds) {
    const sourceAtom = sourceAtomById.get(sourceAtomId);
    assert.ok(sourceAtom, `${label}: unknown sourceAtomId ${sourceAtomId}`);
    assert.equal(sourceAtom.reviewStatus, 'reviewed_not_runtime', `${label}: sourceAtom is not reviewed_not_runtime`);
    const atomClaimIds = sourceClaimIdsBySourceAtomId.get(sourceAtomId) ?? new Set();
    assert.equal(
      kp.sourceClaimIds.some((sourceClaimId) => atomClaimIds.has(sourceClaimId)),
      true,
      `${label}: sourceAtomId is not linked to this KP SourceClaim`
    );
  }
  assertPublicText(kp.label, `${label}: label`, { minLength: 4, maxLength: 90, maxWords: 10 });
  assertPublicText(kp.studentGoal, `${label}: studentGoal`, { minLength: 20, maxLength: 180, maxWords: 24 });
  assert.ok(allowedQklRoles.has(kp.qklRole), `${label}: invalid qklRole`);
  assert.ok(allowedReviewStatuses.has(kp.reviewStatus), `${label}: invalid reviewStatus`);
  if (kp.status !== undefined) {
    assert.ok(allowedReviewStatuses.has(kp.status), `${label}: invalid status`);
    assert.equal(kp.status, kp.reviewStatus, `${label}: status must match reviewStatus`);
  }
  assert.equal(kp.runtimeEligible, false, `${label}: runtimeEligible`);
  assert.equal(kp.pixelEligible, false, `${label}: pixelEligible`);
}

const atomicKnowledgePointStatus =
  atomicKps.length === 0
    ? 'blocked_empty_until_source_atom_review'
    : atomicKps.length === reviewItems.length &&
        coveredReviewItemIds.size === reviewItems.length &&
        atomicKps.every((kp) => kp.reviewStatus === 'reviewed_not_runtime')
      ? 'atomic_kp_review_ready'
      : 'atomic_kp_review_incomplete';

console.log(JSON.stringify({
  ok: true,
  atomicKnowledgePointStatus,
  atomicKnowledgePoints: atomicKps.length,
  plannedAtomicKnowledgePoints: reviewItems.length,
  coveredAtomicKpReviewItems: coveredReviewItemIds.size,
  runtimeImportAllowed: false,
  candidateGenerationAllowed: false,
  pixelBindingAllowed: false,
  kvWriteAllowed: false,
  importApplyAllowed: false,
  safeActiveWriteAllowed: false
}, null, 2));
