#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join } from 'node:path';

const root = process.cwd();
const strictPublicSafety = process.argv.includes('--strict-public-safety');
const baseRequiredFiles = [
  '.gitignore',
  'manifest/book-edition.json',
  'manifest/toc.json',
  'manifest/source-policy.json',
  'manifest/rotation-contract.json',
  'manifest/source-inventory.json',
  'manifest/edition-registry.json',
  'manifest/private-source-registry.md',
  'manifest/ocr-run-contract.json',
  'lineage/book-locations.jsonl',
  'lineage/source-claims.jsonl',
  'lineage/knowledge-point-candidates.jsonl',
  'lineage/atomic-knowledge-point-worklist.json',
  'lineage/source-claim-review-worklist.json',
  'lineage/page-record-review-worklist.json',
  'lineage/atomic-kp-review-worklist.json',
  'lineage/README.md',
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
  'assets/pixel-briefs/README.md',
  'assets/pixel-briefs/pixel-brief-template.json',
  'schemas/book-edition.schema.json',
  'schemas/toc.schema.json',
  'schemas/book-location.schema.json',
  'schemas/source-claim.schema.json',
  'schemas/page-record.schema.json',
  'schemas/physical-page-record.schema.json',
  'schemas/evidence-ref.schema.json',
  'schemas/knowledge-point-candidate.schema.json',
  'schemas/source-atom.schema.json',
  'schemas/visual-source-atom.schema.json',
  'schemas/claim-table-row.schema.json',
  'schemas/atomic-knowledge-point.schema.json',
  'schemas/question-intake-candidate.schema.json',
  'reports/validation/ocr-contract-summary.md',
  'reports/validation/page-boundary-conflicts.md',
  'reports/validation/ocr-agent-worklist.json',
  'reports/validation/pixel-readiness-gates.md',
  'reports/validation/question-intake-readiness.md',
  'reports/validation/atomic-kp-readiness.md',
  'reports/validation/page-record-review-readiness.md',
  'reports/validation/source-atom-readiness.md',
  'reports/validation/atomic-kp-review-readiness.md',
  'reports/validation/rotation-readiness.md',
  'reports/validation/page-coverage-matrix.md',
  'reports/validation/public-safety-audit.md',
  'reports/validation/repo-data-safety-blockers.md',
  'reports/validation/source-lineage-review.md',
  'reports/validation/source-claim-review-readiness.md',
  'reports/validation/ocr-quality-report.md',
  'reports/validation/no-runtime-before-ocr.md',
  'docs/ocr-agent-runbook.md',
  'scripts/build-question-intake-worklist.mjs',
  'scripts/validate-question-intake-worklist.mjs',
  'scripts/validate-question-intake-candidates.mjs',
  'scripts/build-atomic-kp-worklist.mjs',
  'scripts/validate-atomic-kp-worklist.mjs',
  'scripts/build-source-claim-review-worklist.mjs',
  'scripts/validate-source-claim-review-worklist.mjs',
  'scripts/validate-page-record-review-worklist.mjs',
  'scripts/validate-page-record-review-decisions.mjs',
  'scripts/validate-source-claim-review-decisions.mjs',
  'scripts/validate-source-atoms.mjs',
  'scripts/validate-atomic-knowledge-points.mjs',
  'scripts/validate-atomic-kp-review-worklist.mjs',
  'scripts/sanitize-handoff.mjs'
];
const errors = [];
const warnings = [];
const leakPatterns = [/C:\\/i, /C:\//i, /\bOneDrive\b/i, /\bSkrivbord\b/i, /\/home\/user\/workspace/i, /rawOcrText/i, /rawOcrExcerpt/i, /studentPin/i, /cookie\s*=/i, /set-cookie/i, /upstash/i, /indexering\/[A-Z0-9_]+\.md/i];
const scannerToolFiles = new Set([
  'scripts/validate-ocr-contract.mjs',
  'scripts/validate-question-intake-worklist.mjs',
  'scripts/validate-question-intake-candidates.mjs',
  'scripts/validate-atomic-kp-worklist.mjs',
  'scripts/validate-source-claim-review-worklist.mjs',
  'scripts/validate-page-record-review-worklist.mjs',
  'scripts/validate-page-record-review-decisions.mjs',
  'scripts/validate-source-claim-review-decisions.mjs',
  'scripts/validate-source-atoms.mjs',
  'scripts/validate-atomic-knowledge-points.mjs',
  'scripts/validate-atomic-kp-review-worklist.mjs',
  'scripts/sanitize-handoff.mjs'
]);
const privateArtifactDirs = new Set(['page_renders', 'ocr_data', 'margin_samples', 'private-source-local']);
const validStatuses = new Set(['indexed', 'indexed_with_page_gap', 'indexed_with_boundary_conflict', 'pending_ocr_index', 'public_sample']);

function readText(rel) {
  return readFileSync(join(root, rel), 'utf8').replace(/^\uFEFF/, '');
}
function readJson(rel) {
  return JSON.parse(readText(rel));
}
function readJsonl(rel) {
  const text = readText(rel).trim();
  if (!text) return [];
  return text.split(/\r?\n/).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { errors.push(`${rel}: invalid JSONL line ${index + 1}: ${error.message}`); return null; }
  }).filter(Boolean);
}
function scanText(label, text, severity = 'error') {
  for (const pattern of leakPatterns) {
    if (pattern.test(text)) {
      const message = `private/leaky token in ${label}: ${pattern}`;
      if (severity === 'warning') warnings.push(message);
      else errors.push(message);
    }
  }
}
function scanRepositoryText(dir, rel = '') {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === '.firecrawl' || entry.name === 'node_modules' || privateArtifactDirs.has(entry.name)) continue;
    const abs = join(dir, entry.name);
    const childRel = rel ? rel + '/' + entry.name : entry.name;
    if (entry.isDirectory()) scanRepositoryText(abs, childRel);
    else if (new Set(['.md', '.json', '.jsonl', '.mjs', '.js', '.ts', '.py', '.csv', '.txt']).has(extname(entry.name).toLowerCase())) {
      if (scannerToolFiles.has(childRel)) continue;
      scanText(childRel, readFileSync(abs, 'utf8'), 'warning');
    }
  }
}
function hasTrackedFilesUnder(rel) {
  try {
    return execFileSync('git', ['ls-files', rel], { cwd: root, encoding: 'utf8' }).trim().length > 0;
  } catch {
    return existsSync(join(root, rel));
  }
}
function isGitIgnored(rel) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', '--', rel], { cwd: root });
    return true;
  } catch {
    return false;
  }
}
function runValidator(rel) {
  try {
    execFileSync(process.execPath, [rel], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    const detail = String(error.stdout || error.stderr || error.message || '').trim();
    errors.push(`${rel} failed${detail ? `: ${detail}` : ''}`);
  }
}

for (const rel of baseRequiredFiles) {
  if (!existsSync(join(root, rel))) errors.push(`missing required file: ${rel}`);
}
let book = null;
if (existsSync(join(root, 'manifest/book-edition.json'))) {
  book = readJson('manifest/book-edition.json');
  if (book.subject === 'fysik' && !existsSync(join(root, 'public-sources/stella-fysik-official-toc.md'))) errors.push('missing required physics public source evidence');
  if (book.subject === 'biologi' && !existsSync(join(root, 'reports/validation/repo-data-safety-blockers.md'))) warnings.push('biology repo has no explicit repo-data-safety blocker report');
}
for (const rel of baseRequiredFiles.filter((file) => existsSync(join(root, file)) && !scannerToolFiles.has(file))) scanText(rel, readText(rel));
for (const dir of ['page_renders', 'ocr_data', 'margin_samples']) {
  if (hasTrackedFilesUnder(dir)) warnings.push(`legacy artifact directory tracked and not public-safe by itself: ${dir}`);
}
if (hasTrackedFilesUnder('indexering')) warnings.push('OCR-derived indexering files are tracked; move them to private-source-local before public handoff');
if (strictPublicSafety) {
  for (const rel of ['indexering/', 'private-source-local/', 'page_renders/', 'ocr_data/', 'margin_samples/', '.firecrawl/']) {
    if (!isGitIgnored(rel)) warnings.push(`private/OCR workspace path is not gitignored: ${rel}`);
  }
}
scanRepositoryText(root);
if (strictPublicSafety && warnings.length > 0) errors.push(...warnings.map((warning) => `strict-public-safety: ${warning}`));

if (errors.length === 0 && book) {
  const toc = readJson('manifest/toc.json');
  const rotation = readJson('manifest/rotation-contract.json');
  const sourceInventory = readJson('manifest/source-inventory.json');
  const editionRegistry = readJson('manifest/edition-registry.json');
  const ocrRunContract = readJson('manifest/ocr-run-contract.json');
  const intake = readJson('questions/intake-contract.json');
  const pixelBrief = readJson('assets/pixel-briefs/pixel-brief-template.json');
  const worklist = readJson('reports/validation/ocr-agent-worklist.json');
  const locations = readJsonl('lineage/book-locations.jsonl');
  const claims = readJsonl('lineage/source-claims.jsonl');
  const kpCandidates = readJsonl('lineage/knowledge-point-candidates.jsonl');
  const atomicKpWorklist = readJson('lineage/atomic-knowledge-point-worklist.json');
  const sourceClaimReviewWorklist = readJson('lineage/source-claim-review-worklist.json');
  const pageRecordReviewWorklist = readJson('lineage/page-record-review-worklist.json');
  const atomicKpReviewWorklist = readJson('lineage/atomic-kp-review-worklist.json');
  const sourceAtoms = readJsonl('lineage/source-atoms.jsonl');
  const visualSourceAtoms = readJsonl('lineage/visual-source-atoms.jsonl');
  const claimTable = readJsonl('lineage/claim-table.jsonl');
  const physicalPageRecords = readJsonl('lineage/physical-page-records.jsonl');
  const evidenceRefs = readJsonl('lineage/evidence-refs.jsonl');
  const bookLocationPageLinks = readJsonl('lineage/book-location-page-links.jsonl');
  const sourceClaimReviewDecisions = readJsonl('lineage/source-claim-review-decisions.jsonl');
  const pageRecordReviewDecisions = readJsonl('lineage/page-record-review-decisions.jsonl');
  const atomicKnowledgePoints = readJsonl('lineage/atomic-knowledge-points.jsonl');
  const atomicKpReviewDecisions = readJsonl('lineage/atomic-kp-review-decisions.jsonl');
  const requiredBookFields = ['subject', 'sourceFamily', 'bookId', 'bookEditionId', 'publisher', 'editionYear', 'isbn', 'ocrSourceHash', 'pageMapHash', 'tocStatus', 'licenseScope', 'rotationPolicy'];
  for (const field of requiredBookFields) if (book[field] === undefined || book[field] === null || book[field] === '') errors.push(`book-edition missing ${field}`);
  if (toc.bookEditionId !== book.bookEditionId) errors.push('toc.bookEditionId does not match book edition');
  for (const [label, doc] of [['rotation', rotation], ['sourceInventory', sourceInventory], ['ocrRunContract', ocrRunContract], ['intake', intake], ['pixelBrief', pixelBrief], ['worklist', worklist], ['atomicKpWorklist', atomicKpWorklist], ['sourceClaimReviewWorklist', sourceClaimReviewWorklist], ['pageRecordReviewWorklist', pageRecordReviewWorklist], ['atomicKpReviewWorklist', atomicKpReviewWorklist]]) {
    if (doc.subject !== book.subject) errors.push(`${label}.subject does not match book edition`);
    if (doc.bookEditionId !== book.bookEditionId) errors.push(`${label}.bookEditionId does not match book edition`);
  }
  if (!Array.isArray(editionRegistry.editions) || !editionRegistry.editions.some((edition) => edition.bookEditionId === book.bookEditionId && edition.isActiveForImport === false)) errors.push('edition registry must include inactive current BookEdition');
  if (rotation.activationGates?.runtimeQuestionsAllowed !== false) errors.push('rotation must block runtime questions');
  if (rotation.activationGates?.kvWriteAllowed !== false) errors.push('rotation must block KV writes');
  if (ocrRunContract.runtimeWriteAllowed !== false) errors.push('OCR run contract must block runtime writes');
  if (sourceInventory.publicSafe !== true) errors.push('sourceInventory.publicSafe must be true for the tracked sanitized handoff');
  for (const source of sourceInventory.sources ?? []) {
    if (source.trackedLegacyDerivedArtifactsPresent !== false) errors.push(`sourceInventory source still marks tracked legacy artifacts present: ${source.sourceId}`);
  }
  if ((sourceInventory.blockers ?? []).some((blocker) => /tracked derived artifacts must be purged|public-safety blocker remains/i.test(blocker))) errors.push('sourceInventory still contains stale tracked-artifact public-safety blocker text');
  if (intake.runtimeImportAllowed !== false) errors.push('question intake must block runtime import');
  if (intake.candidateGenerationAllowed !== false) errors.push('question intake must block candidate generation');
  if (atomicKpWorklist.runtimeImportAllowed !== false) errors.push('atomic KP worklist must block runtime import');
  if (atomicKpWorklist.candidateGenerationAllowed !== false) errors.push('atomic KP worklist must block candidate generation');
  if (atomicKpWorklist.pixelBindingAllowed !== false) errors.push('atomic KP worklist must block pixel binding');
  if (sourceClaimReviewWorklist.acceptanceAllowedByThisWorklist !== false) errors.push('source-claim review worklist must block direct acceptance');
  if (sourceClaimReviewWorklist.runtimePromotionAllowed !== false) errors.push('source-claim review worklist must block runtime promotion');
  if (sourceClaimReviewWorklist.candidateGenerationAllowed !== false) errors.push('source-claim review worklist must block candidate generation');
  if (sourceClaimReviewWorklist.reviewItemCount !== claims.length) errors.push('source-claim review worklist item count must match SourceClaim count');
  if (pageRecordReviewWorklist.runtimePromotionAllowed !== false) errors.push('page-record review worklist must block runtime promotion');
  if (pageRecordReviewWorklist.candidateGenerationAllowed !== false) errors.push('page-record review worklist must block candidate generation');
  if (pageRecordReviewWorklist.reviewItemCount !== locations.length) errors.push('page-record review worklist item count must match BookLocation count');
  if (atomicKpReviewWorklist.runtimeImportAllowed !== false) errors.push('atomic KP review worklist must block runtime import');
  if (atomicKpReviewWorklist.candidateGenerationAllowed !== false) errors.push('atomic KP review worklist must block candidate generation');
  if (atomicKpReviewWorklist.pixelBindingAllowed !== false) errors.push('atomic KP review worklist must block pixel binding');
  if (atomicKpReviewWorklist.reviewItemCount !== atomicKpWorklist.plannedAtomicKnowledgePointCount) errors.push('atomic KP review item count must match planned atomic KP count');
  if (physicalPageRecords.length === 0) errors.push('physical page records must be generated');
  if (evidenceRefs.length !== physicalPageRecords.length) errors.push('evidence-ref count must match physical page records');
  if (bookLocationPageLinks.length !== pageRecordReviewWorklist.pageRecordCount) errors.push('BookLocation page link count must match page record count');
  if (atomicKpReviewDecisions.length !== 0) errors.push('atomic KP review decisions must remain empty in this handoff');
  if (pixelBrief.runtimeAssetAllowed !== false) errors.push('pixel brief must block runtime assets');
  if (worklist.runtimeActivationAllowed !== false) errors.push('OCR worklist must block runtime activation');
  if (!Array.isArray(toc.chapters) || toc.chapters.length === 0) errors.push('toc has no chapters');
  const chapterIds = new Set();
  const locationIds = new Set();
  const locationById = new Map();
  const evidenceRefIds = new Set(evidenceRefs.map((evidenceRef) => evidenceRef.id));
  for (const chapter of toc.chapters ?? []) {
    if (chapterIds.has(chapter.chapterId)) errors.push(`duplicate chapterId ${chapter.chapterId}`);
    chapterIds.add(chapter.chapterId);
    if (!validStatuses.has(chapter.status)) errors.push(`invalid chapter status ${chapter.chapterId}: ${chapter.status}`);
    if (chapter.pageSpan && chapter.pageSpan.start > chapter.pageSpan.end) errors.push(`invalid page span in ${chapter.chapterId}`);
    for (const section of chapter.subchapters ?? []) {
      if (!validStatuses.has(section.status)) errors.push(`invalid section status ${section.sectionId}: ${section.status}`);
      if (section.pageSpan && section.pageSpan.start > section.pageSpan.end) errors.push(`invalid page span in ${section.sectionId}`);
    }
  }
  for (const loc of locations) {
    if (locationIds.has(loc.id)) errors.push(`duplicate BookLocation id ${loc.id}`);
    locationIds.add(loc.id);
    locationById.set(loc.id, loc);
    if (loc.bookEditionId !== book.bookEditionId) errors.push(`BookLocation wrong bookEditionId: ${loc.id}`);
  }
  const claimIds = new Set();
  for (const claim of claims) {
    claimIds.add(claim.id);
    if (!locationIds.has(claim.bookLocationId)) errors.push(`SourceClaim references missing BookLocation: ${claim.id}`);
    if (!Array.isArray(claim.evidenceRefIds) || claim.evidenceRefIds.length === 0) errors.push(`SourceClaim lacks evidenceRefIds: ${claim.id}`);
    for (const evidenceRefId of claim.evidenceRefIds ?? []) if (!evidenceRefIds.has(evidenceRefId)) errors.push(`SourceClaim references missing evidence-ref: ${claim.id} -> ${evidenceRefId}`);
    if (claim.reviewStatus === 'accepted' && (!Array.isArray(claim.evidenceRefs) || claim.evidenceRefs.length === 0)) errors.push(`accepted SourceClaim lacks evidenceRefs: ${claim.id}`);
    if (claim.runtimeEligible === true && claim.reviewStatus !== 'accepted') errors.push(`runtime-eligible claim is not accepted: ${claim.id}`);
    if (locationById.get(claim.bookLocationId)?.status === 'public_sample' && (claim.reviewStatus === 'accepted' || claim.runtimeEligible === true)) errors.push(`public_sample SourceClaim cannot be accepted/runtime: ${claim.id}`);
  }
  for (const kp of kpCandidates) {
    if (!locationIds.has(kp.bookLocationId)) errors.push(`KP candidate references missing BookLocation: ${kp.id}`);
    if (!Array.isArray(kp.sourceClaimIds) || kp.sourceClaimIds.length === 0) errors.push(`KP candidate lacks SourceClaim link: ${kp.id}`);
    for (const sourceClaimId of kp.sourceClaimIds ?? []) if (!claimIds.has(sourceClaimId)) errors.push(`KP candidate references missing SourceClaim: ${kp.id} -> ${sourceClaimId}`);
    if (kp.pixelEligible === true && kp.status !== 'accepted') errors.push(`pixel-eligible KP candidate is not accepted: ${kp.id}`);
  }
  if (locations.length === 0) errors.push('no BookLocations generated');
  if (claims.length === 0) warnings.push('no SourceClaims generated');
}
runValidator('scripts/validate-page-record-review-decisions.mjs');
runValidator('scripts/validate-source-claim-review-decisions.mjs');
runValidator('scripts/validate-source-atoms.mjs');
runValidator('scripts/validate-atomic-kp-review-worklist.mjs');
runValidator('scripts/validate-atomic-knowledge-points.mjs');
runValidator('scripts/validate-question-intake-worklist.mjs');
runValidator('scripts/validate-question-intake-candidates.mjs');
const publicSafetyOk = !warnings.some((warning) => warning.includes('not public-safe') || warning.includes('private/leaky token'));
console.log(JSON.stringify({
  ok: errors.length === 0,
  contractOk: errors.length === 0,
  publicSafetyOk,
  runtimeReady: false,
  strictPublicSafety,
  readiness: publicSafetyOk ? 'contract-valid-content-pending' : 'contract-valid-public-safety-blocked',
  errors,
  warnings
}, null, 2));
if (errors.length > 0) process.exit(1);
