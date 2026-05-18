#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const subject = 'biologi';
const bookEditionId = 'bookedition-stella-biologi-ocr-v1';
const allowedDecisionValues = new Set(['reviewed_not_runtime', 'request_fix', 'reject']);
const allowedBoundaryStatusValues = new Set(['blocked_until_page_records_accepted', 'resolved', 'request_fix', 'reject']);
const allowedConfidenceValues = new Set(['low', 'medium', 'high', 'synthetic']);
const explicitFalseFields = [
  'runtimeEligible',
  'runtimePromotionAllowed',
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
  'pageRecordReviewItemId',
  'reviewItemId',
  'bookLocationId',
  'status',
  'reviewStatus',
  'decision',
  'decisionStatus',
  'reviewer',
  'reviewedAt',
  'confidence',
  'evidenceRefIds',
  'pageRecordIds',
  'runtimeEligible',
  'runtimePromotionAllowed',
  'candidateGenerationAllowed',
  'safeActiveWriteAllowed',
  'pixelBindingAllowed',
  'kvWriteAllowed',
  'importApplyAllowed'
]);
const forbiddenPatterns = [
  /raw_ocr_text/i,
  /raw_ocr_excerpt/i,
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

function asString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function statusValues(row) {
  return ['status', 'reviewStatus', 'decisionStatus', 'decision']
    .map((key) => asString(row[key]))
    .filter(Boolean)
    .map((value) => value.toLowerCase());
}

function isReady(row) {
  const values = statusValues(row);
  return values.length > 0 && values.every((value) => value === 'reviewed_not_runtime');
}

function assertConsistentStatusValues(values, label) {
  assert.ok(values.length > 0, `${label}: missing status`);
  const [first] = values;
  assert.equal(values.every((value) => value === first), true, `${label}: status aliases must agree`);
  for (const value of values) assert.ok(allowedDecisionValues.has(value), `${label}: invalid status ${value}`);
}

function isValidIsoTimestamp(value) {
  if (!asString(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function assertIdentifier(value, label, { allowColon = false, maxLength = 160 } = {}) {
  assert.equal(typeof value, 'string', `${label}: must be a string`);
  assert.ok(value.length > 0 && value.length <= maxLength, `${label}: invalid length`);
  const pattern = allowColon ? /^[A-Za-z0-9][A-Za-z0-9._:-]*$/ : /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  assert.match(value, pattern, `${label}: must be a short identifier, not free text`);
}

function assertOptionalConfidence(value, label) {
  if (value === undefined) return;
  const normalized = asString(value)?.toLowerCase();
  assert.ok(normalized && allowedConfidenceValues.has(normalized), `${label}: invalid confidence`);
}

function assertOptionalExactArray(actual, expected, label) {
  if (actual === undefined) return;
  assert.ok(Array.isArray(actual), `${label}: must be an array`);
  assert.deepEqual(actual, expected, `${label}: must match the targeted review item`);
  for (const value of actual) assertIdentifier(value, `${label} item`);
}

function targetItem(row, reviewItemById, reviewItemByBookLocationId) {
  const explicit = asString(row.pageRecordReviewItemId) ?? asString(row.reviewItemId);
  if (explicit) return reviewItemById.get(explicit) ?? null;
  const bookLocationId = asString(row.bookLocationId);
  if (bookLocationId) return reviewItemByBookLocationId.get(bookLocationId) ?? null;
  return null;
}

function scanNoLeaks(label, value) {
  const text = JSON.stringify(value);
  for (const pattern of forbiddenPatterns) {
    assert.equal(pattern.test(text), false, `${label} contains forbidden text: ${pattern}`);
  }
}

const worklist = readJson('lineage/page-record-review-worklist.json');
const decisions = readJsonl('lineage/page-record-review-decisions.jsonl');
const boundaryDecisions = readJsonl('lineage/section-boundary-decisions.jsonl');
const reviewItems = Array.isArray(worklist.reviewItems) ? worklist.reviewItems : [];
const reviewItemById = new Map(reviewItems.map((item) => [item.id, item]).filter(([id]) => id));
const reviewItemByBookLocationId = new Map(reviewItems.map((item) => [item.bookLocationId, item]).filter(([locationId]) => locationId));

scanNoLeaks('page-record review decisions', decisions);
scanNoLeaks('section boundary decisions', boundaryDecisions);

const targets = new Map();
for (const [index, decision] of decisions.entries()) {
  const label = `page-record review decision #${index + 1}`;
  assertIdentifier(decision.id, `${label}: id`);
  assert.equal(decision.schemaVersion, 'page-record-review-decision-v1', `${label}: schemaVersion`);
  assert.equal(decision.subject, subject, `${label}: subject`);
  assert.equal(decision.bookEditionId, bookEditionId, `${label}: bookEditionId`);
  const unknownFields = Object.keys(decision).filter((field) => !allowedDecisionFields.has(field));
  assert.equal(unknownFields.length, 0, `${label}: unknown fields ${unknownFields.join(', ')}`);
  const values = statusValues(decision);
  assertConsistentStatusValues(values, label);
  assertIdentifier(decision.reviewer, `${label}: reviewer`, { maxLength: 80 });
  assert.equal(isValidIsoTimestamp(decision.reviewedAt), true, `${label}: reviewedAt must be ISO-8601 UTC timestamp`);
  assertOptionalConfidence(decision.confidence, label);
  if (decision.pageRecordReviewItemId !== undefined) assertIdentifier(decision.pageRecordReviewItemId, `${label}: pageRecordReviewItemId`);
  if (decision.reviewItemId !== undefined) assertIdentifier(decision.reviewItemId, `${label}: reviewItemId`);
  if (decision.bookLocationId !== undefined) assertIdentifier(decision.bookLocationId, `${label}: bookLocationId`, { allowColon: true });
  const item = targetItem(decision, reviewItemById, reviewItemByBookLocationId);
  assert.ok(item, `${label}: must target a known page-record review item or BookLocation`);
  const target = item.id;
  assert.equal(targets.has(target), false, `${label}: duplicate target ${target}`);
  targets.set(target, decision);
  assertOptionalExactArray(decision.evidenceRefIds, item.evidenceRefIds ?? [], `${label}: evidenceRefIds`);
  assertOptionalExactArray(decision.pageRecordIds, item.pageRecordIds ?? [], `${label}: pageRecordIds`);
  for (const field of explicitFalseFields) assert.equal(decision[field], false, `${label}: ${field} must be explicit false`);
}

for (const [index, decision] of boundaryDecisions.entries()) {
  const label = `section boundary decision #${index + 1}`;
  assert.equal(decision.schemaVersion, 'section-boundary-decision-v1', `${label}: schemaVersion`);
  assert.equal(decision.subject, subject, `${label}: subject`);
  assert.equal(decision.bookEditionId, bookEditionId, `${label}: bookEditionId`);
  assertIdentifier(decision.id, `${label}: id`);
  const status = asString(decision.status);
  assert.ok(status && allowedBoundaryStatusValues.has(status), `${label}: invalid status`);
  const note = asString(decision.decision);
  assert.ok(note, `${label}: decision note is required`);
  assert.ok(note.length <= 240, `${label}: decision text is too long for a public structural note`);
}

const readyTargets = [...targets.values()].filter(isReady).length;
const resolvedBoundaryDecisions = boundaryDecisions.filter((decision) => decision.status === 'resolved').length;
const pageRecordReviewStatus =
  decisions.length === 0
    ? 'waiting_for_page_record_review'
    : readyTargets === reviewItems.length && resolvedBoundaryDecisions === boundaryDecisions.length
      ? 'page_record_review_ready'
      : 'page_record_review_incomplete';

console.log(JSON.stringify({
  ok: true,
  pageRecordReviewStatus,
  reviewItems: reviewItems.length,
  decisions: decisions.length,
  readyDecisions: readyTargets,
  boundaryDecisions: boundaryDecisions.length,
  resolvedBoundaryDecisions,
  runtimePromotionAllowed: false,
  candidateGenerationAllowed: false,
  kvWriteAllowed: false,
  importApplyAllowed: false
}, null, 2));
