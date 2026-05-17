#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const generatedAt = '2026-05-17';
const subject = 'biologi';
const bookEditionId = 'bookedition-stella-biologi-ocr-v1';
const targetCandidateCount = 1200;

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

const kpCandidates = readJsonl('lineage/knowledge-point-candidates.jsonl');
const sourceClaims = readJsonl('lineage/source-claims.jsonl');
const sourceClaimIds = new Set(sourceClaims.map((claim) => claim.id));

const sectionPlaceholders = kpCandidates.filter(
  (candidate) =>
    candidate.subject === subject &&
    candidate.bookEditionId === bookEditionId &&
    candidate.candidateKind === 'section_placeholder'
);

const baseQuota = Math.floor(targetCandidateCount / sectionPlaceholders.length);
const remainder = targetCandidateCount % sectionPlaceholders.length;

const workItems = sectionPlaceholders.map((candidate, index) => {
  const missingClaims = (candidate.sourceClaimIds ?? []).filter((id) => !sourceClaimIds.has(id));
  if (missingClaims.length > 0) {
    throw new Error(`${candidate.id}: missing SourceClaim ids: ${missingClaims.join(', ')}`);
  }

  return {
    id: `question-intake-workitem-${candidate.sectionId}`,
    schemaVersion: 'question-intake-workitem-v1',
    subject,
    bookEditionId,
    chapterId: candidate.chapterId,
    sectionId: candidate.sectionId,
    bookLocationId: candidate.bookLocationId,
    knowledgePointCandidateId: candidate.id,
    sourceClaimIds: candidate.sourceClaimIds,
    plannedCandidateQuota: baseQuota + (index < remainder ? 1 : 0),
    candidateGenerationAllowed: false,
    runtimeImportAllowed: false,
    blocker: 'blocked_until_source_claims_and_atomic_knowledge_points_are_accepted',
    requiredBeforeUnlock: [
      'accepted SourceClaims with reviewed evidence_ref',
      'section placeholder split into atomic KnowledgePoints',
      'student-facing copy written without textbook copying',
      'four answer options with one correct option',
      'distractor rationale for every wrong option',
      'QuestionKnowledgeLink review',
      'public sanitized copy review'
    ]
  };
});

const plannedCandidateCount = workItems.reduce((sum, item) => sum + item.plannedCandidateQuota, 0);

const worklist = {
  schemaVersion: 'question-intake-worklist-v1',
  generatedAt,
  subject,
  bookEditionId,
  targetCandidateCount,
  plannedCandidateCount,
  workItemCount: workItems.length,
  runtimeImportAllowed: false,
  candidateGenerationAllowed: false,
  activeQuestionCount: 0,
  acceptedSourceClaims: 0,
  acceptedKnowledgePoints: 0,
  status: 'blocked_planning_only',
  distributionPolicy:
    '1200 is a future candidate target only. Quotas reserve review capacity per section placeholder; they do not authorize generation.',
  fatalGates: [
    'no accepted SourceClaims',
    'no atomic KnowledgePoints',
    'no QuestionKnowledgeLinks',
    'no public sanitized question copy',
    'no safe-active metadata',
    'no runtime import or KV write order'
  ],
  forbiddenInCandidates: [
    'raw_ocr_text',
    'raw_ocr_excerpt',
    'absoluteLocalPath',
    'private source locator in public copy',
    'student data',
    'PIN',
    'cookie',
    'KV key'
  ],
  requiredQuestionShapeWhenUnlocked: {
    id: 'stable biology question id',
    subject,
    bookEditionId,
    bookLocationIds: ['BookLocation id'],
    sourceClaimIds: ['accepted SourceClaim id'],
    knowledgePointIds: ['accepted atomic KnowledgePoint id'],
    studentStem: 'student-facing Swedish question text',
    options: ['A', 'B', 'C', 'D'],
    correctOptionId: 'one option id',
    distractorRationales: ['one rationale per wrong option'],
    publicSanitizedSourceSummary: 'short non-copied source grounding',
    reviewStatus: 'candidate_review_required'
  },
  workItems
};

writeJson('questions/intake-worklist.json', worklist);

writeText(
  'reports/validation/question-intake-readiness.md',
  `# Question intake readiness - Stella Biologi

Generated: ${generatedAt}

Status: blocked planning only.

The repository now has a 1200-question planning worklist, but no question
candidate is generated or runtime-eligible.

| Metric | Count |
|---|---:|
| Target future candidates | ${targetCandidateCount} |
| Planned candidate quota | ${plannedCandidateCount} |
| Work items | ${workItems.length} |
| Accepted SourceClaims | 0 |
| Accepted atomic KnowledgePoints | 0 |
| Active questions | 0 |

## Why blocked

- SourceClaims are structure-only and not accepted runtime evidence.
- KnowledgePoint candidates are section placeholders, not atomic KnowledgePoints.
- questions/intake-candidates.jsonl must remain empty until lineage gates pass.
- No QKL, safe-active metadata, import apply or KV write is allowed.

## Next input for the question agent

1. Resolve page-boundary blockers.
2. Accept reviewed SourceClaims.
3. Split section placeholders into atomic KnowledgePoints.
4. Generate candidate questions from accepted KPs only.
5. Validate answer grounding, distractor rationales, uniqueness and public copy.
`
);

console.log(
  JSON.stringify(
    {
      ok: true,
      workItems: workItems.length,
      targetCandidateCount,
      plannedCandidateCount,
      runtimeImportAllowed: false,
      candidateGenerationAllowed: false
    },
    null,
    2
  )
);
