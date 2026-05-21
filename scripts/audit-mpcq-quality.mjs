#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const writeReports = process.argv.includes('--write');
const candidatesPath = 'questions/intake-candidates.jsonl';
const jsonReportPath = 'reports/validation/mpcq-quality-audit-20260518.json';
const markdownReportPath = 'reports/validation/mpcq-quality-audit-20260518.md';
const stopWords = new Set(
  [
    'vad',
    'vilket',
    'vilken',
    'vilka',
    'varfor',
    'varför',
    'hur',
    'kan',
    'man',
    'med',
    'och',
    'att',
    'som',
    'nar',
    'när',
    'for',
    'för',
    'ett',
    'en',
    'det',
    'den',
    'de',
    'i',
    'pa',
    'på',
    'av',
    'till',
    'eller',
    'bast',
    'bäst',
    'mest',
    'fran',
    'från',
    'under',
    'over',
    'över',
    'utan',
    'inom',
    'mellan',
    'ar',
    'är',
    'har',
    'blir',
    'vara',
    'finns',
    'detta',
    'denna',
    'dessa',
    'dar',
    'där',
    'har',
    'här',
    'om',
    'da',
    'då',
    'sin',
    'sina',
    'sitt',
    'alla'
  ]
);
const hardFailReasons = new Set([
  'missing_construction_note_en',
  'missing_knowledge_link_map',
  'missing_ocr_verification',
  'qkl_lt_3',
  'stem_correct_keyword_echo',
  'no_visual_table_or_data_load',
  'pseudo_visual_without_asset',
  'label_only_options'
]);
const standardSources = [
  'memory:singapore_stella_protocol',
  'skill:singaporempc/SKILL.md',
  'skill:singaporempc/references/high-inference-doctrine.md',
  'skill:singaporempc/references/stellakemiocr-canon.md',
  'skill:singaporempc/references/error-log.md',
  'skill:singapore-format-1-combination/SKILL.md',
  'skill:singapore-format-2-table/SKILL.md',
  'skill:singapore-format-3-single-visual/SKILL.md',
  'skill:singapore-format-4-pure-text/SKILL.md',
  'ppf:kemi-visual-question-pipeline-v1/README.md',
  'ppf:kemi-visual-question-pipeline-v1/PIPELINE.md',
  'ppf:kemi-visual-question-pipeline-v1/REVIEW_GATES.md'
];

function readJsonl(rel) {
  const text = readFileSync(join(root, rel), 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      return {
        __parseError: String(error.message ?? error),
        __line: index + 1
      };
    }
  });
}

function words(value) {
  return String(value ?? '').toLowerCase().match(/[a-zåäöé0-9]+/gi) ?? [];
}

function contentWords(value) {
  return words(value).filter((word) => word.length > 3 && !stopWords.has(word));
}

function wordOverlap(left, right) {
  const leftWords = new Set(contentWords(left));
  const rightWords = new Set(contentWords(right));
  return [...leftWords].filter((word) => rightWords.has(word));
}

function optionRows(candidate) {
  return Array.isArray(candidate.options) ? candidate.options : [];
}

function optionLengths(candidate) {
  return optionRows(candidate).map((option) => String(option.text ?? option.label ?? '').length);
}

function correctText(candidate) {
  return optionRows(candidate).find((option) => option.id === candidate.correctOptionId || option.label === candidate.correctOptionId)?.text ?? '';
}

function rationaleRows(candidate) {
  const rationales = [];
  if (Array.isArray(candidate.distractorRationales)) {
    rationales.push(...candidate.distractorRationales.map((rationale) => rationale.rationale ?? rationale.reason ?? ''));
  }
  for (const option of optionRows(candidate)) {
    if (option.id !== candidate.correctOptionId && (option.distractorRationale || option.rationale)) {
      rationales.push(option.distractorRationale ?? option.rationale);
    }
  }
  return rationales.filter(Boolean);
}

function hasConstructionNote(candidate) {
  return Boolean(candidate.construction_note_en || candidate.constructionNoteEn || candidate.constructionNote || candidate.mpcqConstructionNote);
}

function hasKnowledgeMap(candidate) {
  return Boolean(candidate.knowledge_link_map || candidate.knowledgeLinkMap || candidate.runtimeProjection?.knowledgeLinkMap);
}

function hasOcrVerification(candidate) {
  return Boolean(candidate.ocr_verification || candidate.ocrVerification || candidate.sourceCertification?.ocrVerification);
}

function hasRenderableAssetReference(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasRenderableAssetReference);
  if (!value || typeof value !== 'object') return false;
  return ['src', 'url', 'path', 'asset', 'assetPath', 'image', 'href', 'id'].some((key) => typeof value[key] === 'string' && value[key].trim().length > 0);
}

function hasVisualAlt(candidate) {
  return [candidate.visualAlt, candidate.visual_alt, candidate.alt, candidate.caption, candidate.bildtext]
    .some((value) => typeof value === 'string' && value.trim().length > 0);
}

function hasVisual(candidate) {
  const visualAsset = hasRenderableAssetReference(candidate.runtimeProjection?.visual)
    || hasRenderableAssetReference(candidate.visual)
    || hasRenderableAssetReference(candidate.visual_svg)
    || hasRenderableAssetReference(candidate.visualSvg);
  return visualAsset && hasVisualAlt(candidate);
}

function hasTable(candidate) {
  const table = candidate.table;
  if (Array.isArray(candidate.rows) && candidate.rows.length > 0) return true;
  if (Array.isArray(table?.rows) && table.rows.length > 0) return true;
  if (Array.isArray(table?.columns) && table.columns.length > 0 && Array.isArray(table?.cells) && table.cells.length > 0) return true;
  return candidate.type === 'singapore-table' && (Array.isArray(candidate.rows) || Array.isArray(table?.rows));
}

function hasEvidenceAsset(candidate) {
  return hasVisual(candidate) || hasTable(candidate);
}

function containsPseudoVisualText(stem) {
  const text = String(stem ?? '');
  const lower = text.toLowerCase();
  if (/\b(tabell|diagram|graf|bild|skiss|mikroskopbild)\b/i.test(text)) return true;
  if (/\b(preparat|mikroskop|cellgrupp|bladbit|l[öo]khinna)\b/i.test(lower) && /\bvisar\b/i.test(lower)) return true;
  if (/(?:^|[\s.;,:])(?:[A-ZÅÄÖ]\d|[IVX]{1,4})\s*[:=]/g.test(text)) return true;
  if ((text.match(/\b[A-ZÅÄÖ]\d\s*:/g) ?? []).length >= 2) return true;
  if ((text.match(/\b(?:T|S|F|M|P|K)\d\b/g) ?? []).length >= 3) return true;
  if (/(?:->|→)/.test(text) && (text.match(/\b[A-ZÅÄÖ]\s*:/g) ?? []).length >= 2) return true;
  return false;
}

function isLabelOnlyOptionText(value) {
  const text = String(value ?? '').trim();
  return /^val\s+[A-ZÅÄÖ]?\d+\s+(stöds|stods|gäller|galler|passar|väljs|valjs)\.?$/i.test(text)
    || /^endast\s+(rad\s+)?[A-ZÅÄÖIVX0-9]+\.?$/i.test(text)
    || /^(rad|fall|case)\s+[A-ZÅÄÖIVX0-9]+\s+(stöds|stods|gäller|galler)\.?$/i.test(text)
    || /^(alternativ|hypotes|påstående|pastaende|mönster|monster)\s+[A-ZÅÄÖ]?\d+[A-ZÅÄÖ]?\s*(stöds|stods|gäller|galler|passar|väljs|valjs|är bäst|ar bast)?\.?$/i.test(text)
    || /^[A-ZÅÄÖ]?\d+[A-ZÅÄÖ]?\s*(stöds|stods|gäller|galler|passar|väljs|valjs|är bäst|ar bast)\.?$/i.test(text);
}

function hasLabelOnlyOptions(candidate) {
  const rows = optionRows(candidate);
  return rows.length === 4 && rows.filter((option) => isLabelOnlyOptionText(option.text ?? option.label)).length >= 3;
}

function containsDataLoadText(stem) {
  return /\b\d+(?:[.,/-]\d+)?\b|\d+\s*(%|cm|mm|kg|g|m|grader|dag|dygn|tim|mol|liter|l\b|ml\b|procent)|tabell|diagram|graf|bild|modell/i.test(stem ?? '');
}

function isDefinitionStem(stem) {
  return /vad menas med|vilket exempel passar|vad betyder|vilken beskrivning|vilket påstående|beskriver bäst/i.test(stem ?? '');
}

function hasWeakAbsoluteDistractor(candidate) {
  return optionRows(candidate).some((option) => /\b(alltid|aldrig|alla|ingen|måste|bara|exakt|omöjlig|omöjliga|omöjligt)\b/i.test(option.text ?? ''));
}

function maxSameOpeningCount(candidate) {
  const heads = optionRows(candidate)
    .map((option) => contentWords(option.text ?? '').slice(0, 2).join(' '))
    .filter(Boolean);
  return Math.max(0, ...heads.map((head) => heads.filter((other) => other === head).length));
}

function auditCandidate(candidate, index) {
  if (candidate.__parseError) {
    return {
      line: candidate.__line,
      id: null,
      hardFail: true,
      estimatedRubricScore: 0,
      reasons: ['parse_error'],
      stem: ''
    };
  }

  const stem = candidate.studentStem ?? candidate.stem ?? '';
  const qklCount = (candidate.questionKnowledgeLinks ?? candidate.knowledgeLinks ?? []).length;
  const visual = hasVisual(candidate);
  const evidenceAsset = hasEvidenceAsset(candidate);
  const dataLoad = evidenceAsset || containsDataLoadText(stem);
  const lengths = optionLengths(candidate);
  const keywordEcho = wordOverlap(stem, correctText(candidate));
  const pseudoVisual = containsPseudoVisualText(stem) && !evidenceAsset;
  const labelOnly = hasLabelOnlyOptions(candidate);
  const reasons = [];

  if (!hasConstructionNote(candidate)) reasons.push('missing_construction_note_en');
  if (!hasKnowledgeMap(candidate)) reasons.push('missing_knowledge_link_map');
  if (!hasOcrVerification(candidate)) reasons.push('missing_ocr_verification');
  if (qklCount < 3) reasons.push('qkl_lt_3');
  if (!dataLoad) reasons.push('no_visual_table_or_data_load');
  if (pseudoVisual) reasons.push('pseudo_visual_without_asset');
  if (labelOnly) reasons.push('label_only_options');
  if (isDefinitionStem(stem)) reasons.push('definition_or_best_description_stem');
  if (keywordEcho.length > 0) reasons.push('stem_correct_keyword_echo');
  if (hasWeakAbsoluteDistractor(candidate)) reasons.push('weak_absolute_distractor_words');
  if (lengths.length !== 4) reasons.push('not_four_options');
  if (lengths.some((length) => length < 12)) reasons.push('too_short_option');
  if (lengths.length === 4 && Math.max(...lengths) > Math.min(...lengths) * 2.4) reasons.push('option_length_imbalance');
  if (rationaleRows(candidate).length < 3) reasons.push('missing_named_distractor_rationales');
  if (maxSameOpeningCount(candidate) >= 3) reasons.push('parallel_but_formulaic_options');

  let score = 20;
  if (reasons.includes('qkl_lt_3')) score -= 5;
  if (reasons.includes('no_visual_table_or_data_load')) score -= 4;
  if (reasons.includes('missing_construction_note_en')) score -= 3;
  if (reasons.includes('missing_knowledge_link_map')) score -= 3;
  if (reasons.includes('missing_ocr_verification')) score -= 3;
  if (reasons.includes('pseudo_visual_without_asset')) score -= 5;
  if (reasons.includes('label_only_options')) score -= 4;
  if (reasons.includes('stem_correct_keyword_echo')) score -= 2;
  if (reasons.includes('definition_or_best_description_stem')) score -= 2;
  if (reasons.includes('weak_absolute_distractor_words')) score -= 1;
  if (reasons.includes('missing_named_distractor_rationales')) score -= 2;

  return {
    line: index + 1,
    id: candidate.id,
    chapterCode: candidate.chapterCode,
    sectionCode: candidate.sectionCode,
    hardFail: reasons.some((reason) => hardFailReasons.has(reason)),
    estimatedRubricScore: Math.max(0, score),
    reasons,
    qklCount,
    hasVisual: visual,
    hasEvidenceAsset: evidenceAsset,
    pseudoVisualWithoutAsset: pseudoVisual,
    labelOnlyOptions: labelOnly,
    hasDataLoad: dataLoad,
    optionLengths: lengths,
    keywordEcho,
    stem,
    correct: correctText(candidate)
  };
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function summarize(audits) {
  const reasonCounts = {};
  for (const audit of audits) {
    for (const reason of audit.reasons) reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
  }
  const scoreBuckets = {
    '0-4': audits.filter((audit) => audit.estimatedRubricScore <= 4).length,
    '5-9': audits.filter((audit) => audit.estimatedRubricScore >= 5 && audit.estimatedRubricScore <= 9).length,
    '10-14': audits.filter((audit) => audit.estimatedRubricScore >= 10 && audit.estimatedRubricScore <= 14).length,
    '15-20': audits.filter((audit) => audit.estimatedRubricScore >= 15).length
  };
  const hardFailedCandidates = audits.filter((audit) => audit.hardFail).length;
  const likelyMpcqPassCandidates = audits.filter((audit) => !audit.hardFail && audit.estimatedRubricScore >= 15).length;
  return {
    schemaVersion: 'mpcq-quality-audit-v1',
    generatedAt: '2026-05-18',
    subject: 'biologi',
    sourceFile: candidatesPath,
    standardSources,
    decision: likelyMpcqPassCandidates === audits.length
      ? 'accept_current_batch_for_mpcq_quality'
      : 'reject_current_batch_for_mpcq_quality',
    totalCandidates: audits.length,
    hardFailedCandidates,
    likelyMpcqPassCandidates,
    reasonCounts,
    chapterCounts: countBy(audits, (audit) => audit.chapterCode ?? 'unknown'),
    scoreBuckets,
    hardFailPolicy: [
      'missing_construction_note_en',
      'missing_knowledge_link_map',
      'missing_ocr_verification',
      'qkl_lt_3',
      'stem_correct_keyword_echo',
      'no_visual_table_or_data_load',
      'pseudo_visual_without_asset',
      'label_only_options'
    ],
    sampleFailures: audits
      .filter((audit) => audit.hardFail)
      .sort((left, right) => left.estimatedRubricScore - right.estimatedRubricScore)
      .slice(0, 20)
  };
}

function markdown(summary) {
  const accepted = summary.likelyMpcqPassCandidates === summary.totalCandidates;
  const topReasons = Object.entries(summary.reasonCounts)
    .sort((left, right) => right[1] - left[1])
    .map(([reason, count]) => `| ${reason} | ${count} |`)
    .join('\n');
  const samples = summary.sampleFailures
    .slice(0, 10)
    .map((audit) => {
      return [
        `### ${audit.id ?? `line-${audit.line}`}`,
        '',
        `- Stem: ${audit.stem}`,
        `- Correct: ${audit.correct}`,
        `- Score estimate: ${audit.estimatedRubricScore}/20`,
        `- Reasons: ${audit.reasons.join(', ')}`,
        `- Keyword echo: ${audit.keywordEcho.length > 0 ? audit.keywordEcho.join(', ') : 'none'}`
      ].join('\n');
    })
    .join('\n\n');

  return `# MPCQ quality audit - Stella Biologi question candidates

Generated: 2026-05-18

Status: ${accepted ? 'accept' : 'reject'} current batch for MPCQ quality.

This audit reads the local MPCQ/Singapore/Stella canon and the current offline
candidate batch in \`${summary.sourceFile}\`. It does not inspect private OCR
text, does not write runtime data and does not promote any question.

## Result

| Metric | Count |
|---|---:|
| Candidates audited | ${summary.totalCandidates} |
| Hard-failed candidates | ${summary.hardFailedCandidates} |
| Likely MPCQ pass candidates | ${summary.likelyMpcqPassCandidates} |
| Score 0-4 | ${summary.scoreBuckets['0-4']} |
| Score 5-9 | ${summary.scoreBuckets['5-9']} |
| Score 10-14 | ${summary.scoreBuckets['10-14']} |
| Score 15-20 | ${summary.scoreBuckets['15-20']} |

${accepted
  ? `All ${summary.totalCandidates} current candidates meet the audit pass condition: no hard-fail policy reasons and score estimates at or above the pass threshold. Remaining reason counts are non-blocking audit signals for later review.`
  : `The current candidate batch still fails the MPCQ gate. The existing structural validator only proves that rows are shaped like offline candidate JSON. It does not prove high-inference MPCQ quality.`}

## ${accepted ? 'Remaining audit signals' : 'Blocking reasons'}

| Reason | Count |
|---|---:|
${topReasons}

## Canon checklist applied

- Source format must be classified before writing: Format 1 combination, Format
  2 table, Format 3 central visual, or Format 4 pure text.
- The task must have exact book location, source claim, OCR/source verification,
  knowledge-link map, remediation map and shortcut check.
- Normal MCQ needs at least 3 independent knowledge links; Singapore/MPCQ needs
  at least 4; gold questions need at least 5.
- Text may define the task, but must not perform the inference.
- Every wrong option must map to a distinct misconception or failed inference.
- Visuals or tables must be answer-critical when present; decorative visuals do
  not count.
- A question is blocked if it can be solved from one fact, text-only keyword
  matching, answer length, obvious absolute wording or process of elimination.

## Representative failures

${samples}

## Completion gate

This audit is a machine-quality signal only. It is not a completion certificate.
No MPCQ repair batch may be called complete until the fail-closed review gate
also passes:

\`\`\`powershell
node scripts\\validate-mpcq-final-gate.mjs
\`\`\`

That final gate requires structural validation, this audit, and separate
read-only PASS review for every registered max-3 repair batch in
\`reports/validation/mpcq-batch-reviews/review-ledger.json\`.
`;
}

const audits = readJsonl(candidatesPath).map(auditCandidate);
const summary = summarize(audits);

if (writeReports) {
  mkdirSync(dirname(join(root, jsonReportPath)), { recursive: true });
  writeFileSync(join(root, jsonReportPath), JSON.stringify(summary, null, 2) + '\n');
  writeFileSync(join(root, markdownReportPath), markdown(summary));
}

console.log(JSON.stringify(summary, null, 2));
if (summary.likelyMpcqPassCandidates !== summary.totalCandidates) process.exitCode = 1;
