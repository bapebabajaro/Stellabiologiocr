#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const generatedAt = '2026-05-17';

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

function readJsonl(rel) {
  const text = readFileSync(join(root, rel), 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).map((line) => JSON.parse(line));
}

function writeJson(rel, value) {
  writeFileSync(join(root, rel), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeMd(rel, text) {
  writeFileSync(join(root, rel), text, 'utf8');
}

const book = readJson('manifest/book-edition.json');
const sourceClaims = readJsonl('lineage/source-claims.jsonl');
const bookLocations = readJsonl('lineage/book-locations.jsonl');
const pageRecords = readJsonl('lineage/page-records.jsonl');
const sourceEvidence = readJsonl('lineage/source-evidence.jsonl');
const boundaryDecisions = readJsonl('lineage/section-boundary-decisions.jsonl');

const locationById = new Map(bookLocations.map((location) => [location.id, location]));
const pageRecordsByLocation = new Map();
for (const record of pageRecords) {
  const rows = pageRecordsByLocation.get(record.bookLocationId) ?? [];
  rows.push(record);
  pageRecordsByLocation.set(record.bookLocationId, rows);
}

const sourceEvidenceByLocation = new Map();
for (const evidence of sourceEvidence) {
  const rows = sourceEvidenceByLocation.get(evidence.bookLocationId) ?? [];
  rows.push(evidence);
  sourceEvidenceByLocation.set(evidence.bookLocationId, rows);
}

const boundaryDecisionByChapter = new Map();
for (const decision of boundaryDecisions) {
  for (const chapterId of decision.affectedChapters ?? []) boundaryDecisionByChapter.set(chapterId, decision.id);
}

const reviewItems = sourceClaims.map((claim) => {
  const location = locationById.get(claim.bookLocationId);
  const records = pageRecordsByLocation.get(claim.bookLocationId) ?? [];
  const evidenceRows = sourceEvidenceByLocation.get(claim.bookLocationId) ?? [];
  const boundaryDecisionId = location?.chapterId ? boundaryDecisionByChapter.get(location.chapterId) ?? null : null;
  const pageSpan = location?.pageSpan ?? null;

  return {
    id: `source-claim-review-${claim.id}`,
    schemaVersion: 'source-claim-review-item-v1',
    subject: book.subject,
    bookEditionId: book.bookEditionId,
    sourceClaimId: claim.id,
    bookLocationId: claim.bookLocationId,
    chapterId: location?.chapterId ?? null,
    sectionId: location?.sectionId ?? null,
    locationKind: location?.locationKind ?? null,
    pageSpan,
    pageRecordCount: records.length,
    sourceEvidenceCount: evidenceRows.length,
    boundaryDecisionId,
    currentReviewStatus: claim.reviewStatus,
    currentRuntimeEligible: claim.runtimeEligible === true,
    acceptanceAllowedByThisWorklist: false,
    runtimePromotionAllowed: false,
    requiredReviewerInputs: [
      'page_record_review',
      'evidence_ref_review',
      'source_atom',
      'visual_source_atom_when_figures_models_or_tables_matter',
      'claim_table_row',
      'quote_leak_check',
      'boundary_decision_review_when_applicable'
    ],
    requiredAcceptancePatchShape: {
      sourceClaimId: claim.id,
      reviewStatus: 'reviewed_not_runtime',
      runtimeEligible: false,
      evidenceRefs: ['existing evidence_ref ids only'],
      sourceAtomId: 'source-atom-*',
      visualSourceAtomIds: [],
      claimTableRowId: 'claim-table-*',
      reviewerId: 'human-or-agent-reviewer-id',
      reviewerDecision: 'accept_structure_only_or_request_fix',
      reviewedAt: 'ISO-8601 timestamp'
    },
    fatalBeforeAcceptance: [
      ...(records.length === 0 ? ['no_page_records_for_location'] : []),
      ...(evidenceRows.length === 0 ? ['no_source_evidence_for_location'] : []),
      ...(boundaryDecisionId ? ['boundary_decision_not_resolved_for_runtime'] : []),
      'no_raw_ocr_text_allowed_in_public_artifacts',
      'no_textbook_quote_allowed_in_public_student_copy',
      'no_runtime_promotion_without_new_release_data_order'
    ],
    nextNonRuntimeStep:
      boundaryDecisionId
        ? 'Resolve boundary decision from reviewed page records before runtime promotion.'
        : 'Review locator evidence and create neutral source_atom without textbook copying.'
  };
});

const worklist = {
  schemaVersion: 'source-claim-review-worklist-v1',
  generatedAt,
  subject: book.subject,
  bookEditionId: book.bookEditionId,
  sourceClaimCount: sourceClaims.length,
  bookLocationCount: bookLocations.length,
  pageRecordCount: pageRecords.length,
  sourceEvidenceCount: sourceEvidence.length,
  reviewItemCount: reviewItems.length,
  acceptedSourceClaims: sourceClaims.filter((claim) => claim.reviewStatus === 'accepted').length,
  runtimeEligibleSourceClaims: sourceClaims.filter((claim) => claim.runtimeEligible === true).length,
  acceptanceAllowedByThisWorklist: false,
  runtimePromotionAllowed: false,
  candidateGenerationAllowed: false,
  pixelBindingAllowed: false,
  status: 'blocked_review_worklist_only',
  fatalGates: [
    'no SourceClaim acceptance from this generator',
    'no runtime promotion from this generator',
    'no question generation',
    'no pixel binding',
    'no KV write',
    'no import apply'
  ],
  reviewItems
};

writeJson('lineage/source-claim-review-worklist.json', worklist);
writeMd(
  'reports/validation/source-claim-review-readiness.md',
  `# SourceClaim review readiness - Stella Biologi

Generated: ${generatedAt}

Status: \`blocked_review_worklist_only\`

| Artifact | Count |
|---|---:|
| SourceClaims | ${worklist.sourceClaimCount} |
| BookLocations | ${worklist.bookLocationCount} |
| Page records | ${worklist.pageRecordCount} |
| Source evidence rows | ${worklist.sourceEvidenceCount} |
| Review items | ${worklist.reviewItemCount} |
| Accepted SourceClaims | ${worklist.acceptedSourceClaims} |
| Runtime-eligible SourceClaims | ${worklist.runtimeEligibleSourceClaims} |

This worklist prepares human or agent review. It does not accept claims,
promote runtime evidence, generate questions, create pixel bindings, write KV or
apply imports.

Each SourceClaim review item requires page_record review, evidence_ref review,
neutral source_atom, optional visual_source_atom, claim_table row and leak check.
Boundary-linked items remain blocked for runtime until reviewed page records
resolve the boundary decision.
`,
);

console.log(JSON.stringify({
  ok: true,
  reviewItems: worklist.reviewItemCount,
  acceptedSourceClaims: worklist.acceptedSourceClaims,
  runtimePromotionAllowed: worklist.runtimePromotionAllowed
}, null, 2));
