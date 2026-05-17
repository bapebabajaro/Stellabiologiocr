#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const root = process.cwd();
const strictPublicSafety = process.argv.includes('--strict-public-safety');
const baseRequiredFiles = [
  'manifest/book-edition.json',
  'manifest/toc.json',
  'manifest/source-policy.json',
  'lineage/book-locations.jsonl',
  'lineage/source-claims.jsonl',
  'lineage/knowledge-point-candidates.jsonl',
  'questions/intake-candidates.jsonl',
  'assets/pixel-briefs/README.md',
  'reports/validation/ocr-contract-summary.md',
  'reports/validation/page-boundary-conflicts.md'
];
const errors = [];
const warnings = [];
const leakPatterns = [/C:\\/i, /C:\//i, /\bOneDrive\b/i, /\bSkrivbord\b/i, /\/home\/user\/workspace/i, /rawOcrText/i, /rawOcrExcerpt/i, /studentPin/i, /cookie\s*=/i, /set-cookie/i, /upstash/i];
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
    if (entry.name === '.git' || entry.name === '.firecrawl' || entry.name === 'node_modules') continue;
    const abs = join(dir, entry.name);
    const childRel = rel ? rel + '/' + entry.name : entry.name;
    if (entry.isDirectory()) scanRepositoryText(abs, childRel);
    else if (new Set(['.md', '.json', '.jsonl', '.mjs', '.js', '.ts', '.py', '.csv', '.txt']).has(extname(entry.name).toLowerCase())) {
      if (childRel.endsWith('scripts/validate-ocr-contract.mjs')) continue;
      scanText(childRel, readFileSync(abs, 'utf8'), 'warning');
    }
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
for (const rel of baseRequiredFiles.filter((file) => existsSync(join(root, file)))) scanText(rel, readText(rel));
for (const dir of ['page_renders', 'ocr_data', 'margin_samples']) {
  if (existsSync(join(root, dir))) warnings.push(`legacy artifact directory present and not public-safe by itself: ${dir}`);
}
scanRepositoryText(root);
if (strictPublicSafety && warnings.length > 0) errors.push(...warnings.map((warning) => `strict-public-safety: ${warning}`));

if (errors.length === 0 && book) {
  const toc = readJson('manifest/toc.json');
  const locations = readJsonl('lineage/book-locations.jsonl');
  const claims = readJsonl('lineage/source-claims.jsonl');
  const kpCandidates = readJsonl('lineage/knowledge-point-candidates.jsonl');
  const requiredBookFields = ['subject', 'sourceFamily', 'bookId', 'bookEditionId', 'publisher', 'editionYear', 'isbn', 'ocrSourceHash', 'pageMapHash', 'tocStatus', 'licenseScope', 'rotationPolicy'];
  for (const field of requiredBookFields) if (book[field] === undefined || book[field] === null || book[field] === '') errors.push(`book-edition missing ${field}`);
  if (toc.bookEditionId !== book.bookEditionId) errors.push('toc.bookEditionId does not match book edition');
  if (!Array.isArray(toc.chapters) || toc.chapters.length === 0) errors.push('toc has no chapters');
  const chapterIds = new Set();
  const locationIds = new Set();
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
    if (loc.bookEditionId !== book.bookEditionId) errors.push(`BookLocation wrong bookEditionId: ${loc.id}`);
  }
  const claimIds = new Set();
  for (const claim of claims) {
    claimIds.add(claim.id);
    if (!locationIds.has(claim.bookLocationId)) errors.push(`SourceClaim references missing BookLocation: ${claim.id}`);
    if (claim.reviewStatus === 'accepted' && (!Array.isArray(claim.evidenceRefs) || claim.evidenceRefs.length === 0)) errors.push(`accepted SourceClaim lacks evidenceRefs: ${claim.id}`);
    if (claim.runtimeEligible === true && claim.reviewStatus !== 'accepted') errors.push(`runtime-eligible claim is not accepted: ${claim.id}`);
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
console.log(JSON.stringify({ ok: errors.length === 0, errors, warnings }, null, 2));
if (errors.length > 0) process.exit(1);
