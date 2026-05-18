#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const subject = 'biologi';
const bookEditionId = 'bookedition-stella-biologi-ocr-v1';
const targetCandidateCount = 1200;
const allowedCandidateStatuses = new Set(['candidate_review_required']);
const allowedActivationReviewStatuses = new Set(['not_reviewed']);
const allowedFormats = new Set(['multiple_choice']);
const allowedQklLinkTypes = new Set(['primary', 'supporting']);
const allowedRuntimeTypes = new Set([
  'analys',
  'begrepp',
  'ber\u00e4kning',
  'faktagrund',
  'flerval',
  'forklara',
  'formel',
  'forstaelse',
  'f\u00f6rst\u00e5else',
  'j\u00e4mf\u00f6relse',
  'koppla-till-omv\u00e4rld',
  'k\u00e4llkritik',
  'laborativ',
  'mcq',
  'mcq_visual',
  'metakognition',
  'metod',
  'misconception',
  'modell',
  'process',
  'resonemang',
  'samband',
  'singapore-combination',
  'singapore-graph-mcq',
  'singapore-single-visual',
  'singapore-single-visual-mcq',
  'singapore-statement-visual-mcq',
  'singapore-table',
  'singapore-table-mcq',
  'tillampning',
  'till\u00e4mpning'
]);
const candidateFields = new Set([
  'id',
  'subject',
  'bookEditionId',
  'chapterCode',
  'status',
  'activationReviewStatus',
  'format',
  'studentStem',
  'options',
  'correctOptionId',
  'distractorRationales',
  'solution',
  'publicSanitizedSourceSummary',
  'bookLocationIds',
  'sourceClaimIds',
  'knowledgePointIds',
  'questionKnowledgeLinks',
  'runtimeProjection',
  'difficultyLevel',
  'enabledLevels',
  'skillTags',
  'abilityTags',
  'techniqueTags',
  'metadataCompleteness',
  'contentHash',
  'importBatchId',
  'createdFromSourceId',
  'validationReport',
  'reviewStatus'
]);
const requiredCandidateFields = [
  'id',
  'subject',
  'bookEditionId',
  'chapterCode',
  'status',
  'activationReviewStatus',
  'format',
  'studentStem',
  'options',
  'correctOptionId',
  'distractorRationales',
  'solution',
  'publicSanitizedSourceSummary',
  'bookLocationIds',
  'sourceClaimIds',
  'knowledgePointIds',
  'questionKnowledgeLinks',
  'runtimeProjection',
  'difficultyLevel',
  'enabledLevels',
  'skillTags',
  'abilityTags',
  'techniqueTags',
  'metadataCompleteness',
  'contentHash',
  'importBatchId',
  'createdFromSourceId',
  'validationReport',
  'reviewStatus'
];
const requiredMetadataChecks = [
  'bookLocationIds',
  'sourceClaimIds',
  'knowledgePointIds',
  'studentStem',
  'options',
  'correctOptionId',
  'distractorRationales',
  'solution',
  'publicSanitizedSourceSummary',
  'questionKnowledgeLinks',
  'runtimeProjection',
  'qklReviewRequired'
];
const requiredFalseValidationReportKeys = [
  'runtimeDataChanged',
  'runtimeWriteAllowed',
  'runtimePromotionAllowed',
  'candidateGenerationAllowed',
  'canImportAsActive',
  'canImportAsDraft',
  'activationAllowed',
  'runtimeActivationAllowed',
  'runtimeImportAllowed',
  'importApplyAllowed',
  'kvWriteAllowed',
  'safeActiveWriteAllowed',
  'pixelBindingAllowed',
  'pixelWriteAllowed',
  'productionDeployAllowed'
];
const validationReportFields = new Set([...requiredFalseValidationReportKeys, 'requiredBeforeActive']);
const metadataCompletenessFields = new Set(['checks']);
const metadataCheckFields = new Set(requiredMetadataChecks);
const runtimeProjectionFields = new Set(['typ', 'niva', 'delkapitel', 'stella', 'visual', 'visualAlt', 'bildtext', 'fallback']);
const optionFields = new Set(['id', 'text']);
const distractorRationaleFields = new Set(['optionId', 'rationale']);
const qklFields = new Set(['questionId', 'knowledgePointId', 'linkType', 'weight']);
const forbiddenTrueKeys = new Set([
  'runtimeEligible',
  'safeActive',
  'active',
  'enabledForStudents',
  'importAllowed',
  'runtimeImportAllowed',
  'kvWriteAllowed',
  'importApplyAllowed',
  'candidateGenerationAllowed',
  'runtimeDataChanged',
  'activationAllowed',
  'runtimeActivationAllowed',
  'runtimeWriteAllowed',
  'runtimePromotionAllowed',
  'canImportAsActive',
  'canImportAsDraft',
  'safeActiveWriteAllowed',
  'productionDeployAllowed',
  'deployAllowed',
  'deploy',
  'shouldBeActive',
  'pixelEligible',
  'pixelBindingAllowed',
  'pixelWriteAllowed'
]);
const forbiddenPublicValuePatterns = [
  /private-source:\/\//i,
  /[A-Z]:[\\/]+Users[\\/]+/i,
  /\bOneDrive\b|\bSkrivbord\b/i,
  /raw_ocr_text|raw_ocr_excerpt|rawOcrText|rawOcrExcerpt|rawText/i,
  /student[_-]?id|student[_-]?name|student_pin|studentPin|pinCode|\bPIN\b|elev\s*[=:]|elevId|elevNamn|loginId|klassId|\blogin\s*[=:]|\bklass\s*[=:]/i,
  /set-cookie|cookie/i,
  /kvKey|KV key|UPSTASH|KV_REST|kv:/i
];

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
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${rel}:${index + 1}: ${error.message}`);
    }
  });
}

function runJsonValidator(rel) {
  try {
    return JSON.parse(execFileSync(process.execPath, [rel], { cwd: root, encoding: 'utf8', stdio: 'pipe' }));
  } catch (error) {
    const detail = String(error.stdout || error.stderr || error.message || '').trim();
    assert.fail(`${rel} failed${detail ? `: ${detail}` : ''}`);
  }
}

function asRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function asString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter((item) => item.length > 0)
    : [];
}

function statusValues(row) {
  return ['status', 'reviewStatus', 'decisionStatus', 'decision']
    .map((key) => asString(row[key]))
    .filter(Boolean)
    .map((value) => value.toLowerCase());
}

function isReviewedNotRuntime(row) {
  const values = statusValues(row);
  return values.length > 0 && values.every((value) => value === 'reviewed_not_runtime');
}

function scanNoLeaks(label, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const pattern of forbiddenPublicValuePatterns) {
    assert.equal(pattern.test(text), false, `${label} contains forbidden text: ${pattern}`);
  }
}

function assertNoUnknownFields(row, allowedFields, label) {
  const unknownFields = Object.keys(row).filter((field) => !allowedFields.has(field));
  assert.equal(unknownFields.length, 0, `${label}: unknown fields ${unknownFields.join(', ')}`);
}

function assertIdentifier(value, label, { prefix = null, allowColon = false, maxLength = 180 } = {}) {
  assert.equal(typeof value, 'string', `${label}: must be a string`);
  assert.ok(value.length > 0 && value.length <= maxLength, `${label}: invalid length`);
  const pattern = allowColon ? /^[A-Za-z0-9][A-Za-z0-9._:-]*$/ : /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  assert.match(value, pattern, `${label}: must be a short identifier`);
  if (prefix) assert.ok(value.startsWith(prefix), `${label}: must start with ${prefix}`);
}

function assertIdentifierArray(value, label, { prefix = null, allowColon = false, minItems = 1, maxItems = 20 } = {}) {
  assert.ok(Array.isArray(value), `${label}: must be an array`);
  assert.ok(value.length >= minItems && value.length <= maxItems, `${label}: invalid item count`);
  const seen = new Set();
  for (const item of value) {
    assertIdentifier(item, `${label} item`, { prefix, allowColon });
    assert.equal(seen.has(item), false, `${label}: duplicate identifier ${item}`);
    seen.add(item);
  }
}

function assertPublicText(value, label, { minLength, maxLength }) {
  assert.equal(typeof value, 'string', `${label}: must be a string`);
  assert.equal(value.trim(), value, `${label}: must not have surrounding whitespace`);
  assert.ok(value.length >= minLength && value.length <= maxLength, `${label}: invalid length`);
  assert.equal(/[\r\n]/.test(value), false, `${label}: must be a single line`);
  scanNoLeaks(label, value);
}

function assertUniqueStringArray(value, label, { minItems = 1, maxItems = 24 } = {}) {
  assert.ok(Array.isArray(value), `${label}: must be an array`);
  assert.ok(value.length >= minItems && value.length <= maxItems, `${label}: invalid item count`);
  const seen = new Set();
  for (const item of value) {
    assert.equal(typeof item, 'string', `${label}: every item must be a string`);
    assert.ok(item.trim().length > 0, `${label}: empty item`);
    assert.equal(item.trim(), item, `${label}: item must not have surrounding whitespace`);
    assert.equal(seen.has(item.toLowerCase()), false, `${label}: duplicate item ${item}`);
    seen.add(item.toLowerCase());
    scanNoLeaks(label, item);
  }
}

function optionRows(candidate) {
  if (!Array.isArray(candidate.options)) return [];
  return candidate.options.flatMap((option, index) => {
    const record = asRecord(option);
    if (!record) return [];
    assertNoUnknownFields(record, optionFields, `option #${index + 1}`);
    const id = asString(record.id);
    const text = asString(record.text);
    return id && text ? [{ id, text }] : [];
  });
}

function distractorRows(candidate) {
  if (!Array.isArray(candidate.distractorRationales)) return [];
  return candidate.distractorRationales.flatMap((rationale, index) => {
    const record = asRecord(rationale);
    if (!record) return [];
    assertNoUnknownFields(record, distractorRationaleFields, `distractorRationale #${index + 1}`);
    const optionId = asString(record.optionId);
    const text = asString(record.rationale);
    return optionId && text ? [{ optionId, rationale: text }] : [];
  });
}

function qklRows(candidate) {
  if (!Array.isArray(candidate.questionKnowledgeLinks)) return [];
  return candidate.questionKnowledgeLinks.flatMap((link, index) => {
    const record = asRecord(link);
    if (!record) return [];
    assertNoUnknownFields(record, qklFields, `questionKnowledgeLink #${index + 1}`);
    const questionId = asString(record.questionId);
    const knowledgePointId = asString(record.knowledgePointId);
    const linkType = asString(record.linkType);
    const weight = typeof record.weight === 'number' && Number.isFinite(record.weight) ? record.weight : NaN;
    return questionId && knowledgePointId && linkType && Number.isFinite(weight)
      ? [{ questionId, knowledgePointId, linkType, weight }]
      : [];
  });
}

function findForbiddenTrueKeys(value, path = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findForbiddenTrueKeys(item, `${path}[${index}]`));
  }
  const record = asRecord(value);
  if (!record) return [];
  return Object.entries(record).flatMap(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    const ownIssue = forbiddenTrueKeys.has(key) && child === true ? [childPath] : [];
    return [...ownIssue, ...findForbiddenTrueKeys(child, childPath)];
  });
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return Array.from(duplicates);
}

function targetClaimId(row, sourceClaimIds, reviewItemById, reviewItemByBookLocationId, reviewItemBySourceClaimId) {
  const claimId = asString(row.sourceClaimId) ?? asString(row.claimId);
  if (claimId) return sourceClaimIds.has(claimId) ? claimId : null;
  const reviewItemId = asString(row.sourceClaimReviewItemId) ?? asString(row.reviewItemId);
  if (reviewItemId) return reviewItemById.get(reviewItemId)?.sourceClaimId ?? null;
  const bookLocationId = asString(row.bookLocationId);
  if (bookLocationId) return reviewItemByBookLocationId.get(bookLocationId)?.sourceClaimId ?? null;
  const id = asString(row.id);
  if (id && reviewItemBySourceClaimId.has(id)) return id;
  return null;
}

function reviewedSourceClaimIds() {
  const sourceClaims = readJsonl('lineage/source-claims.jsonl');
  const reviewWorklist = readJson('lineage/source-claim-review-worklist.json');
  const decisions = readJsonl('lineage/source-claim-review-decisions.jsonl');
  const reviewItems = Array.isArray(reviewWorklist.reviewItems) ? reviewWorklist.reviewItems : [];
  const sourceClaimIds = new Set(sourceClaims.map((claim) => claim.id).filter(Boolean));
  const reviewItemById = new Map(reviewItems.map((item) => [item.id, item]).filter(([id]) => id));
  const reviewItemByBookLocationId = new Map(reviewItems.map((item) => [item.bookLocationId, item]).filter(([id]) => id));
  const reviewItemBySourceClaimId = new Map(reviewItems.map((item) => [item.sourceClaimId, item]).filter(([id]) => id));
  const ready = new Set();
  for (const decision of decisions) {
    if (!isReviewedNotRuntime(decision)) continue;
    const claimId = targetClaimId(
      decision,
      sourceClaimIds,
      reviewItemById,
      reviewItemByBookLocationId,
      reviewItemBySourceClaimId
    );
    if (claimId) ready.add(claimId);
  }
  return ready;
}

function assertRuntimeProjection(candidate, label) {
  const projection = asRecord(candidate.runtimeProjection);
  assert.ok(projection, `${label}: runtimeProjection missing`);
  assertNoUnknownFields(projection, runtimeProjectionFields, `${label}: runtimeProjection`);
  const typ = asString(projection.typ);
  assert.ok(typ && allowedRuntimeTypes.has(typ), `${label}: runtimeProjection.typ is not Kemi-compatible`);
  assert.equal(Number.isInteger(projection.niva), true, `${label}: runtimeProjection.niva must be integer`);
  assert.ok(projection.niva >= 1 && projection.niva <= 3, `${label}: runtimeProjection.niva must be 1-3`);
  const delkapitel = asString(projection.delkapitel);
  assert.ok(
    delkapitel && /^(?:K[1-6](?:-[A-Za-z0-9_.-]+)?|[1-6](?:\.\d+){0,2})$/.test(delkapitel),
    `${label}: runtimeProjection.delkapitel must be a stable chapter or section code`
  );
  const stella = asString(projection.stella);
  assert.ok(stella && stella.length <= 120, `${label}: runtimeProjection.stella must be a short source label`);
  const visual = asString(projection.visual);
  const visualAlt = asString(projection.visualAlt);
  if (visual) {
    assert.ok(visual.length <= 220, `${label}: runtimeProjection.visual too long`);
    assertPublicText(visualAlt, `${label}: runtimeProjection.visualAlt`, { minLength: 20, maxLength: 260 });
  } else {
    assert.equal(visualAlt, null, `${label}: runtimeProjection.visualAlt requires visual`);
  }
  const bildtext = asString(projection.bildtext);
  if (bildtext) assertPublicText(bildtext, `${label}: runtimeProjection.bildtext`, { minLength: 4, maxLength: 260 });
  const fallback = asString(projection.fallback);
  if (fallback) assertPublicText(fallback, `${label}: runtimeProjection.fallback`, { minLength: 4, maxLength: 260 });
  scanNoLeaks(`${label}: runtimeProjection`, projection);
}

function assertCandidateShape(candidate, index) {
  const label = `question candidate #${index + 1}`;
  assertNoUnknownFields(candidate, candidateFields, label);
  for (const field of requiredCandidateFields) {
    assert.ok(field in candidate, `${label}: missing required field ${field}`);
  }
  assertIdentifier(candidate.id, `${label}: id`, { maxLength: 140 });
  assert.match(candidate.id, /^(?:bio|biologi)-q-[a-z0-9-]+$/i, `${label}: id must use bio-q-* or biologi-q-*`);
  assert.equal(candidate.subject, subject, `${label}: subject`);
  assert.equal(candidate.bookEditionId, bookEditionId, `${label}: bookEditionId`);
  assert.match(String(candidate.chapterCode ?? ''), /^K[1-6]$/, `${label}: chapterCode`);
  assert.ok(allowedCandidateStatuses.has(candidate.status), `${label}: status`);
  assert.ok(allowedActivationReviewStatuses.has(candidate.activationReviewStatus), `${label}: activationReviewStatus`);
  assert.ok(allowedFormats.has(candidate.format), `${label}: format`);
  assert.ok(allowedCandidateStatuses.has(candidate.reviewStatus), `${label}: reviewStatus`);
  assertPublicText(candidate.studentStem, `${label}: studentStem`, { minLength: 20, maxLength: 320 });
  assertPublicText(candidate.solution, `${label}: solution`, { minLength: 40, maxLength: 700 });
  assertPublicText(candidate.publicSanitizedSourceSummary, `${label}: publicSanitizedSourceSummary`, {
    minLength: 30,
    maxLength: 280
  });

  const options = optionRows(candidate);
  assert.equal(Array.isArray(candidate.options), true, `${label}: options must be an array`);
  assert.equal(candidate.options.length, 4, `${label}: options must contain exactly four rows`);
  assert.equal(options.length, 4, `${label}: options must be { id, text } rows`);
  const optionIds = options.map((option) => option.id);
  assert.deepEqual(optionIds, ['A', 'B', 'C', 'D'], `${label}: option ids must be A, B, C, D`);
  assert.equal(new Set(options.map((option) => option.text.toLowerCase())).size, 4, `${label}: option texts must be unique`);
  for (const option of options) {
    assertPublicText(option.text, `${label}: option ${option.id}.text`, { minLength: 8, maxLength: 180 });
  }

  const correctOptionId = asString(candidate.correctOptionId);
  assert.ok(correctOptionId && optionIds.includes(correctOptionId), `${label}: correctOptionId must match an option`);
  const wrongOptionIds = optionIds.filter((optionId) => optionId !== correctOptionId);
  const rationales = distractorRows(candidate);
  assert.equal(Array.isArray(candidate.distractorRationales), true, `${label}: distractorRationales must be an array`);
  assert.equal(rationales.length, wrongOptionIds.length, `${label}: distractorRationales must cover wrong options`);
  const rationaleIds = rationales.map((rationale) => rationale.optionId);
  assert.deepEqual([...rationaleIds].sort(), [...wrongOptionIds].sort(), `${label}: distractor rationales must target wrong options`);
  for (const rationale of rationales) {
    assertPublicText(rationale.rationale, `${label}: distractorRationale ${rationale.optionId}`, {
      minLength: 20,
      maxLength: 260
    });
  }

  assertIdentifierArray(candidate.bookLocationIds, `${label}: bookLocationIds`, { allowColon: true, minItems: 1, maxItems: 1 });
  assertIdentifierArray(candidate.sourceClaimIds, `${label}: sourceClaimIds`, { prefix: 'sourceclaim-', minItems: 1, maxItems: 4 });
  assertIdentifierArray(candidate.knowledgePointIds, `${label}: knowledgePointIds`, { prefix: 'kp-biologi-', minItems: 1, maxItems: 6 });
  assertRuntimeProjection(candidate, label);
  assert.ok(Number.isInteger(candidate.difficultyLevel), `${label}: difficultyLevel must be integer`);
  assert.ok(candidate.difficultyLevel >= 1 && candidate.difficultyLevel <= 3, `${label}: difficultyLevel must be 1-3`);
  assertUniqueStringArray(candidate.enabledLevels, `${label}: enabledLevels`, { minItems: 1, maxItems: 6 });
  assertUniqueStringArray(candidate.skillTags, `${label}: skillTags`, { minItems: 1, maxItems: 16 });
  assertUniqueStringArray(candidate.abilityTags, `${label}: abilityTags`, { minItems: 1, maxItems: 16 });
  assertUniqueStringArray(candidate.techniqueTags, `${label}: techniqueTags`, { minItems: 1, maxItems: 16 });
  assertIdentifier(candidate.importBatchId, `${label}: importBatchId`, { allowColon: true, maxLength: 160 });
  assertIdentifier(candidate.createdFromSourceId, `${label}: createdFromSourceId`, { prefix: 'source-atom-' });
  assert.ok(asString(candidate.contentHash), `${label}: contentHash missing`);
  scanNoLeaks(`${label}: contentHash`, candidate.contentHash);

  const metadataCompleteness = asRecord(candidate.metadataCompleteness);
  assert.ok(metadataCompleteness, `${label}: metadataCompleteness missing`);
  assertNoUnknownFields(metadataCompleteness, metadataCompletenessFields, `${label}: metadataCompleteness`);
  const checks = asRecord(metadataCompleteness.checks);
  assert.ok(checks, `${label}: metadataCompleteness.checks missing`);
  assertNoUnknownFields(checks, metadataCheckFields, `${label}: metadataCompleteness.checks`);
  for (const check of requiredMetadataChecks) {
    assert.equal(checks[check], true, `${label}: metadataCompleteness.checks.${check} must be true`);
  }
  const validationReport = asRecord(candidate.validationReport);
  assert.ok(validationReport, `${label}: validationReport missing`);
  assertNoUnknownFields(validationReport, validationReportFields, `${label}: validationReport`);
  for (const key of requiredFalseValidationReportKeys) {
    assert.equal(validationReport[key], false, `${label}: validationReport.${key} must be false`);
  }
  assertUniqueStringArray(validationReport.requiredBeforeActive, `${label}: validationReport.requiredBeforeActive`, {
    minItems: 1,
    maxItems: 20
  });
  const forbiddenTruePaths = findForbiddenTrueKeys(candidate);
  assert.equal(forbiddenTruePaths.length, 0, `${label}: true runtime/write flags are forbidden: ${forbiddenTruePaths.join(', ')}`);
  scanNoLeaks(label, candidate);
}

function assertCandidateReferences(candidate, references, workItemCounts) {
  const label = `question candidate ${candidate.id}`;
  const bookLocationIds = asStringArray(candidate.bookLocationIds);
  const sourceClaimIds = asStringArray(candidate.sourceClaimIds);
  const knowledgePointIds = asStringArray(candidate.knowledgePointIds);
  const [bookLocationId] = bookLocationIds;
  const workItem = references.workItemByBookLocationId.get(bookLocationId);
  assert.ok(workItem, `${label}: bookLocationId must map to a question work item`);
  assert.equal(candidate.chapterCode, workItem.chapterCode, `${label}: chapterCode must match work item`);
  workItemCounts.set(workItem.id, (workItemCounts.get(workItem.id) ?? 0) + 1);

  for (const sourceClaimId of sourceClaimIds) {
    const claim = references.sourceClaimById.get(sourceClaimId);
    assert.ok(claim, `${label}: unknown SourceClaim ${sourceClaimId}`);
    assert.ok(references.reviewedSourceClaimIds.has(sourceClaimId), `${label}: SourceClaim is not reviewed_not_runtime`);
    assert.equal(claim.bookLocationId, bookLocationId, `${label}: SourceClaim must belong to candidate BookLocation`);
  }

  const sourceAtom = references.sourceAtomById.get(candidate.createdFromSourceId);
  assert.ok(sourceAtom, `${label}: createdFromSourceId must reference a source_atom`);
  assert.equal(sourceAtom.reviewStatus, 'reviewed_not_runtime', `${label}: source_atom must be reviewed_not_runtime`);
  assert.equal(sourceAtom.runtimeEligible, false, `${label}: source_atom runtimeEligible`);
  const sourceAtomClaimIds = asStringArray(sourceAtom.sourceClaimIds);
  assert.equal(
    sourceAtomClaimIds.length > 0 && sourceAtomClaimIds.every((sourceClaimId) => sourceClaimIds.includes(sourceClaimId)),
    true,
    `${label}: createdFromSourceId must not reference SourceClaims outside the candidate`
  );

  const qkls = qklRows(candidate);
  assert.equal(Array.isArray(candidate.questionKnowledgeLinks), true, `${label}: questionKnowledgeLinks must be an array`);
  assert.equal(qkls.length, knowledgePointIds.length, `${label}: one QKL row per KnowledgePoint`);
  const qklKpIds = qkls.map((link) => link.knowledgePointId);
  assert.equal(duplicateValues(qklKpIds).length, 0, `${label}: duplicate QKL KnowledgePoint ids`);
  assert.deepEqual([...qklKpIds].sort(), [...knowledgePointIds].sort(), `${label}: QKL must cover candidate KnowledgePoints`);
  assert.equal(qkls.some((link) => link.linkType === 'primary'), true, `${label}: at least one QKL must be primary`);
  const qklWeightSum = qkls.reduce((sum, link) => sum + link.weight, 0);
  assert.ok(qklWeightSum > 0 && qklWeightSum <= 1.0001, `${label}: QKL weights must sum to <= 1`);

  for (const knowledgePointId of knowledgePointIds) {
    const kp = references.atomicKpById.get(knowledgePointId);
    assert.ok(kp, `${label}: unknown atomic KnowledgePoint ${knowledgePointId}`);
    assert.equal(kp.reviewStatus, 'reviewed_not_runtime', `${label}: atomic KnowledgePoint must be reviewed_not_runtime`);
    assert.equal(kp.runtimeEligible, false, `${label}: atomic KnowledgePoint runtimeEligible`);
    assert.equal(kp.pixelEligible, false, `${label}: atomic KnowledgePoint pixelEligible`);
    assert.deepEqual(kp.bookLocationIds, [bookLocationId], `${label}: KP BookLocation must match candidate`);
    for (const sourceClaimId of kp.sourceClaimIds ?? []) {
      assert.ok(sourceClaimIds.includes(sourceClaimId), `${label}: KP SourceClaim outside candidate scope`);
    }
    assert.equal(
      (kp.sourceAtomIds ?? []).includes(candidate.createdFromSourceId),
      true,
      `${label}: createdFromSourceId must be one of the candidate KP sourceAtomIds`
    );
  }

  for (const link of qkls) {
    assert.equal(link.questionId, candidate.id, `${label}: QKL questionId mismatch`);
    assert.ok(allowedQklLinkTypes.has(link.linkType), `${label}: QKL linkType must be primary/supporting`);
    assert.ok(link.weight > 0 && link.weight <= 1, `${label}: QKL weight must be 0-1`);
  }
}

function collectReferences() {
  const worklist = readJson('questions/intake-worklist.json');
  const sourceClaims = readJsonl('lineage/source-claims.jsonl');
  const sourceAtoms = readJsonl('lineage/source-atoms.jsonl');
  const atomicKps = readJsonl('lineage/atomic-knowledge-points.jsonl');
  const reviewedClaims = reviewedSourceClaimIds();
  const workItemByBookLocationId = new Map();
  for (const item of worklist.workItems ?? []) {
    const chapterCode = String(item.chapterId ?? '').replace(/^biologi-kap/, 'K');
    workItemByBookLocationId.set(item.bookLocationId, { ...item, chapterCode });
  }
  return {
    worklist,
    sourceClaimById: new Map(sourceClaims.map((claim) => [claim.id, claim]).filter(([id]) => id)),
    reviewedSourceClaimIds: reviewedClaims,
    sourceAtomById: new Map(sourceAtoms.map((atom) => [atom.id, atom]).filter(([id]) => id)),
    atomicKpById: new Map(atomicKps.map((kp) => [kp.id, kp]).filter(([id]) => id)),
    workItemByBookLocationId
  };
}

const worklist = readJson('questions/intake-worklist.json');
const candidates = readJsonl('questions/intake-candidates.jsonl');
assert.equal(worklist.schemaVersion, 'question-intake-worklist-v1');
assert.equal(worklist.subject, subject);
assert.equal(worklist.bookEditionId, bookEditionId);
assert.equal(worklist.targetCandidateCount, targetCandidateCount);
assert.equal(worklist.plannedCandidateCount, targetCandidateCount);
assert.equal(worklist.runtimeImportAllowed, false);
assert.equal(worklist.candidateGenerationAllowed, false);
assert.equal(worklist.kvWriteAllowed, false);
assert.equal(worklist.importApplyAllowed, false);
assert.equal(worklist.safeActiveWriteAllowed, false);
assert.equal(worklist.pixelWriteAllowed, false);
scanNoLeaks('question intake candidates', candidates);

const candidateIds = candidates.map((candidate) => candidate.id).filter(Boolean);
assert.equal(new Set(candidateIds).size, candidateIds.length, 'question candidate ids must be unique');

const atomicStatus = runJsonValidator('scripts/validate-atomic-knowledge-points.mjs');
const atomicDecisionStatus = runJsonValidator('scripts/validate-atomic-kp-review-decisions.mjs');
if (candidates.length > 0) {
  assert.equal(
    atomicStatus.atomicKnowledgePointStatus,
    'atomic_kp_review_ready',
    'question candidates require atomic_kp_review_ready first'
  );
  assert.equal(
    atomicDecisionStatus.atomicKpReviewDecisionStatus,
    'atomic_kp_review_decisions_ready',
    'question candidates require atomic_kp_review_decisions_ready first'
  );
}

const references = collectReferences();
const workItemCounts = new Map((worklist.workItems ?? []).map((item) => [item.id, 0]));
for (const [index, candidate] of candidates.entries()) {
  assertCandidateShape(candidate, index);
  assertCandidateReferences(candidate, references, workItemCounts);
}

for (const item of worklist.workItems ?? []) {
  const count = workItemCounts.get(item.id) ?? 0;
  assert.ok(count <= item.plannedCandidateQuota, `${item.id}: question candidate count exceeds planned quota`);
}

const coveredWorkItems = Array.from(workItemCounts.values()).filter((count) => count > 0).length;
const filledWorkItems = (worklist.workItems ?? []).filter((item) => (workItemCounts.get(item.id) ?? 0) === item.plannedCandidateQuota).length;
const questionCandidateStatus =
  candidates.length === 0
    ? atomicDecisionStatus?.atomicKpReviewDecisionStatus === 'atomic_kp_review_decisions_ready'
      ? 'ready_for_question_candidate_authoring'
      : 'blocked_empty_until_atomic_kp_review'
    : candidates.length === worklist.plannedCandidateCount && filledWorkItems === worklist.workItems.length
      ? 'question_candidate_batch_ready_for_review'
      : 'question_candidate_batch_incomplete';

console.log(JSON.stringify({
  ok: true,
  questionCandidateStatus,
  questionCandidates: candidates.length,
  plannedQuestionCandidates: worklist.plannedCandidateCount,
  coveredQuestionWorkItems: coveredWorkItems,
  filledQuestionWorkItems: filledWorkItems,
  runtimeImportAllowed: false,
  candidateGenerationAllowed: false,
  kvWriteAllowed: false,
  importApplyAllowed: false,
  safeActiveWriteAllowed: false,
  pixelWriteAllowed: false
}, null, 2));
