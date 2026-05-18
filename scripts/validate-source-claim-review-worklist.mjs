#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

function readJsonl(rel) {
  const text = readFileSync(join(root, rel), 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).map((line) => JSON.parse(line));
}

const worklist = readJson('lineage/source-claim-review-worklist.json');
const claims = readJsonl('lineage/source-claims.jsonl');
const locations = readJsonl('lineage/book-locations.jsonl');
const pageRecords = readJsonl('lineage/page-records.jsonl');
const sourceEvidence = readJsonl('lineage/source-evidence.jsonl');
const bookLocationPageLinks = readJsonl('lineage/book-location-page-links.jsonl');
const physicalPageRecords = readJsonl('lineage/physical-page-records.jsonl');
const evidenceRefs = readJsonl('lineage/evidence-refs.jsonl');
const boundaryDecisions = readJsonl('lineage/section-boundary-decisions.jsonl');
const text = readFileSync(join(root, 'reports/validation/source-claim-review-readiness.md'), 'utf8');

const allowedDecisionValues = ['reviewed_not_runtime', 'request_fix', 'reject'];
const recordsByLocation = new Map();
for (const record of pageRecords) {
  const rows = recordsByLocation.get(record.bookLocationId) ?? [];
  rows.push(record);
  recordsByLocation.set(record.bookLocationId, rows);
}
const evidenceByLocation = new Map();
for (const evidence of sourceEvidence) {
  const rows = evidenceByLocation.get(evidence.bookLocationId) ?? [];
  rows.push(evidence);
  evidenceByLocation.set(evidence.bookLocationId, rows);
}
const boundaryDecisionByChapter = new Map();
for (const decision of boundaryDecisions) {
  for (const chapterId of decision.affectedChapters ?? []) boundaryDecisionByChapter.set(chapterId, decision.id);
}
const physicalIds = new Set(physicalPageRecords.map((record) => record.id));
const evidenceRefIdsByPhysicalId = new Map(evidenceRefs.map((evidenceRef) => [evidenceRef.physicalPageRecordId, evidenceRef.id]));
const physicalIdsByLocation = new Map();
for (const link of bookLocationPageLinks) {
  assert.ok(physicalIds.has(link.physicalPageRecordId), `${link.id} references missing physical page`);
  assert.ok(evidenceRefIdsByPhysicalId.has(link.physicalPageRecordId), `${link.id} physical page lacks evidence-ref`);
  const rows = physicalIdsByLocation.get(link.bookLocationId) ?? [];
  rows.push(link.physicalPageRecordId);
  physicalIdsByLocation.set(link.bookLocationId, rows);
}

assert.equal(worklist.schemaVersion, 'source-claim-review-worklist-v1');
assert.equal(worklist.subject, 'biologi');
assert.equal(worklist.bookEditionId, 'bookedition-stella-biologi-ocr-v1');
assert.equal(worklist.sourceClaimCount, claims.length);
assert.equal(worklist.bookLocationCount, locations.length);
assert.equal(worklist.pageRecordCount, pageRecords.length);
assert.equal(worklist.sourceEvidenceCount, sourceEvidence.length);
assert.equal(worklist.reviewItemCount, worklist.reviewItems.length);
assert.equal(worklist.reviewItems.length, claims.length);
assert.equal(worklist.reviewedNonRuntimeSourceClaims, 0);
assert.equal(worklist.runtimeEligibleSourceClaims, 0);
assert.equal(worklist.acceptanceAllowedByThisWorklist, false);
assert.equal(worklist.runtimePromotionAllowed, false);
assert.equal(worklist.candidateGenerationAllowed, false);
assert.equal(worklist.pixelBindingAllowed, false);
assert.equal(worklist.kvWriteAllowed, false);
assert.equal(worklist.importApplyAllowed, false);
assert.equal(worklist.safeActiveWriteAllowed, false);
assert.equal(worklist.status, 'blocked_review_worklist_only');

const claimIds = new Set(claims.map((claim) => claim.id));
const locationById = new Map(locations.map((location) => [location.id, location]));
const itemIds = new Set();
for (const item of worklist.reviewItems) {
  assert.equal(item.schemaVersion, 'source-claim-review-item-v1');
  assert.equal(item.subject, worklist.subject);
  assert.equal(item.bookEditionId, worklist.bookEditionId);
  assert.equal(item.acceptanceAllowedByThisWorklist, false);
  assert.equal(item.runtimePromotionAllowed, false);
  assert.equal(item.candidateGenerationAllowed, false);
  assert.equal(item.pixelBindingAllowed, false);
  assert.equal(item.kvWriteAllowed, false);
  assert.equal(item.importApplyAllowed, false);
  assert.equal(item.safeActiveWriteAllowed, false);
  assert.deepEqual(item.allowedDecisionValues, allowedDecisionValues);
  assert.ok(claimIds.has(item.sourceClaimId), `${item.id} references missing SourceClaim`);
  const location = locationById.get(item.bookLocationId);
  assert.ok(location, `${item.id} references missing BookLocation`);
  const expectedRecords = recordsByLocation.get(item.bookLocationId) ?? [];
  const expectedEvidence = evidenceByLocation.get(item.bookLocationId) ?? [];
  const expectedBoundaryDecisionId = boundaryDecisionByChapter.get(location.chapterId) ?? null;
  const expectedEvidenceRefIds = (physicalIdsByLocation.get(item.bookLocationId) ?? [])
    .map((physicalId) => evidenceRefIdsByPhysicalId.get(physicalId))
    .filter(Boolean);
  assert.deepEqual(item.pageRecordIds, expectedRecords.map((record) => record.id));
  assert.equal(item.pageRecordCount, expectedRecords.length);
  assert.deepEqual(item.physicalPageRecordIds, physicalIdsByLocation.get(item.bookLocationId) ?? []);
  assert.deepEqual(item.evidenceRefIds, expectedEvidenceRefIds);
  assert.deepEqual(claims.find((claim) => claim.id === item.sourceClaimId)?.evidenceRefIds, expectedEvidenceRefIds);
  assert.deepEqual(item.sourceEvidenceIds, expectedEvidence.map((evidence) => evidence.id));
  assert.equal(item.sourceEvidenceCount, expectedEvidence.length);
  assert.equal(item.boundaryDecisionId, expectedBoundaryDecisionId);
  assert.equal(item.requiresBoundaryResolution, Boolean(expectedBoundaryDecisionId));
  assert.ok(item.pageRecordCount > 0, `${item.id} must have page records`);
  assert.ok(item.sourceEvidenceCount > 0, `${item.id} must have source evidence`);
  assert.ok(item.requiredReviewerInputs.includes('source_atom'));
  assert.ok(item.requiredReviewerInputs.includes('claim_table_row'));
  assert.ok(item.requiredAcceptancePatchShape);
  assert.equal(item.requiredAcceptancePatchShape.runtimeEligible, false);
  assert.notEqual(item.requiredAcceptancePatchShape.reviewerDecision, 'accepted_runtime');
  assert.ok(item.fatalBeforeAcceptance.includes('no_raw_ocr_text_allowed_in_public_artifacts'));
  assert.ok(item.fatalBeforeAcceptance.includes('no_runtime_promotion_without_new_release_data_order'));
  assert.equal(itemIds.has(item.id), false, `duplicate review item id ${item.id}`);
  itemIds.add(item.id);
}

for (const pattern of [/C:\\/i, /C:\//i, /rawOcrText/i, /rawOcrExcerpt/i, /studentPin/i, /set-cookie/i, /upstash/i]) {
  assert.equal(pattern.test(JSON.stringify(worklist)), false, `leaky token in review worklist: ${pattern}`);
  assert.equal(pattern.test(text), false, `leaky token in readiness report: ${pattern}`);
}

console.log(JSON.stringify({
  ok: true,
  reviewItems: worklist.reviewItemCount,
      reviewedNonRuntimeSourceClaims: worklist.reviewedNonRuntimeSourceClaims,
  runtimePromotionAllowed: worklist.runtimePromotionAllowed
}, null, 2));
