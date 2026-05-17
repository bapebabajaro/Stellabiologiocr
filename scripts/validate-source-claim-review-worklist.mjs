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
const text = readFileSync(join(root, 'reports/validation/source-claim-review-readiness.md'), 'utf8');

assert.equal(worklist.schemaVersion, 'source-claim-review-worklist-v1');
assert.equal(worklist.subject, 'biologi');
assert.equal(worklist.bookEditionId, 'bookedition-stella-biologi-ocr-v1');
assert.equal(worklist.sourceClaimCount, claims.length);
assert.equal(worklist.bookLocationCount, locations.length);
assert.equal(worklist.pageRecordCount, pageRecords.length);
assert.equal(worklist.sourceEvidenceCount, sourceEvidence.length);
assert.equal(worklist.reviewItemCount, worklist.reviewItems.length);
assert.equal(worklist.reviewItems.length, claims.length);
assert.equal(worklist.acceptedSourceClaims, 0);
assert.equal(worklist.runtimeEligibleSourceClaims, 0);
assert.equal(worklist.acceptanceAllowedByThisWorklist, false);
assert.equal(worklist.runtimePromotionAllowed, false);
assert.equal(worklist.candidateGenerationAllowed, false);
assert.equal(worklist.pixelBindingAllowed, false);
assert.equal(worklist.status, 'blocked_review_worklist_only');

const claimIds = new Set(claims.map((claim) => claim.id));
const locationIds = new Set(locations.map((location) => location.id));
const itemIds = new Set();
for (const item of worklist.reviewItems) {
  assert.equal(item.schemaVersion, 'source-claim-review-item-v1');
  assert.equal(item.subject, worklist.subject);
  assert.equal(item.bookEditionId, worklist.bookEditionId);
  assert.equal(item.acceptanceAllowedByThisWorklist, false);
  assert.equal(item.runtimePromotionAllowed, false);
  assert.ok(claimIds.has(item.sourceClaimId), `${item.id} references missing SourceClaim`);
  assert.ok(locationIds.has(item.bookLocationId), `${item.id} references missing BookLocation`);
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
  acceptedSourceClaims: worklist.acceptedSourceClaims,
  runtimePromotionAllowed: worklist.runtimePromotionAllowed
}, null, 2));
