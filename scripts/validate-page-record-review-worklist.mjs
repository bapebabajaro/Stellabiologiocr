#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const allowedDecisionValues = ['reviewed_not_runtime', 'request_fix', 'reject'];

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

const book = readJson('manifest/book-edition.json');
const worklist = readJson('lineage/page-record-review-worklist.json');
const locations = readJsonl('lineage/book-locations.jsonl');
const pageRecords = readJsonl('lineage/page-records.jsonl');
const physicalPageRecords = readJsonl('lineage/physical-page-records.jsonl');
const bookLocationPageLinks = readJsonl('lineage/book-location-page-links.jsonl');
const evidenceRefs = readJsonl('lineage/evidence-refs.jsonl');
const sourceEvidence = readJsonl('lineage/source-evidence.jsonl');
const boundaryDecisions = readJsonl('lineage/section-boundary-decisions.jsonl');
const decisions = readJsonl('lineage/page-record-review-decisions.jsonl');
const report = readFileSync(join(root, 'reports/validation/page-record-review-readiness.md'), 'utf8');

const recordsByLocation = new Map();
const pageRecordIds = new Set();
for (const record of pageRecords) {
  pageRecordIds.add(record.id);
  const rows = recordsByLocation.get(record.bookLocationId) ?? [];
  rows.push(record);
  recordsByLocation.set(record.bookLocationId, rows);
  assert.equal(record.schemaVersion, 'page-record-v1');
  assert.equal(record.subject, book.subject);
  assert.equal(record.bookEditionId, book.bookEditionId);
  assert.equal(record.containsRawOcr, false);
  assert.equal(record.containsPageImage, false);
  assert.equal(record.runtimeEligible, false);
  assert.ok(Number.isInteger(record.bookPage));
  assert.match(record.sourceRef, /^private-source:\/\/pdfer\/biologi\//);
}

const evidenceByLocation = new Map();
for (const evidence of sourceEvidence) {
  const rows = evidenceByLocation.get(evidence.bookLocationId) ?? [];
  rows.push(evidence);
  evidenceByLocation.set(evidence.bookLocationId, rows);
  assert.equal(evidence.schemaVersion, 'source-evidence-v1');
  assert.equal(evidence.subject, book.subject);
  assert.equal(evidence.bookEditionId, book.bookEditionId);
  assert.equal(evidence.publicSafe, true);
  assert.equal(evidence.containsRawOcr, false);
  assert.equal(evidence.containsPageImage, false);
  assert.equal(evidence.runtimeEligible, false);
}

const boundaryDecisionByChapter = new Map();
for (const decision of boundaryDecisions) {
  for (const chapterId of decision.affectedChapters ?? []) boundaryDecisionByChapter.set(chapterId, decision.id);
}

const physicalById = new Map(physicalPageRecords.map((record) => [record.id, record]));
const evidenceByPhysicalId = new Map(evidenceRefs.map((evidence) => [evidence.physicalPageRecordId, evidence]));
const physicalIdsByLocation = new Map();
for (const link of bookLocationPageLinks) {
  assert.equal(link.schemaVersion, 'book-location-page-link-v1');
  assert.equal(link.subject, book.subject);
  assert.equal(link.bookEditionId, book.bookEditionId);
  assert.ok(pageRecordIds.has(link.pageRecordId), `${link.id} references missing page record`);
  assert.ok(physicalById.has(link.physicalPageRecordId), `${link.id} references missing physical page`);
  assert.equal(link.runtimeEligible, false);
  const rows = physicalIdsByLocation.get(link.bookLocationId) ?? [];
  rows.push(link.physicalPageRecordId);
  physicalIdsByLocation.set(link.bookLocationId, rows);
}
for (const record of physicalPageRecords) {
  assert.equal(record.schemaVersion, 'physical-page-record-v1');
  assert.equal(record.subject, book.subject);
  assert.equal(record.bookEditionId, book.bookEditionId);
  assert.ok(record.pageRecordIds.length > 0);
  for (const pageRecordId of record.pageRecordIds) assert.ok(pageRecordIds.has(pageRecordId), `${record.id} references missing page record`);
  assert.equal(record.containsRawOcr, false);
  assert.equal(record.containsPageImage, false);
  assert.equal(record.hashStatus, 'pending_private_review');
  assert.equal(record.runtimeEligible, false);
  const evidence = evidenceByPhysicalId.get(record.id);
  assert.ok(evidence, `${record.id} must have evidence-ref row`);
  assert.ok(
    ['pending_private_review', 'reviewed_not_runtime'].includes(evidence.hashStatus),
    `${evidence.id}: evidence hashStatus must be pending_private_review or reviewed_not_runtime`
  );
  if (evidence.hashStatus === 'reviewed_not_runtime') {
    assert.match(String(evidence.evidenceHash ?? ''), /^sha256:[a-f0-9]{64}$/);
  }
  assert.equal(evidence.containsRawOcr, false);
  assert.equal(evidence.containsPageImage, false);
  assert.equal(evidence.runtimeEligible, false);
}

assert.equal(worklist.schemaVersion, 'page-record-review-worklist-v1');
assert.equal(worklist.subject, book.subject);
assert.equal(worklist.bookEditionId, book.bookEditionId);
assert.equal(worklist.bookLocationCount, locations.length);
assert.equal(worklist.pageRecordCount, pageRecords.length);
assert.equal(worklist.physicalPageRecordCount, physicalPageRecords.length);
assert.equal(worklist.sourceEvidenceCount, sourceEvidence.length);
assert.equal(worklist.reviewItemCount, worklist.reviewItems.length);
assert.equal(worklist.reviewItemCount, locations.length);
assert.equal(worklist.acceptanceAllowedByThisWorklist, false);
assert.equal(worklist.runtimePromotionAllowed, false);
assert.equal(worklist.candidateGenerationAllowed, false);
assert.equal(worklist.pixelBindingAllowed, false);
assert.equal(worklist.status, 'blocked_review_worklist_only');
const itemIds = new Set();
for (const location of locations) {
  const item = worklist.reviewItems.find((candidate) => candidate.bookLocationId === location.id);
  assert.ok(item, `missing page-record review item for ${location.id}`);
  assert.equal(item.schemaVersion, 'page-record-review-item-v1');
  assert.equal(item.subject, book.subject);
  assert.equal(item.bookEditionId, book.bookEditionId);
  assert.equal(item.chapterId, location.chapterId);
  assert.equal(item.sectionId, location.sectionId ?? null);
  assert.equal(item.locationKind, location.locationKind);
  assert.deepEqual(item.pageSpan, location.pageSpan ?? null);
  assert.deepEqual(item.allowedDecisionValues, allowedDecisionValues);
  assert.equal(item.acceptanceAllowedByThisWorklist, false);
  assert.equal(item.runtimePromotionAllowed, false);
  assert.equal(itemIds.has(item.id), false, `duplicate review item id ${item.id}`);
  itemIds.add(item.id);

  const expectedRecords = recordsByLocation.get(location.id) ?? [];
  const expectedEvidence = evidenceByLocation.get(location.id) ?? [];
  const expectedBoundaryDecisionId = boundaryDecisionByChapter.get(location.chapterId) ?? null;
  const expectedEvidenceRefIds = (physicalIdsByLocation.get(location.id) ?? [])
    .map((physicalId) => evidenceByPhysicalId.get(physicalId)?.id)
    .filter(Boolean);
  assert.deepEqual(item.pageRecordIds, expectedRecords.map((record) => record.id));
  assert.equal(item.pageRecordCount, expectedRecords.length);
  assert.deepEqual(item.physicalPageRecordIds, physicalIdsByLocation.get(location.id) ?? []);
  assert.deepEqual(item.evidenceRefIds, expectedEvidenceRefIds);
  assert.deepEqual(item.sourceEvidenceIds, expectedEvidence.map((evidence) => evidence.id));
  assert.equal(item.sourceEvidenceCount, expectedEvidence.length);
  assert.equal(item.boundaryDecisionId, expectedBoundaryDecisionId);
  assert.equal(item.requiresBoundaryResolution, Boolean(expectedBoundaryDecisionId));
  assert.ok(item.pageRecordCount > 0, `${item.id} must have page records`);
  assert.ok(item.sourceEvidenceCount > 0, `${item.id} must have source evidence`);
  assert.ok(item.requiredReviewerInputs.includes('confirm page span belongs to this BookLocation'));
  assert.equal(item.requiredDecisionShape.runtimeEligible, false);
  assert.ok(item.fatalBeforeAcceptance.includes('no_runtime_promotion_without_new_release_data_order'));
}

for (const pattern of [/C:\\/i, /C:\//i, /rawOcrText/i, /rawOcrExcerpt/i, /studentPin/i, /set-cookie/i, /upstash/i]) {
  assert.equal(pattern.test(JSON.stringify(worklist)), false, `leaky token in page-record worklist: ${pattern}`);
  assert.equal(pattern.test(report), false, `leaky token in page-record report: ${pattern}`);
}

console.log(JSON.stringify({
  ok: true,
  reviewItems: worklist.reviewItemCount,
  pageRecords: worklist.pageRecordCount,
  pageRecordReviewDecisions: decisions.length,
  runtimePromotionAllowed: worklist.runtimePromotionAllowed
}, null, 2));
