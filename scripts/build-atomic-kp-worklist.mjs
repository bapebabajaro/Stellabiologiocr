#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const generatedAt = '2026-05-17';
const subject = 'biologi';
const bookEditionId = 'bookedition-stella-biologi-ocr-v1';
const targetQuestionCandidates = 1200;
const targetQuestionsPerAtomicKp = 5;
const targetAtomicKnowledgePoints = targetQuestionCandidates / targetQuestionsPerAtomicKp;

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

function writeJson(rel, value) {
  const target = join(root, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(rel, text) {
  const target = join(root, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
}

const toc = readJson('manifest/toc.json');
const questionWorklist = readJson('questions/intake-worklist.json');
const sourceClaims = readJsonl('lineage/source-claims.jsonl');
const kpCandidates = readJsonl('lineage/knowledge-point-candidates.jsonl');

const sourceClaimById = new Map(sourceClaims.map((claim) => [claim.id, claim]));
const sectionById = new Map();
for (const chapter of toc.chapters ?? []) {
  for (const section of chapter.subchapters ?? []) {
    sectionById.set(section.sectionId, { chapter, section });
  }
}

const sectionPlaceholders = kpCandidates.filter(
  (candidate) =>
    candidate.subject === subject &&
    candidate.bookEditionId === bookEditionId &&
    candidate.candidateKind === 'section_placeholder'
);
const questionItemBySection = new Map(questionWorklist.workItems.map((item) => [item.sectionId, item]));
const baseQuota = Math.floor(targetAtomicKnowledgePoints / sectionPlaceholders.length);
const remainder = targetAtomicKnowledgePoints % sectionPlaceholders.length;

const workItems = sectionPlaceholders.map((candidate, index) => {
  const sectionContext = sectionById.get(candidate.sectionId);
  if (!sectionContext) throw new Error(`${candidate.id}: missing TOC section ${candidate.sectionId}`);
  const questionItem = questionItemBySection.get(candidate.sectionId);
  if (!questionItem) throw new Error(`${candidate.id}: missing question work item`);
  const sourceClaimIds = candidate.sourceClaimIds ?? [];
  const missingClaims = sourceClaimIds.filter((id) => !sourceClaimById.has(id));
  if (missingClaims.length > 0) {
    throw new Error(`${candidate.id}: missing SourceClaims ${missingClaims.join(', ')}`);
  }

  return {
    id: `atomic-kp-workitem-${candidate.sectionId}`,
    schemaVersion: 'atomic-kp-workitem-v1',
    subject,
    bookEditionId,
    chapterId: candidate.chapterId,
    sectionId: candidate.sectionId,
    bookLocationId: candidate.bookLocationId,
    sourcePlaceholderKnowledgePointId: candidate.id,
    sourceClaimIds,
    sectionType: sectionContext.section.sectionType,
    sectionStatus: sectionContext.section.status,
    plannedAtomicKnowledgePointQuota: baseQuota + (index < remainder ? 1 : 0),
    plannedQuestionCandidateQuota: questionItem.plannedCandidateQuota,
    candidateGenerationAllowed: false,
    runtimeImportAllowed: false,
    pixelEligible: false,
    blocker: 'blocked_until_source_claims_are_accepted_and_page_records_reviewed',
    reviewerInputsRequired: [
      'accepted SourceClaim evidence_ref',
      'neutral source_atom summary',
      'visual_source_atom when figures or models matter',
      'claim_table row for each atom',
      'no copied textbook phrasing',
      'one narrow measurable learning target per atomic KP',
      'future QKL role recommendation'
    ],
    requiredAtomicKnowledgePointShapeWhenUnlocked: {
      id: 'stable kp-biologi-* id',
      schemaVersion: 'knowledge-point-v1',
      subject,
      bookEditionId,
      bookLocationIds: ['accepted BookLocation id'],
      sourceClaimIds: ['accepted SourceClaim id'],
      sourceAtomIds: ['accepted source_atom id'],
      label: 'short public-safe Swedish label',
      studentGoal: 'what the student should be able to do, not copied text',
      assessmentModes: ['mcq', 'short_reasoning', 'visual_interpretation'],
      pixelEligible: false,
      reviewStatus: 'candidate_review_required'
    }
  };
});

const plannedAtomicKnowledgePointCount = workItems.reduce(
  (sum, item) => sum + item.plannedAtomicKnowledgePointQuota,
  0
);

const worklist = {
  schemaVersion: 'atomic-kp-worklist-v1',
  generatedAt,
  subject,
  bookEditionId,
  targetQuestionCandidates,
  targetQuestionsPerAtomicKp,
  targetAtomicKnowledgePoints,
  plannedAtomicKnowledgePointCount,
  workItemCount: workItems.length,
  acceptedSourceClaims: sourceClaims.filter((claim) => claim.reviewStatus === 'accepted').length,
  acceptedAtomicKnowledgePoints: 0,
  runtimeImportAllowed: false,
  candidateGenerationAllowed: false,
  pixelBindingAllowed: false,
  status: 'blocked_planning_only',
  distributionPolicy:
    'Atomic KP quotas reserve review capacity. They do not authorize runtime KnowledgePoints, questions or pixel bindings.',
  fatalGates: [
    'no accepted SourceClaims',
    'no reviewed source_atom records',
    'no atomic KnowledgePoints',
    'no QKL',
    'no safe-active metadata',
    'no pixel bindings',
    'no runtime import or KV write order'
  ],
  workItems
};

writeJson('lineage/atomic-knowledge-point-worklist.json', worklist);
writeText(
  'reports/validation/atomic-kp-readiness.md',
  `# Atomic KnowledgePoint readiness - Stella Biologi

Generated: ${generatedAt}

Status: blocked planning only.

| Metric | Count |
|---|---:|
| Target future questions | ${targetQuestionCandidates} |
| Target questions per atomic KP | ${targetQuestionsPerAtomicKp} |
| Planned atomic KPs | ${plannedAtomicKnowledgePointCount} |
| Work items | ${workItems.length} |
| Accepted SourceClaims | ${worklist.acceptedSourceClaims} |
| Accepted atomic KPs | 0 |

## Why blocked

- Current KP candidates are section placeholders only.
- SourceClaims are structure/index references, not accepted runtime evidence.
- Page records and source atoms are still pending reviewer acceptance.
- Pixel bindings and question generation remain forbidden.

## Reviewer handoff

Each work item says how many atomic KPs the OCR/content reviewer should derive
from that section after accepted evidence exists. Every atom must be narrow,
measurable, public-safe and linked back to accepted SourceClaims. The next
question batch must consume only accepted atomic KPs.
`
);

console.log(
  JSON.stringify(
    {
      ok: true,
      workItems: workItems.length,
      targetQuestionCandidates,
      plannedAtomicKnowledgePointCount,
      runtimeImportAllowed: false,
      candidateGenerationAllowed: false,
      pixelBindingAllowed: false
    },
    null,
    2
  )
);
