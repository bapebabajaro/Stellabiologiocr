#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const subject = 'biologi';
const bookEditionId = 'bookedition-stella-biologi-ocr-v1';
const readyStatus = 'reviewed_not_runtime';
const allowedDecisionValues = new Set([readyStatus, 'request_fix', 'reject']);
const allowedConfidenceValues = new Set(['low', 'medium', 'high', 'synthetic']);
const allowedQklRoles = new Set(['core', 'support', 'extension']);
const explicitFalseFields = [
  'runtimeEligible',
  'runtimeImportAllowed',
  'candidateGenerationAllowed',
  'safeActiveWriteAllowed',
  'pixelBindingAllowed',
  'kvWriteAllowed',
  'importApplyAllowed'
];
const allowedDecisionFields = new Set([
  'id',
  'schemaVersion',
  'subject',
  'bookEditionId',
  'atomicKpReviewItemId',
  'reviewItemId',
  'knowledgePointId',
  'atomicKnowledgePointId',
  'status',
  'reviewStatus',
  'decision',
  'decisionStatus',
  'reviewer',
  'reviewedAt',
  'confidence',
  'bookLocationIds',
  'sourceClaimIds',
  'sourceAtomIds',
  'qklRole',
  'runtimeEligible',
  'runtimeImportAllowed',
  'candidateGenerationAllowed',
  'safeActiveWriteAllowed',
  'pixelBindingAllowed',
  'kvWriteAllowed',
  'importApplyAllowed'
]);
const forbiddenPatterns = [
  /raw_ocr_text/i,
  /raw_ocr_excerpt/i,
  /rawOcrText/i,
  /rawOcrExcerpt/i,
  /rawText/i,
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

function asString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((item) => item.length > 0)
    : [];
}

function statusValues(row) {
  return ['status', 'reviewStatus', 'decisionStatus', 'decision']
    .map((key) => asString(row[key]))
    .filter(Boolean)
    .map((value) => value.toLowerCase());
}

function isReady(row) {
  const values = statusValues(row);
  return values.length > 0 && values.every((value) => value === readyStatus);
}

function assertConsistentStatusValues(values, label) {
  assert.equal(values.length, 4, `${label}: status, reviewStatus, decisionStatus and decision are required`);
  const [first] = values;
  assert.equal(values.every((value) => value === first), true, `${label}: status aliases must agree`);
  for (const value of values) assert.ok(allowedDecisionValues.has(value), `${label}: invalid status ${value}`);
}

function isValidIsoTimestamp(value) {
  if (!asString(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function assertIdentifier(value, label, { allowColon = false, maxLength = 180 } = {}) {
  assert.equal(typeof value, 'string', `${label}: must be a string`);
  assert.ok(value.length > 0 && value.length <= maxLength, `${label}: invalid length`);
  const pattern = allowColon ? /^[A-Za-z0-9][A-Za-z0-9._:-]*$/ : /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  assert.match(value, pattern, `${label}: must be a short identifier`);
}

function assertOptionalConfidence(value, label) {
  if (value === undefined) return;
  const normalized = asString(value)?.toLowerCase();
  assert.ok(normalized && allowedConfidenceValues.has(normalized), `${label}: invalid confidence`);
}

function assertNoUnknownFields(row, allowedFields, label) {
  const unknownFields = Object.keys(row).filter((field) => !allowedFields.has(field));
  assert.equal(unknownFields.length, 0, `${label}: unknown fields ${unknownFields.join(', ')}`);
}

function assertExactArray(actual, expected, label, { allowColon = false } = {}) {
  assert.ok(Array.isArray(actual), `${label}: must be an array`);
  assert.deepEqual(actual, expected, `${label}: must match the reviewed atomic KnowledgePoint`);
  for (const value of actual) assertIdentifier(value, `${label} item`, { allowColon });
}

function scanNoLeaks(label, value) {
  const text = JSON.stringify(value);
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `${label} contains forbidden text: ${pattern}`);
  }
}

function targetReviewItemId(row) {
  return asString(row.atomicKpReviewItemId) ?? asString(row.reviewItemId);
}

function targetKpId(row) {
  return asString(row.knowledgePointId) ?? asString(row.atomicKnowledgePointId);
}

runJsonValidator('scripts/validate-atomic-kp-review-worklist.mjs');
const atomicStatus = runJsonValidator('scripts/validate-atomic-knowledge-points.mjs');
const reviewWorklist = readJson('lineage/atomic-kp-review-worklist.json');
const reviewItems = Array.isArray(reviewWorklist.reviewItems) ? reviewWorklist.reviewItems : [];
const atomicKps = readJsonl('lineage/atomic-knowledge-points.jsonl');
const decisions = readJsonl('lineage/atomic-kp-review-decisions.jsonl');
const reviewItemById = new Map(reviewItems.map((item) => [item.id, item]).filter(([id]) => id));
const reviewItemIdByExpectedKpId = new Map(
  reviewItems
    .map((item) => [item.requiredAtomicKnowledgePointPatchShape?.id, item.id])
    .filter(([kpId, reviewItemId]) => kpId && reviewItemId)
);
const kpById = new Map(atomicKps.map((kp) => [kp.id, kp]).filter(([id]) => id));
const reviewItemIdByKpId = new Map();
for (const kp of atomicKps) {
  const explicit = targetReviewItemId(kp);
  const expected = reviewItemIdByExpectedKpId.get(kp.id);
  if (explicit) reviewItemIdByKpId.set(kp.id, explicit);
  else if (expected) reviewItemIdByKpId.set(kp.id, expected);
}

scanNoLeaks('atomic KP review decisions', decisions);

if (decisions.length > 0) {
  assert.equal(
    atomicStatus.atomicKnowledgePointStatus,
    'atomic_kp_review_ready',
    'atomic KP review decisions require atomic_kp_review_ready first'
  );
}

const seenDecisionIds = new Set();
const decisionsByReviewItem = new Map();
for (const [index, decision] of decisions.entries()) {
  const label = `atomic KP review decision #${index + 1}`;
  assertNoUnknownFields(decision, allowedDecisionFields, label);
  assertIdentifier(decision.id, `${label}: id`, { maxLength: 180 });
  assert.ok(decision.id.startsWith('atomic-kp-review-decision-'), `${label}: id must use atomic-kp-review-decision-* namespace`);
  assert.equal(seenDecisionIds.has(decision.id), false, `${label}: duplicate id ${decision.id}`);
  seenDecisionIds.add(decision.id);
  assert.equal(decision.schemaVersion, 'atomic-kp-review-decision-v1', `${label}: schemaVersion`);
  assert.equal(decision.subject, subject, `${label}: subject`);
  assert.equal(decision.bookEditionId, bookEditionId, `${label}: bookEditionId`);
  const values = statusValues(decision);
  assertConsistentStatusValues(values, label);
  assertIdentifier(decision.reviewer, `${label}: reviewer`, { maxLength: 80 });
  assert.equal(isValidIsoTimestamp(decision.reviewedAt), true, `${label}: reviewedAt must be ISO-8601 UTC timestamp`);
  assertOptionalConfidence(decision.confidence, label);
  assertIdentifier(decision.atomicKpReviewItemId, `${label}: atomicKpReviewItemId`);
  if (decision.reviewItemId !== undefined) {
    assertIdentifier(decision.reviewItemId, `${label}: reviewItemId`);
    assert.equal(decision.reviewItemId, decision.atomicKpReviewItemId, `${label}: reviewItemId must match atomicKpReviewItemId`);
  }
  assertIdentifier(decision.knowledgePointId, `${label}: knowledgePointId`);
  if (decision.atomicKnowledgePointId !== undefined) assertIdentifier(decision.atomicKnowledgePointId, `${label}: atomicKnowledgePointId`);

  const reviewItemId = decision.atomicKpReviewItemId;
  const reviewItem = reviewItemById.get(reviewItemId);
  assert.ok(reviewItem, `${label}: must target a known atomic KP review item`);
  assert.equal(decisionsByReviewItem.has(reviewItemId), false, `${label}: duplicate target ${reviewItemId}`);
  decisionsByReviewItem.set(reviewItemId, decision);

  const kpId = decision.knowledgePointId;
  const kp = kpById.get(kpId);
  assert.ok(kp, `${label}: must reference a known atomic KnowledgePoint`);
  assert.equal(reviewItemIdByKpId.get(kpId), reviewItemId, `${label}: KnowledgePoint must belong to the same review item`);
  if (decision.atomicKnowledgePointId !== undefined) assert.equal(decision.atomicKnowledgePointId, kpId, `${label}: atomicKnowledgePointId mismatch`);
  if (decision.knowledgePointId !== undefined) assert.equal(decision.knowledgePointId, kpId, `${label}: knowledgePointId mismatch`);
  assertExactArray(decision.bookLocationIds, kp.bookLocationIds, `${label}: bookLocationIds`, { allowColon: true });
  assertExactArray(decision.sourceClaimIds, kp.sourceClaimIds, `${label}: sourceClaimIds`);
  assertExactArray(decision.sourceAtomIds, kp.sourceAtomIds, `${label}: sourceAtomIds`);
  assert.equal(decision.qklRole, kp.qklRole, `${label}: qklRole must match atomic KnowledgePoint`);
  assert.ok(allowedQklRoles.has(decision.qklRole), `${label}: invalid qklRole`);
  for (const field of explicitFalseFields) assert.equal(decision[field], false, `${label}: ${field} must be explicit false`);
}

const readyDecisions = decisions.filter(isReady).length;
const atomicKpReviewDecisionStatus =
  decisions.length === 0
    ? atomicStatus.atomicKnowledgePointStatus === 'atomic_kp_review_ready'
      ? 'waiting_for_atomic_kp_review_decisions'
      : 'blocked_empty_until_atomic_kp_review'
    : readyDecisions === reviewItems.length
      ? 'atomic_kp_review_decisions_ready'
      : 'atomic_kp_review_decisions_incomplete';

console.log(JSON.stringify({
  ok: true,
  atomicKpReviewDecisionStatus,
  atomicKnowledgePointStatus: atomicStatus.atomicKnowledgePointStatus,
  reviewItems: reviewItems.length,
  atomicKnowledgePoints: atomicKps.length,
  decisions: decisions.length,
  readyDecisions,
  runtimeImportAllowed: false,
  candidateGenerationAllowed: false,
  pixelBindingAllowed: false,
  kvWriteAllowed: false,
  importApplyAllowed: false,
  safeActiveWriteAllowed: false
}, null, 2));
