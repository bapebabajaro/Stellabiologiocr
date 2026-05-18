#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const writeReport = process.argv.includes('--write-report');

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

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function ids(rows) {
  return rows.map((row) => text(row.id)).filter(Boolean);
}

function duplicates(values) {
  const seen = new Set();
  const duplicate = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicate.add(value);
    seen.add(value);
  }
  return [...duplicate];
}

function hasRuntimeFlag(row) {
  return [
    'runtimeEligible',
    'runtimePromotionAllowed',
    'runtimeImportAllowed',
    'candidateGenerationAllowed',
    'safeActiveWriteAllowed',
    'pixelEligible',
    'pixelBindingAllowed',
    'pixelWriteAllowed',
    'kvWriteAllowed',
    'importApplyAllowed'
  ].some((key) => row[key] === true);
}

function addIssue(issues, category, id, message) {
  issues.push({ category, id: id || null, message });
}

const evidenceRefs = readJsonl('lineage/evidence-refs.jsonl');
const sourceClaimDecisions = readJsonl('lineage/source-claim-review-decisions.jsonl');
const sourceAtoms = readJsonl('lineage/source-atoms.jsonl');
const atomicKps = readJsonl('lineage/atomic-knowledge-points.jsonl');
const atomicKpDecisions = readJsonl('lineage/atomic-kp-review-decisions.jsonl');
const pageRecordDecisions = readJsonl('lineage/page-record-review-decisions.jsonl');
const questionCandidates = readJsonl('questions/intake-candidates.jsonl');
const evidenceById = new Map(evidenceRefs.map((row) => [row.id, row]));
const issues = [];

for (const [label, rows] of [
  ['page-record-review-decisions', pageRecordDecisions],
  ['source-claim-review-decisions', sourceClaimDecisions],
  ['source-atoms', sourceAtoms],
  ['atomic-knowledge-points', atomicKps],
  ['atomic-kp-review-decisions', atomicKpDecisions]
]) {
  for (const duplicate of duplicates(ids(rows))) addIssue(issues, 'identity', duplicate, `${label} id must be unique`);
}

for (const decision of sourceClaimDecisions) {
  for (const evidenceRefId of Array.isArray(decision.evidenceRefIds) ? decision.evidenceRefIds : []) {
    const evidence = evidenceById.get(evidenceRefId);
    if (!evidence) {
      addIssue(issues, 'evidence', decision.id, 'source claim decision references missing evidence_ref');
      continue;
    }
    if (evidence.hashStatus !== 'reviewed_not_runtime') {
      addIssue(issues, 'evidence', evidence.id, 'evidence_ref hashStatus must be reviewed_not_runtime before question authoring');
    }
    if (!/^sha256:[a-f0-9]{64}$/.test(text(evidence.evidenceHash))) {
      addIssue(issues, 'evidence', evidence.id, 'evidence_ref must have a public-safe sha256 evidenceHash');
    }
    if (evidence.runtimeEligible === true || evidence.containsRawOcr === true || evidence.containsPageImage === true) {
      addIssue(issues, 'evidence', evidence.id, 'evidence_ref must stay public-safe and non-runtime');
    }
  }
}

for (const atom of sourceAtoms) {
  const atomText = text(atom.atomText);
  if (!atomText || atomText.length < 35) addIssue(issues, 'source-atom-quality', atom.id, 'source atom text is too thin');
  if (/^Behandlar\b|centrala begrepp|kontrollerbar biologisk id/i.test(atomText)) {
    addIssue(issues, 'source-atom-quality', atom.id, 'source atom is generic placeholder copy');
  }
  if (atom.reviewStatus !== 'reviewed_not_runtime') addIssue(issues, 'source-atom-quality', atom.id, 'source atom must be reviewed_not_runtime');
  if (atom.containsRawOcr !== false || hasRuntimeFlag(atom)) {
    addIssue(issues, 'source-atom-quality', atom.id, 'source atom must be public-safe and non-runtime');
  }
}

const kpKeysByLocation = new Map();
for (const kp of atomicKps) {
  const locationId = Array.isArray(kp.bookLocationIds) ? kp.bookLocationIds[0] : '';
  const label = text(kp.label).toLowerCase();
  const goal = text(kp.studentGoal).toLowerCase();
  const key = `${label}|${goal}`;
  const locationKeys = kpKeysByLocation.get(locationId) ?? new Set();
  if (locationKeys.has(key)) addIssue(issues, 'kp-quality', kp.id, 'duplicate label and studentGoal inside one BookLocation');
  locationKeys.add(key);
  kpKeysByLocation.set(locationId, locationKeys);
  if (/mellan ([\p{L}0-9-]+) och \1\b/iu.test(goal) || /jämföra ([\p{L}0-9-]+) med \1\b/iu.test(goal)) {
    addIssue(issues, 'kp-quality', kp.id, 'self-referential KP goal');
  }
  if (/rimligt påstående|centrala begrepp|utan att blanda ihop dem/i.test(goal)) {
    addIssue(issues, 'kp-quality', kp.id, 'KP goal is generic placeholder copy');
  }
  if (kp.reviewStatus !== 'reviewed_not_runtime' || hasRuntimeFlag(kp)) {
    addIssue(issues, 'kp-quality', kp.id, 'KP must stay reviewed_not_runtime and non-runtime');
  }
}

for (const decision of atomicKpDecisions) {
  if (decision.status !== 'reviewed_not_runtime' || decision.reviewStatus !== 'reviewed_not_runtime') {
    addIssue(issues, 'kp-decision', decision.id, 'atomic KP decision must be reviewed_not_runtime');
  }
  if (hasRuntimeFlag(decision)) addIssue(issues, 'kp-decision', decision.id, 'atomic KP decision must keep all write/runtime flags false');
}

if (questionCandidates.length > 0) {
  for (const duplicate of duplicates(questionCandidates.map((row) => text(row.studentStem).toLowerCase()).filter(Boolean))) {
    const duplicateRow = questionCandidates.find((row) => text(row.studentStem).toLowerCase() === duplicate);
    addIssue(issues, 'question-quality', duplicateRow?.id, 'duplicate studentStem in question candidates');
  }
  const correctOptionIds = questionCandidates.map((row) => text(row.correctOptionId)).filter(Boolean);
  const distinctCorrectOptions = new Set(correctOptionIds);
  if (questionCandidates.length >= 8 && distinctCorrectOptions.size < 3) {
    addIssue(issues, 'question-quality', null, 'correctOptionId distribution is too predictable for the batch');
  }
  for (const candidate of questionCandidates) {
    if (candidate.status !== 'candidate_review_required' || candidate.reviewStatus !== 'candidate_review_required') {
      addIssue(issues, 'question-quality', candidate.id, 'question candidate must stay in review-required state');
    }
    if (hasRuntimeFlag(candidate)) addIssue(issues, 'question-quality', candidate.id, 'question candidate must keep all write/runtime flags false');
  }
}

const report = {
  ok: issues.length === 0,
  schemaVersion: 'question-generation-readiness-v1',
  status: issues.length === 0 ? 'question_generation_ready_for_offline_candidates' : 'blocked',
  counts: {
    evidenceRefs: evidenceRefs.length,
    reviewedEvidenceRefs: evidenceRefs.filter((row) => row.hashStatus === 'reviewed_not_runtime').length,
    sourceAtoms: sourceAtoms.length,
    atomicKnowledgePoints: atomicKps.length,
    atomicKpReviewDecisions: atomicKpDecisions.length,
    questionCandidates: questionCandidates.length
  },
  outputPolicy: {
    runtimeImportAllowed: false,
    activationAllowed: false,
    kvWriteAllowed: false,
    importApplyAllowed: false,
    safeActiveWriteAllowed: false,
    pixelWriteAllowed: false,
    productionDeployAllowed: false
  },
  issues
};

if (writeReport) {
  writeFileSync(join(root, 'reports/validation/question-generation-readiness.json'), `${JSON.stringify(report, null, 2)}\n`);
}

if (issues.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
