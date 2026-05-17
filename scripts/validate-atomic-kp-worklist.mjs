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

const worklist = readJson('lineage/atomic-knowledge-point-worklist.json');
const sourceClaims = readJsonl('lineage/source-claims.jsonl');
const kpCandidates = readJsonl('lineage/knowledge-point-candidates.jsonl');
const questionWorklist = readJson('questions/intake-worklist.json');

const sourceClaimById = new Map(sourceClaims.map((claim) => [claim.id, claim]));
const kpCandidateById = new Map(kpCandidates.map((candidate) => [candidate.id, candidate]));
const questionItemBySection = new Map(questionWorklist.workItems.map((item) => [item.sectionId, item]));

assert.equal(worklist.schemaVersion, 'atomic-kp-worklist-v1');
assert.equal(worklist.subject, subject);
assert.equal(worklist.bookEditionId, bookEditionId);
assert.equal(worklist.targetQuestionCandidates, 1200);
assert.equal(worklist.targetQuestionsPerAtomicKp, 5);
assert.equal(worklist.targetAtomicKnowledgePoints, 240);
assert.equal(worklist.runtimeImportAllowed, false);
assert.equal(worklist.candidateGenerationAllowed, false);
assert.equal(worklist.pixelBindingAllowed, false);
assert.equal(worklist.acceptedSourceClaims, 0);
assert.equal(worklist.acceptedAtomicKnowledgePoints, 0);
assert.equal(worklist.workItems.length, 37);

let plannedKps = 0;
let plannedQuestions = 0;
const ids = new Set();
for (const item of worklist.workItems) {
  assert.equal(item.schemaVersion, 'atomic-kp-workitem-v1');
  assert.equal(item.subject, subject);
  assert.equal(item.bookEditionId, bookEditionId);
  assert.equal(item.runtimeImportAllowed, false);
  assert.equal(item.candidateGenerationAllowed, false);
  assert.equal(item.pixelEligible, false);
  assert.equal(item.blocker, 'blocked_until_source_claims_are_accepted_and_page_records_reviewed');
  assert.equal(ids.has(item.id), false, `${item.id} must be unique`);
  ids.add(item.id);
  assert.ok(item.plannedAtomicKnowledgePointQuota >= 1);
  plannedKps += item.plannedAtomicKnowledgePointQuota;
  plannedQuestions += item.plannedQuestionCandidateQuota;

  const sourcePlaceholder = kpCandidateById.get(item.sourcePlaceholderKnowledgePointId);
  assert.ok(sourcePlaceholder, `${item.id} must reference existing source placeholder KP`);
  assert.equal(sourcePlaceholder.candidateKind, 'section_placeholder');
  assert.equal(sourcePlaceholder.pixelEligible, false);

  const questionItem = questionItemBySection.get(item.sectionId);
  assert.ok(questionItem, `${item.id} must reference an existing question work item section`);
  assert.equal(questionItem.plannedCandidateQuota, item.plannedQuestionCandidateQuota);

  for (const claimId of item.sourceClaimIds) {
    const claim = sourceClaimById.get(claimId);
    assert.ok(claim, `${item.id} references missing SourceClaim ${claimId}`);
    assert.notEqual(claim.reviewStatus, 'accepted');
    assert.equal(claim.runtimeEligible, false);
  }
}

assert.equal(plannedKps, worklist.plannedAtomicKnowledgePointCount);
assert.equal(plannedKps, 240);
assert.equal(plannedQuestions, 1200);

const serialized = JSON.stringify(worklist);
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
}

console.log(
  JSON.stringify(
    {
      ok: true,
      workItems: worklist.workItems.length,
      plannedAtomicKnowledgePointCount: plannedKps,
      plannedQuestionCandidateCount: plannedQuestions,
      runtimeImportAllowed: worklist.runtimeImportAllowed,
      candidateGenerationAllowed: worklist.candidateGenerationAllowed
    },
    null,
    2
  )
);
