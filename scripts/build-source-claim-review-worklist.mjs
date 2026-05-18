#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';

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
  const target = join(root, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeJsonl(rel, rows) {
  const target = join(root, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(
    target,
    rows.length === 0 ? '' : `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`,
    'utf8'
  );
}

function writeMd(rel, text) {
  const target = join(root, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text, 'utf8');
}

function hashFile(rel) {
  return createHash('sha256').update(readFileSync(join(root, rel))).digest('hex');
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

function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sourceIdFromSourceRef(sourceRef) {
  return sourceRef.replace(/^private-source:\/\/pdfer\/biologi\//, '').replace(/#book-page-\d+$/, '');
}

const physicalPageByKey = new Map();
const bookLocationPageLinks = [];
for (const record of pageRecords) {
  const sourceId = sourceIdFromSourceRef(record.sourceRef);
  const key = `${sourceId}:${record.bookPage}`;
  const physicalId = `physical-page-${slug(sourceId)}-s${record.bookPage}`;
  if (!physicalPageByKey.has(key)) {
    physicalPageByKey.set(key, {
      id: physicalId,
      schemaVersion: 'physical-page-record-v1',
      subject: book.subject,
      bookEditionId: book.bookEditionId,
      sourceId,
      bookPage: record.bookPage,
      sourceRef: record.sourceRef,
      pageRecordIds: [],
      containsRawOcr: false,
      containsPageImage: false,
      hashStatus: 'pending_private_review',
      runtimeEligible: false
    });
  }
  physicalPageByKey.get(key).pageRecordIds.push(record.id);
  bookLocationPageLinks.push({
    id: `book-location-page-link-${slug(record.bookLocationId)}-${physicalId}`,
    schemaVersion: 'book-location-page-link-v1',
    subject: book.subject,
    bookEditionId: book.bookEditionId,
    bookLocationId: record.bookLocationId,
    pageRecordId: record.id,
    physicalPageRecordId: physicalId,
    bookPage: record.bookPage,
    runtimeEligible: false
  });
}
const physicalPageRecords = [...physicalPageByKey.values()];
const physicalIdsByLocation = new Map();
for (const link of bookLocationPageLinks) {
  const rows = physicalIdsByLocation.get(link.bookLocationId) ?? [];
  rows.push(link.physicalPageRecordId);
  physicalIdsByLocation.set(link.bookLocationId, rows);
}
const evidenceRefs = physicalPageRecords.map((record) => ({
  id: `evidence-ref-${record.id}`,
  schemaVersion: 'evidence-ref-v1',
  subject: book.subject,
  bookEditionId: book.bookEditionId,
  physicalPageRecordId: record.id,
  sourceId: record.sourceId,
  bookPage: record.bookPage,
  pdfPage: null,
  zoneId: 'full-page-pending-zone-review',
  sourceRef: record.sourceRef,
  evidenceHash: null,
  hashStatus: 'pending_private_review',
  confidence: 'pending_review',
  containsRawOcr: false,
  containsPageImage: false,
  runtimeEligible: false
}));
const evidenceRefIdsByPhysicalId = new Map(
  evidenceRefs.map((evidenceRef) => [evidenceRef.physicalPageRecordId, evidenceRef.id])
);
const evidenceRefIdsByLocation = new Map();
for (const [bookLocationId, physicalIds] of physicalIdsByLocation) {
  evidenceRefIdsByLocation.set(
    bookLocationId,
    physicalIds.map((physicalId) => evidenceRefIdsByPhysicalId.get(physicalId)).filter(Boolean)
  );
}

const boundaryDecisionByChapter = new Map();
for (const decision of boundaryDecisions) {
  for (const chapterId of decision.affectedChapters ?? []) boundaryDecisionByChapter.set(chapterId, decision.id);
}

const allowedDecisionValues = ['reviewed_not_runtime', 'request_fix', 'reject'];

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
    pageRecordIds: records.map((record) => record.id),
    pageRecordCount: records.length,
    physicalPageRecordIds: physicalIdsByLocation.get(claim.bookLocationId) ?? [],
    evidenceRefIds: evidenceRefIdsByLocation.get(claim.bookLocationId) ?? [],
    sourceEvidenceIds: evidenceRows.map((evidence) => evidence.id),
    sourceEvidenceCount: evidenceRows.length,
    boundaryDecisionId,
    requiresBoundaryResolution: Boolean(boundaryDecisionId),
    currentReviewStatus: claim.reviewStatus,
    currentRuntimeEligible: claim.runtimeEligible === true,
    acceptanceAllowedByThisWorklist: false,
    runtimePromotionAllowed: false,
    candidateGenerationAllowed: false,
    pixelBindingAllowed: false,
    kvWriteAllowed: false,
    importApplyAllowed: false,
    safeActiveWriteAllowed: false,
    allowedDecisionValues,
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
      evidenceRefIds: ['existing evidence-ref-* ids only'],
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

const pageRecordReviewItems = bookLocations.map((location) => {
  const records = pageRecordsByLocation.get(location.id) ?? [];
  const evidenceRows = sourceEvidenceByLocation.get(location.id) ?? [];
  const boundaryDecisionId = boundaryDecisionByChapter.get(location.chapterId) ?? null;
  return {
    id: `page-record-review-${location.id.replace(/[^a-zA-Z0-9-]+/g, '-')}`,
    schemaVersion: 'page-record-review-item-v1',
    subject: book.subject,
    bookEditionId: book.bookEditionId,
    bookLocationId: location.id,
    chapterId: location.chapterId,
    sectionId: location.sectionId ?? null,
    locationKind: location.locationKind,
    pageSpan: location.pageSpan ?? null,
    pageRecordIds: records.map((record) => record.id),
    pageRecordCount: records.length,
    physicalPageRecordIds: physicalIdsByLocation.get(location.id) ?? [],
    evidenceRefIds: evidenceRefIdsByLocation.get(location.id) ?? [],
    sourceEvidenceIds: evidenceRows.map((evidence) => evidence.id),
    sourceEvidenceCount: evidenceRows.length,
    boundaryDecisionId,
    requiresBoundaryResolution: Boolean(boundaryDecisionId),
    reviewStatus: 'pending_review',
    acceptanceAllowedByThisWorklist: false,
    runtimePromotionAllowed: false,
    candidateGenerationAllowed: false,
    pixelBindingAllowed: false,
    kvWriteAllowed: false,
    importApplyAllowed: false,
    safeActiveWriteAllowed: false,
    allowedDecisionValues,
    requiredReviewerInputs: [
      'confirm page span belongs to this BookLocation',
      'confirm page records are locator-only and contain no OCR/page image',
      'confirm source evidence IDs match the page range',
      'record boundary resolution where applicable'
    ],
    requiredDecisionShape: {
      pageRecordReviewItemId: `page-record-review-${location.id.replace(/[^a-zA-Z0-9-]+/g, '-')}`,
      decision: 'reviewed_not_runtime',
      runtimeEligible: false,
      reviewedPageRecordIds: ['existing page-record-* ids only'],
      reviewerId: 'human-or-agent-reviewer-id',
      reviewedAt: 'ISO-8601 timestamp'
    },
    fatalBeforeAcceptance: [
      ...(records.length === 0 ? ['no_page_records_for_location'] : []),
      ...(evidenceRows.length === 0 ? ['no_source_evidence_for_location'] : []),
      ...(boundaryDecisionId ? ['boundary_decision_not_resolved_for_runtime'] : []),
      'no_raw_ocr_text_allowed_in_public_artifacts',
      'no_page_images_allowed_in_public_artifacts',
      'no_runtime_promotion_without_new_release_data_order'
    ]
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
  physicalPageRecordCount: physicalPageRecords.length,
  sourceEvidenceCount: sourceEvidence.length,
  reviewItemCount: reviewItems.length,
  reviewedNonRuntimeSourceClaims: sourceClaims.filter((claim) => claim.reviewStatus === 'reviewed_not_runtime').length,
  runtimeEligibleSourceClaims: sourceClaims.filter((claim) => claim.runtimeEligible === true).length,
  acceptanceAllowedByThisWorklist: false,
  runtimePromotionAllowed: false,
  candidateGenerationAllowed: false,
  pixelBindingAllowed: false,
  kvWriteAllowed: false,
  importApplyAllowed: false,
  safeActiveWriteAllowed: false,
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

const pageRecordWorklist = {
  schemaVersion: 'page-record-review-worklist-v1',
  generatedAt,
  subject: book.subject,
  bookEditionId: book.bookEditionId,
  bookLocationCount: bookLocations.length,
  pageRecordCount: pageRecords.length,
  physicalPageRecordCount: physicalPageRecords.length,
  sourceEvidenceCount: sourceEvidence.length,
  reviewItemCount: pageRecordReviewItems.length,
  acceptanceAllowedByThisWorklist: false,
  runtimePromotionAllowed: false,
  candidateGenerationAllowed: false,
  pixelBindingAllowed: false,
  kvWriteAllowed: false,
  importApplyAllowed: false,
  safeActiveWriteAllowed: false,
  status: 'blocked_review_worklist_only',
  fatalGates: [
    'no page record acceptance from this generator',
    'no boundary resolution from this generator',
    'no runtime promotion from this generator',
    'no KV write',
    'no import apply'
  ],
  reviewItems: pageRecordReviewItems
};

const atomicKpSourceWorklist = readJson('lineage/atomic-knowledge-point-worklist.json');
const atomicKpReviewItems = atomicKpSourceWorklist.workItems.flatMap((item) => {
  const slots = [];
  for (let index = 1; index <= item.plannedAtomicKnowledgePointQuota; index += 1) {
    const slot = String(index).padStart(3, '0');
    slots.push({
      id: `atomic-kp-review-${item.sectionId}-${slot}`,
      schemaVersion: 'atomic-kp-review-item-v1',
      subject: book.subject,
      bookEditionId: book.bookEditionId,
      chapterId: item.chapterId,
      sectionId: item.sectionId,
      bookLocationId: item.bookLocationId,
      sourcePlaceholderKnowledgePointId: item.sourcePlaceholderKnowledgePointId,
      sourceClaimIds: item.sourceClaimIds,
      slotNumber: index,
      reviewStatus: 'blocked_until_source_claim_reviewed',
      acceptanceAllowedByThisWorklist: false,
      runtimeImportAllowed: false,
      candidateGenerationAllowed: false,
      pixelBindingAllowed: false,
      kvWriteAllowed: false,
      importApplyAllowed: false,
      safeActiveWriteAllowed: false,
      requiredReviewerInputs: [
        'reviewed_not_runtime SourceClaim decision',
        'neutral source_atom row',
        'visual_source_atom when figures/models/tables matter',
        'narrow measurable student goal',
        'QKL role recommendation',
        'distractor rationale plan',
        'copyright and textbook-copy leak check'
      ],
      requiredAtomicKnowledgePointPatchShape: {
        id: `kp-biologi-${item.sectionId}-${slot}`,
        schemaVersion: 'knowledge-point-v1',
        subject: book.subject,
        bookEditionId: book.bookEditionId,
        bookLocationIds: [item.bookLocationId],
        sourceClaimIds: item.sourceClaimIds,
        sourceAtomIds: ['source-atom-*'],
        label: 'short public-safe Swedish label',
        studentGoal: 'narrow measurable goal in original wording',
        qklRole: 'core | support | extension',
        reviewStatus: 'candidate_review_required',
        runtimeEligible: false,
        pixelEligible: false
      },
      fatalBeforeAcceptance: [
        'no reviewed_not_runtime SourceClaims',
        'no reviewed source_atom records',
        'no public-safe student goal',
        'no QKL',
        'no safe-active metadata',
        'no runtime import or KV write order'
      ]
    });
  }
  return slots;
});

const atomicKpReviewWorklist = {
  schemaVersion: 'atomic-kp-review-worklist-v1',
  generatedAt,
  subject: book.subject,
  bookEditionId: book.bookEditionId,
  sourceWorkItemCount: atomicKpSourceWorklist.workItemCount,
  plannedAtomicKnowledgePointCount: atomicKpSourceWorklist.plannedAtomicKnowledgePointCount,
  reviewItemCount: atomicKpReviewItems.length,
  reviewedAtomicKnowledgePoints: 0,
  runtimeImportAllowed: false,
  candidateGenerationAllowed: false,
  pixelBindingAllowed: false,
  kvWriteAllowed: false,
  importApplyAllowed: false,
  safeActiveWriteAllowed: false,
  status: 'blocked_review_worklist_only',
  fatalGates: [
    'no SourceClaim review decisions',
    'no source atoms',
    'no visual source atoms',
    'no QKL',
    'no safe-active metadata',
    'no runtime import or KV write order'
  ],
  reviewItems: atomicKpReviewItems
};

writeJson('lineage/source-claim-review-worklist.json', worklist);
writeJson('lineage/page-record-review-worklist.json', pageRecordWorklist);
writeJson('lineage/atomic-kp-review-worklist.json', atomicKpReviewWorklist);
writeJsonl('lineage/physical-page-records.jsonl', physicalPageRecords);
writeJsonl('lineage/book-location-page-links.jsonl', bookLocationPageLinks);
writeJsonl('lineage/evidence-refs.jsonl', evidenceRefs);
writeJsonl('lineage/page-record-review-decisions.jsonl', []);
writeJsonl('lineage/source-claim-review-decisions.jsonl', []);
writeJsonl('lineage/source-atoms.jsonl', []);
writeJsonl('lineage/visual-source-atoms.jsonl', []);
writeJsonl('lineage/claim-table.jsonl', []);
writeJsonl('lineage/atomic-knowledge-points.jsonl', []);
writeJsonl('lineage/atomic-kp-review-decisions.jsonl', []);
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
| Physical page records | ${worklist.physicalPageRecordCount} |
| Source evidence rows | ${worklist.sourceEvidenceCount} |
| Review items | ${worklist.reviewItemCount} |
| Reviewed non-runtime SourceClaims | ${worklist.reviewedNonRuntimeSourceClaims} |
| Runtime-eligible SourceClaims | ${worklist.runtimeEligibleSourceClaims} |

This worklist prepares human or agent review. It does not accept claims for
production, promote runtime evidence, generate questions, create pixel bindings,
write KV or apply imports.

Each SourceClaim review item requires page_record review, evidence_ref review,
boundary resolution when needed and leak check. After a SourceClaim has a
\`reviewed_not_runtime\` decision, the next lineage step may create neutral
\`source_atom\`, optional \`visual_source_atom\` and \`claim_table\` rows. Those rows
are still public-safe, non-runtime review artifacts, not production evidence.
Boundary-linked items remain blocked for runtime until reviewed page records
resolve the boundary decision.

Each item now includes explicit \`pageRecordIds\`, \`sourceEvidenceIds\`,
\`requiresBoundaryResolution\` and allowed non-runtime reviewer decisions:
\`${allowedDecisionValues.join(' | ')}\`.
`,
);
writeMd(
  'reports/validation/page-record-review-readiness.md',
  `# PageRecord review readiness - Stella Biologi

Generated: ${generatedAt}

Status: \`blocked_review_worklist_only\`

| Artifact | Count |
|---|---:|
| BookLocations | ${pageRecordWorklist.bookLocationCount} |
| Page records | ${pageRecordWorklist.pageRecordCount} |
| Physical page records | ${pageRecordWorklist.physicalPageRecordCount} |
| Source evidence rows | ${pageRecordWorklist.sourceEvidenceCount} |
| Review items | ${pageRecordWorklist.reviewItemCount} |

This worklist groups locator-only page records by BookLocation and also writes
one \`physical-page-record\` per unique private source page, plus a link table
from BookLocation to physical page. Review may confirm structure and boundary
handling, but it cannot promote runtime evidence, write KV, apply imports,
generate questions or bind pixels.
`,
);
writeMd(
  'reports/validation/source-atom-readiness.md',
  `# Source atom readiness - Stella Biologi

Generated: ${generatedAt}

Status: \`blocked_empty_until_review\`

The tracked atom ledgers are intentionally empty:

- \`lineage/source-atoms.jsonl\`
- \`lineage/visual-source-atoms.jsonl\`
- \`lineage/claim-table.jsonl\`
- \`lineage/source-claim-review-decisions.jsonl\`

Atoms must be neutral, public-safe, reviewer-authored summaries linked to
reviewed non-runtime locator evidence. They must not contain raw OCR, long
textbook quotes, student data, KV data or absolute local paths.
`,
);
writeMd(
  'reports/validation/atomic-kp-review-readiness.md',
  `# Atomic KnowledgePoint review readiness - Stella Biologi

Generated: ${generatedAt}

Status: \`blocked_review_worklist_only\`

| Artifact | Count |
|---|---:|
| Section work items | ${atomicKpReviewWorklist.sourceWorkItemCount} |
| Planned atomic KP slots | ${atomicKpReviewWorklist.plannedAtomicKnowledgePointCount} |
| Review items | ${atomicKpReviewWorklist.reviewItemCount} |
| Reviewed atomic KPs | 0 |

The review worklist expands the planning quota into individual atomic KP slots.
It still blocks runtime import, question generation and pixel binding until
SourceClaims, source atoms, QKL and safe-active metadata are reviewed.
`,
);

const contractHashInputs = [
  'manifest/book-edition.json',
  'manifest/toc.json',
  'manifest/source-policy.json',
  'manifest/rotation-contract.json',
  'manifest/source-inventory.json',
  'manifest/edition-registry.json',
  'manifest/ocr-run-contract.json',
  'lineage/book-locations.jsonl',
  'lineage/source-claims.jsonl',
  'lineage/knowledge-point-candidates.jsonl',
  'lineage/atomic-knowledge-point-worklist.json',
  'lineage/source-claim-review-worklist.json',
  'lineage/page-record-review-worklist.json',
  'lineage/atomic-kp-review-worklist.json',
  'lineage/page-records.jsonl',
  'lineage/physical-page-records.jsonl',
  'lineage/book-location-page-links.jsonl',
  'lineage/evidence-refs.jsonl',
  'lineage/source-evidence.jsonl',
  'lineage/section-boundary-decisions.jsonl',
  'lineage/page-record-review-decisions.jsonl',
  'lineage/source-claim-review-decisions.jsonl',
  'lineage/source-atoms.jsonl',
  'lineage/visual-source-atoms.jsonl',
  'lineage/claim-table.jsonl',
  'lineage/atomic-knowledge-points.jsonl',
  'lineage/atomic-kp-review-decisions.jsonl',
  'questions/intake-candidates.jsonl',
  'questions/intake-contract.json',
  'questions/intake-worklist.json',
  'assets/pixel-briefs/pixel-brief-template.json',
  'schemas/source-claim.schema.json',
  'schemas/page-record.schema.json',
  'schemas/physical-page-record.schema.json',
  'schemas/evidence-ref.schema.json',
  'schemas/source-atom.schema.json',
  'schemas/visual-source-atom.schema.json',
  'schemas/claim-table-row.schema.json',
  'schemas/atomic-knowledge-point.schema.json'
];
writeJson('reports/validation/generated-contract-hashes.json', {
  schemaVersion: 'generated-contract-hashes-v1',
  generatedAt,
  subject: book.subject,
  bookEditionId: book.bookEditionId,
  fileCount: contractHashInputs.length,
  files: contractHashInputs.map((rel) => ({ rel, sha256: hashFile(rel) }))
});

console.log(JSON.stringify({
  ok: true,
  reviewItems: worklist.reviewItemCount,
  pageRecordReviewItems: pageRecordWorklist.reviewItemCount,
  atomicKpReviewItems: atomicKpReviewWorklist.reviewItemCount,
  reviewedNonRuntimeSourceClaims: worklist.reviewedNonRuntimeSourceClaims,
  runtimePromotionAllowed: worklist.runtimePromotionAllowed
}, null, 2));
