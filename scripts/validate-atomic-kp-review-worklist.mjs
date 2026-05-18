#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

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
const sourceWorklist = readJson('lineage/atomic-knowledge-point-worklist.json');
const reviewWorklist = readJson('lineage/atomic-kp-review-worklist.json');
const sourceClaims = readJsonl('lineage/source-claims.jsonl');
const sourceAtoms = readJsonl('lineage/source-atoms.jsonl');
const atomicKps = readJsonl('lineage/atomic-knowledge-points.jsonl');
const reviewDecisions = readJsonl('lineage/atomic-kp-review-decisions.jsonl');
const report = readFileSync(join(root, 'reports/validation/atomic-kp-review-readiness.md'), 'utf8');

const sourceClaimById = new Map(sourceClaims.map((claim) => [claim.id, claim]));
const expectedSlotsBySection = new Map(sourceWorklist.workItems.map((item) => [item.sectionId, item]));

assert.equal(reviewWorklist.schemaVersion, 'atomic-kp-review-worklist-v1');
assert.equal(reviewWorklist.subject, book.subject);
assert.equal(reviewWorklist.bookEditionId, book.bookEditionId);
assert.equal(reviewWorklist.sourceWorkItemCount, sourceWorklist.workItemCount);
assert.equal(reviewWorklist.plannedAtomicKnowledgePointCount, sourceWorklist.plannedAtomicKnowledgePointCount);
assert.equal(reviewWorklist.reviewItemCount, reviewWorklist.reviewItems.length);
assert.equal(reviewWorklist.reviewItemCount, 240);
assert.equal(reviewWorklist.acceptedAtomicKnowledgePoints, 0);
assert.equal(reviewWorklist.runtimeImportAllowed, false);
assert.equal(reviewWorklist.candidateGenerationAllowed, false);
assert.equal(reviewWorklist.pixelBindingAllowed, false);
assert.equal(reviewWorklist.kvWriteAllowed, false);
assert.equal(reviewWorklist.importApplyAllowed, false);
assert.equal(reviewWorklist.safeActiveWriteAllowed, false);
assert.equal(reviewWorklist.status, 'blocked_review_worklist_only');
assert.equal(sourceAtoms.length, 0);
assert.equal(atomicKps.length, 0);
assert.equal(reviewDecisions.length, 0);

const seenIds = new Set();
const actualSlotsBySection = new Map();
for (const item of reviewWorklist.reviewItems) {
  assert.equal(item.schemaVersion, 'atomic-kp-review-item-v1');
  assert.equal(item.subject, book.subject);
  assert.equal(item.bookEditionId, book.bookEditionId);
  assert.equal(item.reviewStatus, 'blocked_until_source_claim_reviewed');
  assert.equal(item.acceptanceAllowedByThisWorklist, false);
  assert.equal(item.runtimeImportAllowed, false);
  assert.equal(item.candidateGenerationAllowed, false);
  assert.equal(item.pixelBindingAllowed, false);
  assert.equal(item.kvWriteAllowed, false);
  assert.equal(item.importApplyAllowed, false);
  assert.equal(item.safeActiveWriteAllowed, false);
  assert.equal(seenIds.has(item.id), false, `duplicate atomic KP review item id ${item.id}`);
  seenIds.add(item.id);

  const sourceItem = expectedSlotsBySection.get(item.sectionId);
  assert.ok(sourceItem, `${item.id} references missing source work item section ${item.sectionId}`);
  assert.equal(item.chapterId, sourceItem.chapterId);
  assert.equal(item.bookLocationId, sourceItem.bookLocationId);
  assert.equal(item.sourcePlaceholderKnowledgePointId, sourceItem.sourcePlaceholderKnowledgePointId);
  assert.deepEqual(item.sourceClaimIds, sourceItem.sourceClaimIds);
  assert.ok(Number.isInteger(item.slotNumber));
  assert.ok(item.slotNumber >= 1);
  actualSlotsBySection.set(item.sectionId, (actualSlotsBySection.get(item.sectionId) ?? 0) + 1);

  for (const claimId of item.sourceClaimIds) {
    const claim = sourceClaimById.get(claimId);
    assert.ok(claim, `${item.id} references missing SourceClaim ${claimId}`);
    assert.notEqual(claim.reviewStatus, 'accepted');
    assert.equal(claim.runtimeEligible, false);
  }
  assert.ok(item.requiredReviewerInputs.includes('neutral source_atom row'));
  assert.equal(item.requiredAtomicKnowledgePointPatchShape.runtimeEligible, false);
  assert.equal(item.requiredAtomicKnowledgePointPatchShape.pixelEligible, false);
  assert.ok(item.fatalBeforeAcceptance.includes('no runtime import or KV write order'));
}

for (const sourceItem of sourceWorklist.workItems) {
  assert.equal(
    actualSlotsBySection.get(sourceItem.sectionId),
    sourceItem.plannedAtomicKnowledgePointQuota,
    `${sourceItem.sectionId} slot count must match planned quota`
  );
}

for (const pattern of [/C:\\/i, /C:\//i, /rawOcrText/i, /rawOcrExcerpt/i, /studentPin/i, /set-cookie/i, /upstash/i, /private-source:\/\//i]) {
  assert.equal(pattern.test(JSON.stringify(reviewWorklist)), false, `leaky token in atomic KP review worklist: ${pattern}`);
  assert.equal(pattern.test(report), false, `leaky token in atomic KP review report: ${pattern}`);
}

console.log(JSON.stringify({
  ok: true,
  reviewItems: reviewWorklist.reviewItemCount,
  plannedAtomicKnowledgePointCount: reviewWorklist.plannedAtomicKnowledgePointCount,
  runtimeImportAllowed: reviewWorklist.runtimeImportAllowed,
  kvWriteAllowed: reviewWorklist.kvWriteAllowed,
  importApplyAllowed: reviewWorklist.importApplyAllowed,
  safeActiveWriteAllowed: reviewWorklist.safeActiveWriteAllowed
}, null, 2));
