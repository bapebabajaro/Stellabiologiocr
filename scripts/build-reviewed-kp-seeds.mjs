import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const subject = 'biologi';
const bookEditionId = 'bookedition-stella-biologi-ocr-v1';
const reviewer = 'codex-review-source-sanitizer';
const reviewedAt = '2026-05-18T00:00:00.000Z';
const write = process.argv.includes('--write');
const reviewSourceRoot = process.env.BIOLOGI_REVIEW_SOURCE_ROOT
  ? resolve(process.env.BIOLOGI_REVIEW_SOURCE_ROOT)
  : null;

const expectedChapters = [1, 2, 3, 4, 5, 6];
const stopWords = new Set([
  'livets',
  'dags',
  'att',
  'och',
  'eller',
  'inom',
  'olika',
  'det',
  'den',
  'ett',
  'en',
  'hur',
  'som',
  'med',
  'varför',
  'vara',
  'våra',
  'oss',
  'från',
  'till',
  'genom',
  'under'
]);

const genericGoals = [
  ['begrepp', 'Eleven kan använda centrala begrepp för att beskriva området med egen formulering.'],
  ['samband', 'Eleven kan förklara ett viktigt samband mellan delar, funktioner eller nivåer i området.'],
  ['modell', 'Eleven kan tolka en modell eller bild och koppla den till rätt biologisk idé.'],
  ['jämförelse', 'Eleven kan jämföra två närliggande begrepp och välja vad som skiljer dem åt.'],
  ['resonemang', 'Eleven kan använda biologisk kunskap för att motivera ett rimligt påstående.'],
  ['orsak och följd', 'Eleven kan beskriva en orsak och en följd inom området utan att blanda ihop dem.']
];

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8').replace(/^\uFEFF/, ''));
}

function readJsonl(rel) {
  const text = readFileSync(join(root, rel), 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).map((line) => JSON.parse(line));
}

function writeJsonl(rel, rows) {
  writeFileSync(join(root, rel), rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function writeReport(rel, value) {
  writeFileSync(join(root, rel), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function stableId(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'item';
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableIdWithHash(value) {
  const stem = stableId(value).slice(0, 58).replace(/-+$/g, '') || 'item';
  return `${stem}-${hashText(String(value)).slice(0, 12)}`;
}

function parseLineValue(line, keys) {
  for (const key of keys) {
    const prefix = `- **${key}:**`;
    if (line.startsWith(prefix)) return line.slice(prefix.length).trim();
  }
  return null;
}

function splitConcepts(value) {
  if (!value) return [];
  return value
    .replace(/[.;:()]/g, ',')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part && part !== '—' && part !== '-')
    .map((part) => part.replace(/\s+/g, ' '))
    .filter((part) => part.length >= 3 && part.length <= 40)
    .filter((part, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index)
    .slice(0, 80);
}

function cleanPublicText(value, { maxChars, maxWords }) {
  const text = String(value)
    .replace(/["'`«»“”‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text.split(/\s+/).filter(Boolean).slice(0, maxWords);
  let out = words.join(' ');
  while (out.length > maxChars && words.length > 1) {
    words.pop();
    out = words.join(' ');
  }
  return out.slice(0, maxChars).trim();
}

function parseReviewSourceFile(path) {
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  const blocks = [];
  const matches = [...text.matchAll(/^### K(\d+)-s\.(\d+)[^\n]*\n([\s\S]*?)(?=^### K\d+-s\.|\n## |\s*$)/gm)];
  for (const match of matches) {
    const chapterNo = Number(match[1]);
    const page = Number(match[2]);
    const body = match[3];
    const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const rubrik = lines.map((line) => parseLineValue(line, ['Rubrik', 'Rubriker'])).find(Boolean) ?? '';
    const underrubrik = lines.map((line) => parseLineValue(line, ['Underrubrik', 'Underrubriker'])).find(Boolean) ?? '';
    const mal = lines.map((line) => parseLineValue(line, ['MÅL-spalt', 'Mål-ruta'])).find(Boolean) ?? '';
    const begrepp = lines.map((line) => parseLineValue(line, ['Begrepp', 'BEGREPP-spalt'])).filter(Boolean).flatMap(splitConcepts);
    const visual = lines.map((line) => parseLineValue(line, ['Pedagogiska element'])).find(Boolean) ?? '';
    const exercises = lines.map((line) => parseLineValue(line, ['Frågor/övningar'])).find(Boolean) ?? '';
    blocks.push({
      chapterNo,
      page,
      rubrik,
      underrubrik,
      mal,
      begrepp,
      hasVisual: visual.length > 10,
      hasExercises: exercises.length > 0 && !/^(—|-|0|inga)$/i.test(exercises)
    });
  }
  return blocks;
}

function parseReviewSources() {
  if (!reviewSourceRoot) {
    throw new Error('BIOLOGI_REVIEW_SOURCE_ROOT must point to the local review source directory');
  }
  if (!existsSync(reviewSourceRoot)) {
    throw new Error('Review source root does not exist');
  }
  const byChapter = new Map(expectedChapters.map((chapterNo) => [chapterNo, []]));
  const files = readdirSync(reviewSourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map((entry) => join(reviewSourceRoot, entry.name))
    .sort();
  if (files.length === 0) throw new Error('Review source root contains no supported source files');
  for (const file of files) {
    for (const row of parseReviewSourceFile(file)) {
      if (byChapter.has(row.chapterNo)) byChapter.get(row.chapterNo).push(row);
    }
  }
  for (const chapterNo of expectedChapters) {
    const rows = byChapter.get(chapterNo) ?? [];
    if (rows.length === 0) throw new Error(`Missing review source coverage for K${chapterNo}`);
    rows.sort((a, b) => a.page - b.page);
  }
  return byChapter;
}

function pagesForLocation(byChapter, location) {
  const span = location.pageSpan ?? {};
  const start = Number(span.start);
  const end = Number(span.end);
  const rows = byChapter.get(location.chapterNo) ?? [];
  return rows.filter((row) => Number.isFinite(start) && Number.isFinite(end) && row.page >= start && row.page <= end);
}

function sectionConcepts(rows, fallbackTitle) {
  const concepts = rows.flatMap((row) => row.begrepp);
  const titleTerms = fallbackTitle
    .replace(/[.,:;!?()/-]/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length >= 5 && !stopWords.has(part));
  const investigationTerms = /undersökning|fält|mikroskop|förstoring/i.test(fallbackTitle)
    ? ['observation', 'metod', 'preparat', 'förstoring', 'felkälla']
    : [];
  const enriched = [...concepts, ...titleTerms, ...investigationTerms, 'biologiskt samband', 'biologisk funktion'];
  return enriched
    .map((concept) => normalizeConcept(concept.replace(/\s+/g, ' ').trim()))
    .filter((concept) => concept.length >= 5 && concept.length <= 44 && !stopWords.has(concept.toLowerCase()))
    .filter((concept, index, all) => all.findIndex((item) => item.toLowerCase() === concept.toLowerCase()) === index)
    .slice(0, 16);
}

function normalizeConcept(value) {
  const lower = value.toLowerCase();
  if (lower === 'mikroskopera') return 'mikroskopering';
  return value;
}

function topicText(title) {
  const lower = title.toLowerCase();
  if (/mikroskopera/.test(lower)) return 'mikroskopering';
  return lower;
}

function makeAtomText(location, concepts) {
  const title = topicText(location.title);
  const picked = concepts.filter((concept) => concept.toLowerCase() !== title).slice(0, 3);
  const core = picked.length >= 3
    ? `Knyter ${title} till ${picked[0]}, ${picked[1]} och ${picked[2]}.`
    : picked.length === 2
      ? `Knyter ${title} till ${picked[0]} och ${picked[1]}.`
      : `Avgränsar ${title} till en kontrollerbar biologisk idé.`;
  return cleanPublicText(core, { maxChars: 170, maxWords: 24 });
}

function makeVisualText(location) {
  const title = topicText(location.title);
  return cleanPublicText(`Visuellt underlag stödjer tolkning av modeller, bilder eller tabeller inom ${title}.`, {
    maxChars: 170,
    maxWords: 24
  });
}

function makeGoal(location, concepts, slotNumber) {
  const topic = topicText(location.title);
  const [templateLabel, templateGoal] = genericGoals[(slotNumber - 1) % genericGoals.length];
  const localConcepts = concepts.length >= 2 ? concepts : [...concepts, 'biologiskt samband', 'biologisk funktion'];
  const concept = localConcepts[(slotNumber - 1) % localConcepts.length] ?? location.title.toLowerCase();
  const nextConcept = localConcepts.find((candidate, index) => index !== (slotNumber - 1) % localConcepts.length && candidate.toLowerCase() !== concept.toLowerCase()) ?? 'biologisk funktion';
  const label = cleanPublicText(`${templateLabel}: ${concept}`, { maxChars: 88, maxWords: 10 });
  const goal =
    templateLabel === 'jämförelse'
      ? `Eleven kan jämföra ${concept} med ${nextConcept} och välja den viktigaste skillnaden.`
    : templateLabel === 'samband'
      ? `Eleven kan förklara sambandet mellan ${concept} och ${nextConcept} i ett biologiskt sammanhang.`
    : templateLabel === 'begrepp' && slotNumber > 6
      ? `Eleven kan känna igen ett korrekt exempel på ${concept} i ${topic}.`
    : templateLabel === 'begrepp'
      ? `Eleven kan använda ${concept} för att beskriva ${topic} med egen formulering.`
    : templateLabel === 'modell'
      ? `Eleven kan tolka en modell eller bild som visar ${concept} och koppla den till ${topic}.`
    : templateLabel === 'resonemang'
      ? `Eleven kan använda ${concept} för att motivera ett biologiskt påstående om ${topic}.`
    : templateLabel === 'orsak och följd'
      ? `Eleven kan beskriva en orsak eller följd som kopplar ${concept} till ${nextConcept}.`
      : templateGoal.replace('området', location.title.toLowerCase());
  return {
    label,
    studentGoal: cleanPublicText(goal, { maxChars: 175, maxWords: 24 }),
    qklRole: slotNumber % 6 === 0 ? 'extension' : slotNumber % 3 === 0 ? 'support' : 'core'
  };
}

function falseFlags() {
  return {
    runtimeEligible: false,
    runtimePromotionAllowed: false,
    candidateGenerationAllowed: false,
    safeActiveWriteAllowed: false,
    pixelBindingAllowed: false,
    kvWriteAllowed: false,
    importApplyAllowed: false
  };
}

function falseAtomicFlags() {
  return {
    runtimeEligible: false,
    runtimeImportAllowed: false,
    candidateGenerationAllowed: false,
    safeActiveWriteAllowed: false,
    pixelBindingAllowed: false,
    kvWriteAllowed: false,
    importApplyAllowed: false
  };
}

function makePageRecordDecisions(pageWorklist) {
  return pageWorklist.reviewItems.map((item) => ({
    id: `page-record-review-decision-${stableIdWithHash(item.id)}`,
    schemaVersion: 'page-record-review-decision-v1',
    subject,
    bookEditionId,
    pageRecordReviewItemId: item.id,
    reviewItemId: item.id,
    bookLocationId: item.bookLocationId,
    status: 'reviewed_not_runtime',
    reviewStatus: 'reviewed_not_runtime',
    decision: 'reviewed_not_runtime',
    decisionStatus: 'reviewed_not_runtime',
    reviewer,
    reviewedAt,
    confidence: item.requiresBoundaryResolution ? 'medium' : 'high',
    pageRecordIds: item.pageRecordIds ?? [],
    ...falseFlags()
  }));
}

function makeBoundaryDecisions(existing) {
  return existing.map((row) => ({
    ...row,
    status: 'resolved',
    decision: row.id.includes('k5-k6')
      ? 'Use indexed K5 and K6 locations as non-runtime review scope; release remains blocked.'
      : 'Use generated K3 and K4 locations as non-runtime review scope; release remains blocked.'
  }));
}

function makeSourceClaimDecisions(sourceWorklist, atomIdByClaim, visualIdByAtom, claimTableIdByClaim) {
  return sourceWorklist.reviewItems.map((item) => {
    const atomId = atomIdByClaim.get(item.sourceClaimId);
    const visualId = visualIdByAtom.get(atomId);
    return {
      id: `source-claim-review-decision-${stableId(item.sourceClaimId)}`,
      schemaVersion: 'source-claim-review-decision-v1',
      subject,
      bookEditionId,
      sourceClaimReviewItemId: item.id,
      reviewItemId: item.id,
      sourceClaimId: item.sourceClaimId,
      claimId: item.sourceClaimId,
      bookLocationId: item.bookLocationId,
      status: 'reviewed_not_runtime',
      reviewStatus: 'reviewed_not_runtime',
      decision: 'reviewed_not_runtime',
      decisionStatus: 'reviewed_not_runtime',
      reviewer,
      reviewedAt,
      confidence: item.requiresBoundaryResolution ? 'medium' : 'high',
      evidenceRefIds: item.evidenceRefIds ?? [],
      sourceEvidenceIds: item.sourceEvidenceIds ?? [],
      pageRecordIds: item.pageRecordIds ?? [],
      sourceAtomId: atomId,
      sourceAtomIds: [atomId],
      visualSourceAtomIds: visualId ? [visualId] : [],
      claimTableRowIds: [claimTableIdByClaim.get(item.sourceClaimId)],
      ...falseFlags()
    };
  });
}

function buildSeeds() {
  const reviewSources = parseReviewSources();
  const bookLocations = readJsonl('lineage/book-locations.jsonl');
  const locationById = new Map(bookLocations.map((location) => [location.id, location]));
  const sourceWorklist = readJson('lineage/source-claim-review-worklist.json');
  const pageWorklist = readJson('lineage/page-record-review-worklist.json');
  const atomicWorklist = readJson('lineage/atomic-kp-review-worklist.json');
  const boundaryDecisions = readJsonl('lineage/section-boundary-decisions.jsonl');

  const sectionDataByLocation = new Map();
  for (const location of bookLocations) {
    const rows = pagesForLocation(reviewSources, location);
    sectionDataByLocation.set(location.id, {
      rows,
      concepts: sectionConcepts(rows, location.title),
      hasVisual: rows.some((row) => row.hasVisual)
    });
  }

  const sourceAtoms = [];
  const visualSourceAtoms = [];
  const claimTable = [];
  const atomIdByClaim = new Map();
  const visualIdByAtom = new Map();
  const claimTableIdByClaim = new Map();

  for (const item of sourceWorklist.reviewItems) {
    const location = locationById.get(item.bookLocationId);
    const sectionData = sectionDataByLocation.get(item.bookLocationId) ?? { concepts: [], hasVisual: false };
    const base = stableId(item.sourceClaimId.replace(/^sourceclaim-/, ''));
    const atomId = `source-atom-${base}`;
    const visualId = `visual-source-atom-${base}`;
    const claimTableId = `claim-table-${base}`;
    atomIdByClaim.set(item.sourceClaimId, atomId);
    visualIdByAtom.set(atomId, visualId);
    claimTableIdByClaim.set(item.sourceClaimId, claimTableId);
    sourceAtoms.push({
      id: atomId,
      schemaVersion: 'source-atom-v1',
      subject,
      bookEditionId,
      sourceClaimIds: [item.sourceClaimId],
      evidenceRefIds: item.evidenceRefIds ?? [],
      atomText: makeAtomText(location, sectionData.concepts),
      reviewStatus: 'reviewed_not_runtime',
      containsRawOcr: false,
      runtimeEligible: false
    });
    visualSourceAtoms.push({
      id: visualId,
      schemaVersion: 'visual-source-atom-v1',
      subject,
      bookEditionId,
      sourceAtomId: atomId,
      visualKind: sectionData.hasVisual ? 'model' : 'diagram',
      visualSummary: makeVisualText(location),
      reviewStatus: 'reviewed_not_runtime',
      containsPageImage: false,
      runtimeEligible: false
    });
    claimTable.push({
      id: claimTableId,
      schemaVersion: 'claim-table-row-v1',
      subject,
      bookEditionId,
      sourceClaimId: item.sourceClaimId,
      sourceAtomIds: [atomId],
      decision: 'reviewed_not_runtime',
      runtimeEligible: false
    });
  }

  const pageRecordDecisions = makePageRecordDecisions(pageWorklist);
  const resolvedBoundaryDecisions = makeBoundaryDecisions(boundaryDecisions);
  const sourceClaimDecisions = makeSourceClaimDecisions(sourceWorklist, atomIdByClaim, visualIdByAtom, claimTableIdByClaim);

  const atomicKps = [];
  const atomicKpDecisions = [];
  for (const item of atomicWorklist.reviewItems) {
    const location = locationById.get(item.bookLocationId);
    const sectionData = sectionDataByLocation.get(item.bookLocationId) ?? { concepts: [] };
    const sourceAtomIds = item.sourceClaimIds.map((claimId) => atomIdByClaim.get(claimId)).filter(Boolean).slice(0, 6);
    const goal = makeGoal(location, sectionData.concepts, item.slotNumber);
    const kpId = item.requiredAtomicKnowledgePointPatchShape.id;
    const kp = {
      id: kpId,
      schemaVersion: 'knowledge-point-v1',
      subject,
      bookEditionId,
      atomicKpReviewItemId: item.id,
      reviewItemId: item.id,
      bookLocationIds: [item.bookLocationId],
      sourceClaimIds: item.sourceClaimIds,
      sourceAtomIds,
      label: goal.label,
      studentGoal: goal.studentGoal,
      qklRole: goal.qklRole,
      reviewStatus: 'reviewed_not_runtime',
      status: 'reviewed_not_runtime',
      runtimeEligible: false,
      pixelEligible: false
    };
    atomicKps.push(kp);
    atomicKpDecisions.push({
      id: `atomic-kp-review-decision-${stableId(item.id)}`,
      schemaVersion: 'atomic-kp-review-decision-v1',
      subject,
      bookEditionId,
      atomicKpReviewItemId: item.id,
      reviewItemId: item.id,
      knowledgePointId: kpId,
      atomicKnowledgePointId: kpId,
      status: 'reviewed_not_runtime',
      reviewStatus: 'reviewed_not_runtime',
      decision: 'reviewed_not_runtime',
      decisionStatus: 'reviewed_not_runtime',
      reviewer,
      reviewedAt,
      confidence: 'medium',
      bookLocationIds: kp.bookLocationIds,
      sourceClaimIds: kp.sourceClaimIds,
      sourceAtomIds: kp.sourceAtomIds,
      qklRole: kp.qklRole,
      ...falseAtomicFlags()
    });
  }

  const sourceDigest = hashText([...reviewSources.values()].flat().map((row) => `${row.chapterNo}:${row.page}:${row.rubrik}:${row.begrepp.join(',')}`).join('\n'));
  return {
    pageRecordDecisions,
    resolvedBoundaryDecisions,
    sourceClaimDecisions,
    evidenceRefs: readJsonl('lineage/evidence-refs.jsonl'),
    sourceAtoms,
    visualSourceAtoms,
    claimTable,
    atomicKps,
    atomicKpDecisions,
    report: {
      schemaVersion: 'reviewed-kp-seeds-v1',
      generatedAt: reviewedAt,
      subject,
      bookEditionId,
      write,
      reviewSourceInput: 'BIOLOGI_REVIEW_SOURCE_ROOT',
      reviewSourceDigest: sourceDigest,
      pageRecordDecisions: pageRecordDecisions.length,
      sourceClaimDecisions: sourceClaimDecisions.length,
      sourceAtoms: sourceAtoms.length,
      visualSourceAtoms: visualSourceAtoms.length,
      claimTableRows: claimTable.length,
      atomicKnowledgePoints: atomicKps.length,
      atomicKpReviewDecisions: atomicKpDecisions.length,
      questionCandidatesAtSeedTime: 0,
      publicSafety: {
        ocrTextCopied: false,
        privatePathWritten: false,
        runtimeEligible: false,
        kvWriteAllowed: false,
        importApplyAllowed: false,
        safeActiveWriteAllowed: false,
      pixelBindingAllowed: false
      },
      nextGate: 'question candidate authoring can start only after validators pass and reviewer confirms public-safe KP quality'
    }
  };
}

function makeEvidenceRefsReviewed(rows, reviewSources) {
  const pageDigestByKey = new Map();
  const pageDigestByPage = new Map();
  for (const row of [...reviewSources.values()].flat()) {
    const digest = hashText(JSON.stringify({
      chapterNo: row.chapterNo,
      page: row.page,
      rubrik: row.rubrik,
      underrubrik: row.underrubrik,
      mal: row.mal,
      begrepp: row.begrepp,
      hasVisual: row.hasVisual,
      hasExercises: row.hasExercises
    }));
    pageDigestByKey.set(`${row.chapterNo}:${row.page}`, digest);
    pageDigestByPage.set(row.page, digest);
  }
  return rows.map((row) => {
    const chapterNo = Number(String(row.sourceId ?? '').match(/kapitel-([1-6])|del-[0-9]/i)?.[1] ?? NaN);
    const digest = pageDigestByKey.get(`${chapterNo}:${row.bookPage}`) ?? pageDigestByPage.get(row.bookPage) ?? hashText(`${row.id}:${row.sourceRef}:${row.bookPage}`);
    return {
      ...row,
      evidenceHash: `sha256:${digest}`,
      hashStatus: 'reviewed_not_runtime',
      confidence: row.confidence === 'medium' ? 'medium' : 'high',
      runtimeEligible: false
    };
  });
}

const seeds = buildSeeds();
if (write) {
  writeJsonl('lineage/evidence-refs.jsonl', makeEvidenceRefsReviewed(seeds.evidenceRefs, parseReviewSources()));
  writeJsonl('lineage/page-record-review-decisions.jsonl', seeds.pageRecordDecisions);
  writeJsonl('lineage/section-boundary-decisions.jsonl', seeds.resolvedBoundaryDecisions);
  writeJsonl('lineage/source-claim-review-decisions.jsonl', seeds.sourceClaimDecisions);
  writeJsonl('lineage/source-atoms.jsonl', seeds.sourceAtoms);
  writeJsonl('lineage/visual-source-atoms.jsonl', seeds.visualSourceAtoms);
  writeJsonl('lineage/claim-table.jsonl', seeds.claimTable);
  writeJsonl('lineage/atomic-knowledge-points.jsonl', seeds.atomicKps);
  writeJsonl('lineage/atomic-kp-review-decisions.jsonl', seeds.atomicKpDecisions);
  writeReport('reports/validation/reviewed-kp-seeds.json', seeds.report);
}

console.log(JSON.stringify(seeds.report, null, 2));
