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

function joinedCandidateText(candidate) {
  const parts = [
    candidate.studentStem,
    candidate.solution,
    candidate.publicSanitizedSourceSummary,
    ...(Array.isArray(candidate.options) ? candidate.options.map((option) => option.text) : []),
    ...(Array.isArray(candidate.distractorRationales) ? candidate.distractorRationales.map((row) => row.rationale) : []),
    ...(Array.isArray(candidate.tags) ? candidate.tags : [])
  ];
  return parts.map(text).filter(Boolean).join(' ');
}

function wrongOptionTexts(candidate) {
  if (!Array.isArray(candidate.options)) return [];
  const correctOptionId = text(candidate.correctOptionId);
  return candidate.options
    .filter((option) => text(option.id) !== correctOptionId)
    .map((option) => text(option.text))
    .filter(Boolean);
}

function linkedKpText(candidate, atomicKpById) {
  return (Array.isArray(candidate.knowledgePointIds) ? candidate.knowledgePointIds : [])
    .map((id) => atomicKpById.get(id))
    .filter(Boolean)
    .map((kp) => `${text(kp.label)} ${text(kp.studentGoal)}`)
    .join(' ')
    .toLowerCase();
}

const evidenceRefs = readJsonl('lineage/evidence-refs.jsonl');
const sourceClaimDecisions = readJsonl('lineage/source-claim-review-decisions.jsonl');
const sourceAtoms = readJsonl('lineage/source-atoms.jsonl');
const atomicKps = readJsonl('lineage/atomic-knowledge-points.jsonl');
const atomicKpDecisions = readJsonl('lineage/atomic-kp-review-decisions.jsonl');
const pageRecordDecisions = readJsonl('lineage/page-record-review-decisions.jsonl');
const questionCandidates = readJsonl('questions/intake-candidates.jsonl');
const evidenceById = new Map(evidenceRefs.map((row) => [row.id, row]));
const sourceAtomById = new Map(sourceAtoms.map((row) => [row.id, row]));
const atomicKpById = new Map(atomicKps.map((row) => [row.id, row]));
const issues = [];

const weakQuestionPatterns = [
  { pattern: /\bmikroskoperandet\b/i, message: 'question copy uses awkward Swedish phrasing' },
  { pattern: /\bskalenlig uppgift\b/i, message: 'question copy uses awkward Swedish phrasing' },
  { pattern: /\banvända mikroskopera\b/i, message: 'KP/question copy uses ungrammatical Swedish phrasing' },
  { pattern: /\bpris\b/i, message: 'distractor is too obviously non-biological' },
  { pattern: /\bsladd\b/i, message: 'distractor is too obviously non-biological' },
  { pattern: /\bbänk\b/i, message: 'distractor is too obviously non-biological' },
  { pattern: /\bblunda\b/i, message: 'distractor is too obviously non-biological' },
  { pattern: /\bmest populär/i, message: 'distractor relies on preference instead of biology' },
  { pattern: /\bhelt objektiv\b/i, message: 'distractor overclaims certainty' },
  { pattern: /\bkan aldrig ge biologisk information\b/i, message: 'distractor overclaims impossibility' },
  { pattern: /\bgör\s+\w+\s+onödigt\b/i, message: 'distractor overclaims that a core method is unnecessary' },
  { pattern: /\bsaknar funktion\b/i, message: 'distractor overclaims absence of function' },
  { pattern: /\binte består av celler\b/i, message: 'distractor risks a broad factual error' }
];

const supportedConceptTerms = [
  { term: 'kloroplast' },
  { term: 'fotosyntes' },
  { term: 'cellvägg' },
  { term: 'biologisk mångfald', location: 'biologi-kap1-sec03' },
  { term: 'artmångfald', location: 'biologi-kap1-sec03' },
  { term: 'ekosystem', location: 'biologi-kap1-sec03' },
  { term: 'genetisk variation', location: 'biologi-kap1-sec03' },
  { term: 'livsmiljö', location: 'biologi-kap1-sec03' },
  { term: 'anpassning', location: 'biologi-kap1-sec03' },
  { term: 'hot mot mångfald', location: 'biologi-kap1-sec03' },
  { term: 'bevarande', location: 'biologi-kap1-sec03' }
];
const legacyDistractorQualityBatchIds = new Set(['biologi-k1-sec01-offline-batch-20260518']);
const broadCuePattern = /\b(alltid|aldrig|alla|automatiskt|exakt samma|saknar helt|bara|säkert|säker|direkt|inte längre|utan belägg|ren gissning|överflödiga|inte behövs|onödiga|ensam)\b/i;
const absurdWrongOptionPattern = /\b(levande igen|celler byter art|tar bort behovet av|påverkas aldrig av belysning|innehåller alltid fler arter)\b/i;

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
  const labelParts = label.split(':').map((part) => part.trim());
  const key = `${label}|${goal}`;
  const locationKeys = kpKeysByLocation.get(locationId) ?? new Set();
  if (locationKeys.has(key)) addIssue(issues, 'kp-quality', kp.id, 'duplicate label and studentGoal inside one BookLocation');
  locationKeys.add(key);
  kpKeysByLocation.set(locationId, locationKeys);
  if (/mellan ([\p{L}0-9-]+) och \1\b/iu.test(goal) || /jämföra ([\p{L}0-9-]+) med \1\b/iu.test(goal)) {
    addIssue(issues, 'kp-quality', kp.id, 'self-referential KP goal');
  }
  if (labelParts.length === 2 && labelParts[0] === labelParts[1]) {
    addIssue(issues, 'kp-quality', kp.id, 'KP label repeats its own skill category');
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
    const candidateText = joinedCandidateText(candidate);
    for (const check of weakQuestionPatterns) {
      if (check.pattern.test(candidateText)) addIssue(issues, 'question-quality', candidate.id, check.message);
    }
    const strictDistractorQuality = !legacyDistractorQualityBatchIds.has(text(candidate.importBatchId));
    const wrongTexts = wrongOptionTexts(candidate);
    if (strictDistractorQuality) {
      const broadCueWrongOptions = wrongTexts.filter((optionText) => broadCuePattern.test(optionText));
      if (broadCueWrongOptions.length >= 2) {
        addIssue(issues, 'question-quality', candidate.id, 'too many distractors rely on absolute cue words');
      }
      for (const optionText of wrongTexts) {
        if (absurdWrongOptionPattern.test(optionText)) {
          addIssue(issues, 'question-quality', candidate.id, 'distractor is too absurd or too easily eliminated');
        }
      }
      const semanticText = [
        text(candidate.studentStem),
        ...(Array.isArray(candidate.skillTags) ? candidate.skillTags.map(text) : []),
        ...(Array.isArray(candidate.abilityTags) ? candidate.abilityTags.map(text) : []),
        ...(Array.isArray(candidate.techniqueTags) ? candidate.techniqueTags.map(text) : [])
      ].join(' ').toLowerCase();
      const skillTags = Array.isArray(candidate.skillTags) ? candidate.skillTags.map(text).filter(Boolean) : [];
      const tagText = skillTags.join(' ').toLowerCase();
      const primaryTagText = (skillTags[0] ?? tagText).toLowerCase();
      const kpText = linkedKpText(candidate, atomicKpById);
      const conceptExpectation = /biologisk mångfald/.test(primaryTagText)
        ? { pattern: /biologisk mångfald/, label: 'biological diversity' }
        : /artmångfald|arter/.test(primaryTagText)
          ? { pattern: /artmångfald/, label: 'species diversity' }
          : /ekosystem/.test(primaryTagText)
            ? { pattern: /ekosystem/, label: 'ecosystem' }
            : /genetisk variation/.test(primaryTagText)
              ? { pattern: /genetisk variation/, label: 'genetic variation' }
              : /livsmiljö|habitat/.test(primaryTagText)
                ? { pattern: /livsmiljö/, label: 'habitat' }
                : /anpassning/.test(primaryTagText)
                  ? { pattern: /anpassning/, label: 'adaptation' }
                  : /hot mot mångfald|bevarande/.test(primaryTagText)
                    ? { pattern: /hot mot mångfald|bevarande/, label: 'threats to diversity' }
                    : null;
      const expectation = conceptExpectation ?? (/funktion|struktur|biologiskt samband/.test(semanticText) && /metodkritik|försiktigt|metodiskt|osäkerhet/.test(semanticText)
        ? { pattern: /biologiskt samband|felkälla|observation/, label: 'methodical function interpretation' }
        : /funktion|struktur|biologiskt samband/.test(semanticText)
        ? { pattern: /biologiskt samband|funktion|struktur/, label: 'biological function/structure' }
        : /observation/.test(semanticText) && /tolkning/.test(semanticText)
          ? { pattern: /observation|modell|metod/, label: 'observation/interpretation' }
        : /felkälla|metodkritik/.test(semanticText)
          ? { pattern: /felkälla|observation/, label: 'method confidence/felkalla' }
          : /dokumentation/.test(semanticText) && /metod|fokus/.test(semanticText)
            ? { pattern: /modell|metod|observation/, label: 'method/documentation' }
          : /förstoring|synfält|skala/.test(semanticText)
            ? { pattern: /förstoring/, label: 'magnification/scale' }
            : null);
      if (expectation && !expectation.pattern.test(kpText)) {
        addIssue(issues, 'question-quality', candidate.id, `primary QKL does not match ${expectation.label} semantics`);
      }
    }
    const linkedSourceIds = new Set([
      ...(Array.isArray(candidate.sourceAtomIds) ? candidate.sourceAtomIds : []),
      text(candidate.createdFromSourceId)
    ].filter(Boolean));
    const linkedSourceText = [...linkedSourceIds]
      .map((id) => text(sourceAtomById.get(id)?.atomText))
      .filter(Boolean)
      .join(' ');
    const candidateLocationText = (Array.isArray(candidate.bookLocationIds) ? candidate.bookLocationIds : []).join(' ').toLowerCase();
    const candidateTextLower = candidateText.toLowerCase();
    const linkedSourceTextLower = linkedSourceText.toLowerCase();
    for (const check of supportedConceptTerms) {
      const term = check.term.toLowerCase();
      if (check.location && !candidateLocationText.includes(check.location)) continue;
      if (candidateTextLower.includes(term) && !linkedSourceTextLower.includes(term)) {
        addIssue(issues, 'question-quality', candidate.id, `candidate uses ${term} without matching reviewed source atom support`);
      }
    }
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
