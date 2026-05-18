#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const subject = 'biologi';
const bookEditionId = 'bookedition-stella-biologi-ocr-v1';

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

const worklist = readJson('questions/intake-worklist.json');
const intakeCandidatesText = readFileSync(join(root, 'questions/intake-candidates.jsonl'), 'utf8').trim();
const intakeCandidates = readJsonl('questions/intake-candidates.jsonl');
const sourceClaims = readJsonl('lineage/source-claims.jsonl');
const kpCandidates = readJsonl('lineage/knowledge-point-candidates.jsonl');

const sourceClaimById = new Map(sourceClaims.map((claim) => [claim.id, claim]));
const kpById = new Map(kpCandidates.map((candidate) => [candidate.id, candidate]));

assert.equal(worklist.schemaVersion, 'question-intake-worklist-v1');
assert.equal(worklist.subject, subject);
assert.equal(worklist.bookEditionId, bookEditionId);
assert.equal(worklist.targetCandidateCount, 1200);
assert.equal(worklist.plannedCandidateCount, 1200);
assert.equal(worklist.runtimeImportAllowed, false);
assert.equal(worklist.candidateGenerationAllowed, false);
assert.equal(worklist.kvWriteAllowed, false);
assert.equal(worklist.importApplyAllowed, false);
assert.equal(worklist.safeActiveWriteAllowed, false);
assert.equal(worklist.pixelWriteAllowed, false);
assert.equal(worklist.activeQuestionCount, 0);
assert.equal(worklist.acceptedSourceClaims, 0);
assert.equal(worklist.acceptedKnowledgePoints, 0);
assert.ok(Array.isArray(intakeCandidates));

assert.equal(Array.isArray(worklist.workItems), true);
assert.equal(worklist.workItems.length, 37);

let planned = 0;
const ids = new Set();
for (const item of worklist.workItems) {
  assert.equal(item.schemaVersion, 'question-intake-workitem-v1');
  assert.equal(item.subject, subject);
  assert.equal(item.bookEditionId, bookEditionId);
  assert.equal(item.candidateGenerationAllowed, false);
  assert.equal(item.runtimeImportAllowed, false);
  assert.equal(item.kvWriteAllowed, false);
  assert.equal(item.importApplyAllowed, false);
  assert.equal(item.safeActiveWriteAllowed, false);
  assert.equal(item.pixelWriteAllowed, false);
  assert.equal(item.blocker, 'blocked_until_source_claims_and_atomic_knowledge_points_are_accepted');
  assert.equal(ids.has(item.id), false, `${item.id} must be unique`);
  ids.add(item.id);
  planned += item.plannedCandidateQuota;

  const kp = kpById.get(item.knowledgePointCandidateId);
  assert.ok(kp, `${item.id} must reference an existing KP candidate`);
  assert.equal(kp.candidateKind, 'section_placeholder');
  assert.equal(kp.pixelEligible, false);

  for (const claimId of item.sourceClaimIds) {
    const claim = sourceClaimById.get(claimId);
    assert.ok(claim, `${item.id} references missing SourceClaim ${claimId}`);
    assert.notEqual(claim.reviewStatus, 'accepted');
    assert.equal(claim.runtimeEligible, false);
  }
}
assert.equal(planned, worklist.plannedCandidateCount);

const serialized = JSON.stringify(worklist.workItems);
for (const pattern of [
  /raw_ocr_text/i,
  /raw_ocr_excerpt/i,
  /C:\\/i,
  /C:\//i,
  /OneDrive/i,
  /Skrivbord/i,
  /student_pin/i,
  /set-cookie/i,
  /private-source:\/\//i
]) {
  assert.equal(pattern.test(serialized), false, `worklist must not contain ${pattern}`);
  assert.equal(pattern.test(intakeCandidatesText), false, `intake candidates must not contain ${pattern}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      workItems: worklist.workItems.length,
      plannedCandidateCount: planned,
      questionCandidates: intakeCandidates.length,
      runtimeImportAllowed: worklist.runtimeImportAllowed,
      candidateGenerationAllowed: worklist.candidateGenerationAllowed,
      kvWriteAllowed: worklist.kvWriteAllowed,
      importApplyAllowed: worklist.importApplyAllowed,
      safeActiveWriteAllowed: worklist.safeActiveWriteAllowed,
      pixelWriteAllowed: worklist.pixelWriteAllowed
    },
    null,
    2
  )
);
