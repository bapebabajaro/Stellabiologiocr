#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const root = process.cwd();
const generatedAt = '2026-05-17';
const subject = 'biologi';
const bookEditionId = 'bookedition-stella-biologi-ocr-v1';

const sourceByChapter = {
  1: {
    primarySource: 'Biologi-Stella-kapitel-1',
    privateLocator: 'private-source://pdfer/biologi/Biologi-Stella-kapitel-1',
    indexFile: 'indexering/EKOLOGI.md'
  },
  2: {
    primarySource: 'Stella-biolgi-kapitel-2',
    privateLocator: 'private-source://pdfer/biologi/Stella-biolgi-kapitel-2',
    indexFile: 'indexering/MILJO.md'
  },
  3: {
    primarySource: 'Biologi-del-1 + Biologi-del-2',
    privateLocator: 'private-source://pdfer/biologi/Biologi-del-1+Biologi-del-2',
    indexFile: 'indexering/MANNISKOKROPPEN.md'
  },
  4: {
    primarySource: 'Biologi-del-2',
    privateLocator: 'private-source://pdfer/biologi/Biologi-del-2',
    indexFile: 'indexering/LIV_OCH_HALSA.md'
  },
  5: {
    primarySource: 'Biologi-del-3',
    privateLocator: 'private-source://pdfer/biologi/Biologi-del-3',
    indexFile: 'indexering/GENETIK_OCH_GENTEKNIK.md'
  },
  6: {
    primarySource: 'Biologi-del-3',
    privateLocator: 'private-source://pdfer/biologi/Biologi-del-3',
    indexFile: 'indexering/EVOLUTION.md'
  }
};

const chapterPlan = [
  {
    chapterNo: 1,
    chapterId: 'biologi-kap1',
    title: 'EKOLOGI',
    pageSpan: { start: 2, end: 77 },
    status: 'indexed',
    confidence: 'high',
    subchapters: [
      section(1, 1, 'Livets utveckling och mångfald', 10, 19),
      section(1, 2, 'Dags att mikroskopera', 20, 21, 'investigation'),
      section(1, 3, 'Jordens biologiska mångfald', 22, 37),
      section(1, 4, 'Fältundersökning', 38, 39, 'investigation'),
      section(1, 5, 'Energi och material i ekosystemen', 40, 57),
      section(1, 6, 'Klyvöppningar i olika förstoring', 58, 59, 'investigation'),
      section(1, 7, 'Anpassningar i samspel med andra organismer', 60, 71),
      section(1, 8, 'Ekosystemtjänster', 72, 77)
    ]
  },
  {
    chapterNo: 2,
    chapterId: 'biologi-kap2',
    title: 'MILJÖ OCH HÅLLBAR UTVECKLING',
    pageSpan: { start: 78, end: 143 },
    status: 'indexed_with_page_gap',
    confidence: 'medium',
    sourceNote: 'Indexeringen täcker s.78-141; sidkartan markerar luckor s.90-112 och s.142-143. Runtime kräver accepterade page records.',
    subchapters: [
      section(2, 1, 'Hållbar utveckling', 80, 85, 'section', 'indexed_with_page_gap', 'medium'),
      section(2, 2, 'Global uppvärmning', 86, 101, 'section', 'indexed_with_page_gap', 'medium'),
      section(2, 3, 'Klimatförändringar - åtgärder och konsekvenser', 102, 113, 'section', 'indexed_with_page_gap', 'medium'),
      section(2, 4, 'Hållbar konsumtion och produktion', 114, 121, 'section', 'indexed_with_page_gap', 'medium'),
      section(2, 5, 'Vatten och miljö', 122, 129, 'section', 'indexed_with_page_gap', 'medium'),
      section(2, 6, 'Naturbruk och biologisk mångfald', 130, 141, 'section', 'indexed_with_page_gap', 'medium')
    ]
  },
  {
    chapterNo: 3,
    chapterId: 'biologi-kap3',
    title: 'MÄNNISKOKROPPEN',
    pageSpan: { start: 144, end: 207 },
    status: 'indexed_with_boundary_conflict',
    confidence: 'medium',
    sourceNote: 'Sidkarta/README anger K3 s.144-207; indexeringen börjar på s.142 och slutar på s.205. Runtime kräver boundary-beslut från page records.',
    subchapters: [
      section(3, 1, 'Celler, organ och organsystem', 144, 153, 'section', 'indexed_with_boundary_conflict', 'medium'),
      section(3, 2, 'Matspjälkningen', 154, 161, 'section', 'indexed_with_boundary_conflict', 'medium'),
      section(3, 3, 'Andningssystemet och urinorganen', 162, 169, 'section', 'indexed_with_boundary_conflict', 'medium'),
      section(3, 4, 'Blodomloppet', 170, 183, 'section', 'indexed_with_boundary_conflict', 'medium'),
      section(3, 5, 'Nervsystemet', 184, 190, 'section', 'indexed_with_boundary_conflict', 'medium'),
      section(3, 6, 'Hjärnan och hormonsystemet', 191, 197, 'section', 'indexed_with_boundary_conflict', 'medium'),
      section(3, 7, 'Fortplantningen', 198, 205, 'section', 'indexed_with_boundary_conflict', 'medium')
    ]
  },
  {
    chapterNo: 4,
    chapterId: 'biologi-kap4',
    title: 'LIV OCH HÄLSA',
    pageSpan: { start: 208, end: 263 },
    status: 'indexed_with_boundary_conflict',
    confidence: 'medium',
    sourceNote: 'Sidkarta/README anger K4 s.208-263; indexeringen börjar på s.206. Runtime kräver boundary-beslut från page records.',
    subchapters: [
      section(4, 1, 'Fysisk hälsa', 208, 215, 'section', 'indexed_with_boundary_conflict', 'medium'),
      section(4, 2, 'Psykisk hälsa', 216, 225, 'section', 'indexed_with_boundary_conflict', 'medium'),
      section(4, 3, 'Hälsa och livsstil', 226, 235, 'section', 'indexed_with_boundary_conflict', 'medium'),
      section(4, 4, 'Droger och beroende', 236, 245, 'section', 'indexed_with_boundary_conflict', 'medium'),
      section(4, 5, 'Sexuell hälsa', 246, 253, 'section', 'indexed_with_boundary_conflict', 'medium'),
      section(4, 6, 'Sexualitet och relationer', 254, 263, 'section', 'indexed_with_boundary_conflict', 'medium')
    ]
  },
  {
    chapterNo: 5,
    chapterId: 'biologi-kap5',
    title: 'GENETIK OCH GENTEKNIK',
    pageSpan: { start: 264, end: 323 },
    status: 'indexed_with_boundary_conflict',
    confidence: 'medium',
    sourceNote: 'README/sidkarta anger K5 s.264-327, men den färska indexeringen slutar K5 på s.323 och anger s.324-325 som K6-start. Runtime kräver boundary-beslut från page records.',
    subchapters: parseDelkapitel(5, 'indexering/GENETIK_OCH_GENTEKNIK.md', 323, 'indexed_with_boundary_conflict', 'medium')
  },
  {
    chapterNo: 6,
    chapterId: 'biologi-kap6',
    title: 'EVOLUTION',
    pageSpan: { start: 324, end: 361 },
    status: 'indexed_with_boundary_conflict',
    confidence: 'medium',
    sourceNote: 'README/sidkarta anger K6 s.328-361, men den färska indexeringen börjar K6 på s.324. Runtime kräver boundary-beslut från page records.',
    subchapters: parseDelkapitel(6, 'indexering/EVOLUTION.md', 361, 'indexed_with_boundary_conflict', 'medium')
  }
];

function section(chapterNo, sectionNo, title, start, end, sectionType = 'section', status = 'indexed', confidence = 'high') {
  return {
    sectionId: `biologi-kap${chapterNo}-sec${String(sectionNo).padStart(2, '0')}`,
    title,
    sectionType,
    pageSpan: { start, end },
    status,
    confidence,
    evidenceRefs: []
  };
}

function parseDelkapitel(chapterNo, rel, chapterEnd, status, confidence) {
  const text = readFileSync(join(root, rel), 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  const starts = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^## Delkapitel\s+(\d+)[:\s—-]+(.+?)\s*(?:\((?:s\.)?([^)]*)\))?\s*$/.exec(lines[i]);
    if (!match) continue;
    const sectionNo = Number(match[1]);
    const title = cleanTitle(match[2]);
    const explicitPage = firstPageFromText(match[3] ?? '');
    const nextPage = explicitPage ?? firstPageAfter(lines, i + 1, chapterNo);
    if (!nextPage) throw new Error(`Could not determine start page for ${rel} delkapitel ${sectionNo}`);
    starts.push({ sectionNo, title, start: nextPage });
  }
  return starts.map((item, index) => {
    const next = starts[index + 1];
    return section(chapterNo, item.sectionNo, item.title, item.start, next ? next.start - 1 : chapterEnd, 'section', status, confidence);
  });
}

function cleanTitle(value) {
  return value
    .replace(/\s+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstPageFromText(value) {
  const match = /(\d{1,3})/.exec(value);
  return match ? Number(match[1]) : null;
}

function firstPageAfter(lines, startIndex, chapterNo) {
  const pageRegex = new RegExp(`^###\\s+K${chapterNo}-s\\.(\\d+)\\b`);
  for (let i = startIndex; i < lines.length; i += 1) {
    const match = pageRegex.exec(lines[i]);
    if (match) return Number(match[1]);
  }
  return null;
}

function evidenceRefsFor(chapterNo, pageSpan) {
  const source = sourceByChapter[chapterNo];
  return [
    { kind: 'repo_file', locator: source.indexFile, confidence: chapterNo <= 2 ? 'high' : 'medium' },
    {
      kind: 'private_source',
      locator: `${source.privateLocator}#book-pages-${pageSpan.start}-${pageSpan.end}`,
      confidence: chapterNo <= 2 ? 'high' : 'medium'
    }
  ];
}

function chapterWithEvidence(chapter) {
  const source = sourceByChapter[chapter.chapterNo];
  return {
    ...chapter,
    primarySource: source.primarySource,
    evidenceRefs: evidenceRefsFor(chapter.chapterNo, chapter.pageSpan),
    subchapters: chapter.subchapters.map((subchapter) => ({
      ...subchapter,
      evidenceRefs: evidenceRefsFor(chapter.chapterNo, subchapter.pageSpan)
    }))
  };
}

const chapters = chapterPlan.map(chapterWithEvidence);

const toc = {
  schemaVersion: 'ocr-toc-v1',
  generatedAt,
  subject,
  bookEditionId,
  tocStatus: 'full_indexed_with_blockers',
  sourceSummary: Object.values(sourceByChapter).map((source) => ({
    kind: 'repo_file',
    locator: source.indexFile,
    confidence: source.indexFile.includes('GENETIK') || source.indexFile.includes('EVOLUTION') ? 'medium' : 'high'
  })),
  chapters,
  boundaryDecisions: [
    {
      id: 'bio-boundary-k3-k4-20260517',
      status: 'blocked_until_page_records_accepted',
      issue: 'Sidkarta/README and indexering disagree on K3/K4 boundaries.'
    },
    {
      id: 'bio-boundary-k5-k6-20260517',
      status: 'blocked_until_page_records_accepted',
      issue: 'Sidkarta/README say K5 ends s.327 and K6 starts s.328; fresh index says K5 ends s.323 and K6 starts s.324.'
    }
  ],
  blockers: [
    'K3/K4 page boundary conflict between sidkarta/README and indexering files.',
    'K5/K6 page boundary conflict between sidkarta/README and the fresh K5/K6 indexering files.',
    'Repository public-safety blocker remains: legacy PDF-derived artifacts and local path patterns exist.',
    'No runtime SourceClaim may be accepted before exact OCR evidence refs and page records are reviewed.'
  ]
};

const bookLocations = [];
const sourceClaims = [];
const kpCandidates = [];
const pageRecords = [];
const sourceEvidence = [];

for (const chapter of chapters) {
  bookLocations.push(toBookLocation(chapter, null, 'chapter'));
  sourceClaims.push(toSourceClaim(chapter, null, 'chapter'));
  sourceEvidence.push(toSourceEvidence(chapter, null, 'chapter'));
  addPageRecords(chapter, null, 'chapter');
  for (const subchapter of chapter.subchapters) {
    bookLocations.push(toBookLocation(chapter, subchapter, subchapter.sectionType));
    const claim = toSourceClaim(chapter, subchapter, subchapter.sectionType);
    sourceClaims.push(claim);
    sourceEvidence.push(toSourceEvidence(chapter, subchapter, subchapter.sectionType));
    kpCandidates.push(toKpCandidate(chapter, subchapter, claim.id));
    addPageRecords(chapter, subchapter, subchapter.sectionType);
  }
}

function toBookLocation(chapter, subchapter, locationKind) {
  const pageSpan = subchapter?.pageSpan ?? chapter.pageSpan;
  return {
    id: subchapter ? `${bookEditionId}:${subchapter.sectionId}` : `${bookEditionId}:${chapter.chapterId}`,
    schemaVersion: 'book-location-v1',
    bookEditionId,
    subject,
    chapterId: chapter.chapterId,
    chapterNo: chapter.chapterNo,
    sectionId: subchapter?.sectionId ?? null,
    title: subchapter?.title ?? chapter.title,
    locationKind,
    pageSpan,
    status: subchapter?.status ?? chapter.status,
    confidence: subchapter?.confidence ?? chapter.confidence,
    sourceRefs: evidenceRefsFor(chapter.chapterNo, pageSpan),
    sourceNote: subchapter ? chapter.sourceNote : chapter.sourceNote
  };
}

function slug(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toSourceClaim(chapter, subchapter, locationKind) {
  const title = subchapter?.title ?? chapter.title;
  const locationId = subchapter ? `${bookEditionId}:${subchapter.sectionId}` : `${bookEditionId}:${chapter.chapterId}`;
  return {
    id: `sourceclaim-${bookEditionId}-${subchapter?.sectionId ?? chapter.chapterId}`,
    schemaVersion: 'source-claim-v1',
    bookEditionId,
    subject,
    bookLocationId: locationId,
    claimType: 'toc_structure',
    claimText: `${title} finns som ${locationKind} i ${bookEditionId}.`,
    reviewStatus: 'public_or_index_reference_only',
    evidenceQuality: subchapter?.confidence ?? chapter.confidence,
    evidenceRefs: evidenceRefsFor(chapter.chapterNo, subchapter?.pageSpan ?? chapter.pageSpan),
    runtimeEligible: false,
    blocker: 'Structure-only claim; not accepted runtime evidence.'
  };
}

function toKpCandidate(chapter, subchapter, sourceClaimId) {
  return {
    id: `kp-candidate-${bookEditionId}-${subchapter.sectionId}`,
    schemaVersion: 'knowledge-point-candidate-v1',
    subject,
    bookEditionId,
    bookLocationId: `${bookEditionId}:${subchapter.sectionId}`,
    chapterId: chapter.chapterId,
    sectionId: subchapter.sectionId,
    label: subchapter.title,
    candidateKind: 'section_placeholder',
    status: 'blocked_until_source_claims_accepted',
    pixelEligible: false,
    sourceClaimIds: [sourceClaimId],
    notes: 'Placeholder for OCR agent handoff only. Must be split into atomic KnowledgePoints before runtime.'
  };
}

function toSourceEvidence(chapter, subchapter, evidenceKind) {
  const pageSpan = subchapter?.pageSpan ?? chapter.pageSpan;
  const idSeed = `${chapter.chapterId}:${subchapter?.sectionId ?? 'chapter'}:${pageSpan.start}-${pageSpan.end}`;
  return {
    id: `evidence-${slug(idSeed)}`,
    schemaVersion: 'source-evidence-v1',
    subject,
    bookEditionId,
    evidenceKind,
    bookLocationId: subchapter ? `${bookEditionId}:${subchapter.sectionId}` : `${bookEditionId}:${chapter.chapterId}`,
    sourceRefs: evidenceRefsFor(chapter.chapterNo, pageSpan),
    publicSafe: true,
    containsRawOcr: false,
    containsPageImage: false,
    runtimeEligible: false
  };
}

function addPageRecords(chapter, subchapter, locationKind) {
  const pageSpan = subchapter?.pageSpan ?? chapter.pageSpan;
  const locationId = subchapter ? `${bookEditionId}:${subchapter.sectionId}` : `${bookEditionId}:${chapter.chapterId}`;
  const source = sourceByChapter[chapter.chapterNo];
  for (let page = pageSpan.start; page <= pageSpan.end; page += 1) {
    pageRecords.push({
      id: `page-record-${bookEditionId}-s${page}-${slug(locationId)}`,
      schemaVersion: 'page-record-v1',
      subject,
      bookEditionId,
      bookLocationId: locationId,
      chapterId: chapter.chapterId,
      sectionId: subchapter?.sectionId ?? null,
      locationKind,
      bookPage: page,
      sourceRef: `${source.privateLocator}#book-page-${page}`,
      pageRecordStatus: 'locator_only_pending_review',
      containsRawOcr: false,
      containsPageImage: false,
      runtimeEligible: false
    });
  }
}

function writeJson(rel, value) {
  writeFileSync(join(root, rel), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeJsonl(rel, rows) {
  writeFileSync(join(root, rel), rows.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8');
}

function hashFile(rel) {
  return createHash('sha256').update(readFileSync(join(root, rel))).digest('hex');
}

writeJson('manifest/toc.json', toc);
writeJsonl('lineage/book-locations.jsonl', bookLocations);
writeJsonl('lineage/source-claims.jsonl', sourceClaims);
writeJsonl('lineage/knowledge-point-candidates.jsonl', kpCandidates);
writeJsonl('lineage/page-records.jsonl', pageRecords);
writeJsonl('lineage/source-evidence.jsonl', sourceEvidence);
writeJsonl('lineage/section-boundary-decisions.jsonl', [
  {
    id: 'bio-boundary-k3-k4-20260517',
    schemaVersion: 'section-boundary-decision-v1',
    subject,
    bookEditionId,
    status: 'blocked_until_page_records_accepted',
    affectedChapters: ['biologi-kap3', 'biologi-kap4'],
    sidkartaSpan: { kap3: '144-207', kap4: '208-263' },
    indexeringSpan: { kap3: '142-205', kap4: '206-263' },
    decision: 'Keep manifest top-level spans from sidkarta/README but keep SourceClaims non-runtime until reviewed.'
  },
  {
    id: 'bio-boundary-k5-k6-20260517',
    schemaVersion: 'section-boundary-decision-v1',
    subject,
    bookEditionId,
    status: 'blocked_until_page_records_accepted',
    affectedChapters: ['biologi-kap5', 'biologi-kap6'],
    sidkartaSpan: { kap5: '264-327', kap6: '328-361' },
    indexeringSpan: { kap5: '264-323', kap6: '324-361' },
    decision: 'Use fresh K5/K6 index spans for generated locations; keep all SourceClaims non-runtime until page records are accepted.'
  }
]);

writeFileSync(join(root, 'reports/validation/page-boundary-conflicts.md'), `# Page boundary conflicts - Stella Biologi

Generated: ${generatedAt}

## Blocker: K3/K4 boundary

| Source | K3 MANNISKOKROPPEN | K4 LIV OCH HALSA |
|---|---:|---:|
| Sidkarta/README | s.144-207 | s.208-263 |
| Indexering | s.142-205 | s.206-263 |

Decision: keep sidkarta/README as top-level book structure, but keep all K3/K4 SourceClaims non-runtime until accepted page records resolve the boundary.

## Blocker: K5/K6 boundary

| Source | K5 GENETIK OCH GENTEKNIK | K6 EVOLUTION |
|---|---:|---:|
| Sidkarta/README | s.264-327 | s.328-361 |
| Fresh indexering | s.264-323 | s.324-361 |

Decision: generated OCR locations use the fresh K5/K6 index spans because K5 explicitly ends at s.323 and K6 explicitly starts at s.324. Runtime activation remains blocked until page records are accepted.

## Runtime decision

- No SourceClaim may be accepted by this generator.
- No question, QKL, pixel binding or pixel image may become runtime-eligible from this report.
- PPF may consume the sanitized structure as a locked, non-runtime handoff only.
`, 'utf8');

writeFileSync(join(root, 'reports/validation/page-coverage-matrix.md'), `# Page coverage matrix - Stella Biologi

Generated: ${generatedAt}

| Chapter | Generated span | Index status | Runtime note |
|---|---:|---|---|
| K1 EKOLOGI | 2-77 | indexed | structure-only |
| K2 MILJO OCH HALLBAR UTVECKLING | 78-143 | indexed with page gap | missing/uncertain pages remain non-runtime |
| K3 MANNISKOKROPPEN | 144-207 | indexed with boundary conflict | sidkarta/indexering disagreement |
| K4 LIV OCH HALSA | 208-263 | indexed with boundary conflict | sidkarta/indexering disagreement |
| K5 GENETIK OCH GENTEKNIK | 264-323 | indexed with boundary conflict | K5/K6 boundary disagreement |
| K6 EVOLUTION | 324-361 | indexed with boundary conflict | K5/K6 boundary disagreement |

Generated BookLocations: ${bookLocations.length}
Generated SourceClaims: ${sourceClaims.length}
Generated KP candidates: ${kpCandidates.length}
Generated page records: ${pageRecords.length}
`, 'utf8');

writeFileSync(join(root, 'reports/validation/ocr-contract-summary.md'), `# OCR contract summary - Stella Biologi

Generated: ${generatedAt}

The repository now has a complete non-runtime K1-K6 structure generated from the available index files.

| Artifact | Count |
|---|---:|
| Chapters | ${chapters.length} |
| Sections/investigations | ${kpCandidates.length} |
| BookLocations | ${bookLocations.length} |
| SourceClaims | ${sourceClaims.length} |
| Page records | ${pageRecords.length} |
| Source evidence rows | ${sourceEvidence.length} |

All SourceClaims remain public_or_index_reference_only and runtimeEligible:false.
All KnowledgePoint candidates remain placeholders with pixelEligible:false.
`, 'utf8');

writeJson('reports/validation/ocr-agent-worklist.json', {
  schemaVersion: 'ocr-agent-worklist-v1',
  generatedAt,
  subject,
  bookEditionId,
  runtimeActivationAllowed: false,
  counts: {
    chapters: chapters.length,
    bookLocations: bookLocations.length,
    sourceClaims: sourceClaims.length,
    knowledgePointCandidates: kpCandidates.length,
    pageRecords: pageRecords.length,
    sourceEvidence: sourceEvidence.length
  },
  nextWork: [
    'Resolve K3/K4 and K5/K6 page boundary conflicts from accepted page records.',
    'Split section placeholders into atomic KnowledgePoint candidates.',
    'Attach reviewed source_atom and visual_source_atom evidence without raw OCR excerpts.',
    'Only after accepted SourceClaims: generate public question candidates and QKL.',
    'Only after accepted KPs/QKL: create pixel bindings and pixel briefs.'
  ],
  blockers: toc.blockers
});

writeFileSync(join(root, 'lineage/README.md'), `# Stella Biologi lineage

Generated: ${generatedAt}

This lineage package is a non-runtime contract for the current OCR index state.

- K1-K6 have generated chapter locations.
- Section-level locations exist where the index files expose delkapitel or existing TOC section boundaries.
- SourceClaims are structure-only and not accepted.
- KnowledgePoint candidates are section placeholders only.
- Page records and source evidence contain locators, not raw OCR text or page images.

Runtime activation remains blocked until accepted SourceClaims, atomic KnowledgePoints, QKL, safe-active question metadata, pixel bindings and five-reviewer visual PASS exist.
`, 'utf8');

writeFileSync(join(root, 'reports/validation/rotation-readiness.md'), `# Rotation readiness - Stella Biologi

Generated: ${generatedAt}

Status: ` + '`contract-valid-content-pending`' + `

The BookEdition is structurally rotatable: the current generated package is scoped by subject, source family, BookEdition id, private-source locators and additive rotation policy.

Not ready for runtime:

- public-safety blocker remains in this repository;
- boundary conflicts remain for K3/K4 and K5/K6;
- no accepted SourceClaims exist;
- no atomic accepted KnowledgePoints exist;
- no safe-active questions, QKL or pixel bindings exist.
`, 'utf8');

writeFileSync(join(root, 'reports/validation/source-lineage-review.md'), `# Source lineage review - Stella Biologi

Generated: ${generatedAt}

Status: locator lineage generated, not accepted.

| Artifact | Count | Runtime status |
|---|---:|---|
| BookLocations | ${bookLocations.length} | non-runtime |
| SourceClaims | ${sourceClaims.length} | 0 accepted, 0 runtimeEligible |
| Page records | ${pageRecords.length} | locator-only, pending review |
| Source evidence rows | ${sourceEvidence.length} | locator-only, public-safe metadata |

Reviewers must still verify:

- each page_record points to the correct private-source locator;
- source_atom is a neutral summary rather than a quote;
- visual_source_atom does not copy textbook images;
- claim_table is linked to the correct BookLocation;
- boundary conflicts are resolved from accepted page records;
- runtimeEligible remains false until separate release order.
`, 'utf8');

writeFileSync(join(root, 'reports/validation/ocr-quality-report.md'), `# OCR quality report - Stella Biologi

Generated: ${generatedAt}

Status: indexed, quality review pending.

The current index files cover K1-K6 structurally, including fresh K5/K6 indexing.
This report does not contain raw OCR text.

## Still required

- page coverage review by source id;
- missing or duplicate printed page review;
- confidence bands per chapter and page range;
- table and image zones requiring manual review;
- K3/K4 boundary resolution;
- K5/K6 boundary resolution;
- hashes for private evidence records.

## Current generated counts

| Item | Count |
|---|---:|
| BookLocations | ${bookLocations.length} |
| SourceClaims | ${sourceClaims.length} |
| KnowledgePoint candidates | ${kpCandidates.length} |
| Page records | ${pageRecords.length} |
| Source evidence rows | ${sourceEvidence.length} |
`, 'utf8');

writeFileSync(join(root, 'reports/validation/pixel-readiness-gates.md'), `# Pixel readiness gates - Stella Biologi

Generated: ${generatedAt}

Status: blocked.

No pixel image or live visual asset may be produced from this repo yet.

## Current state

- SourceClaims: ${sourceClaims.length}, accepted: 0, runtimeEligible: 0.
- KnowledgePoint candidates: ${kpCandidates.length}, all section placeholders, pixelEligible: 0.
- Pixel bindings: 0.
- Five-reviewer PASS batches: 0.

## Required order

1. Resolve source safety and page-boundary blockers.
2. Review page records with private-source evidence refs.
3. Accept SourceClaims.
4. Promote atomic KnowledgePoints.
5. Build QKL and sanitized public question copy.
6. Build pixel bindings from accepted KPs.
7. Create pixel briefs.
8. Generate candidate images.
9. Run the five-reviewer protocol.
10. Only after PASS, create a PPF runtime handoff.

## Visual invariants

- Coordinate space: 650x480.
- Reference target: 1672x941.
- Inactive pixels are invisible.
- Active pixels reveal original image pixels.
- The image must match the chemistry reference art in density, color balance,
  reveal behavior and student feedback function.
- No textbook image, OCR text, local path, internal ID or student data may be
  embedded in the asset or metadata.
`, 'utf8');

const generatedHashInputs = [
  'manifest/toc.json',
  'lineage/book-locations.jsonl',
  'lineage/source-claims.jsonl',
  'lineage/knowledge-point-candidates.jsonl',
  'lineage/page-records.jsonl',
  'lineage/source-evidence.jsonl'
].map((rel) => ({ rel, sha256: hashFile(rel) }));

writeJson('reports/validation/generated-contract-hashes.json', {
  schemaVersion: 'generated-contract-hashes-v1',
  generatedAt,
  subject,
  bookEditionId,
  files: generatedHashInputs
});

console.log(JSON.stringify({
  ok: true,
  chapters: chapters.length,
  bookLocations: bookLocations.length,
  sourceClaims: sourceClaims.length,
  knowledgePointCandidates: kpCandidates.length,
  pageRecords: pageRecords.length,
  sourceEvidence: sourceEvidence.length
}, null, 2));
