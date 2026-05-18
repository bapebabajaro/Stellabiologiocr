#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

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

const sourceAtoms = readJsonl('lineage/source-atoms.jsonl');
const visualSourceAtoms = readJsonl('lineage/visual-source-atoms.jsonl');
const claimTable = readJsonl('lineage/claim-table.jsonl');
const sourceClaimReviewDecisions = readJsonl('lineage/source-claim-review-decisions.jsonl');
const report = readFileSync(join(root, 'reports/validation/source-atom-readiness.md'), 'utf8');

assert.equal(sourceAtoms.length, 0, 'source-atoms.jsonl must remain empty until SourceClaim review decisions exist');
assert.equal(visualSourceAtoms.length, 0, 'visual-source-atoms.jsonl must remain empty until visual evidence review exists');
assert.equal(claimTable.length, 0, 'claim-table.jsonl must remain empty until reviewed source atoms exist');
if (sourceAtoms.length + visualSourceAtoms.length + claimTable.length > 0) {
  assert.ok(sourceClaimReviewDecisions.length > 0, 'source atoms require SourceClaim review decisions first');
}

for (const pattern of [/C:\\/i, /C:\//i, /rawOcrText/i, /rawOcrExcerpt/i, /studentPin/i, /set-cookie/i, /upstash/i, /private-source:\/\//i]) {
  assert.equal(pattern.test(report), false, `leaky token in source atom report: ${pattern}`);
}

console.log(JSON.stringify({
  ok: true,
  sourceAtoms: sourceAtoms.length,
  visualSourceAtoms: visualSourceAtoms.length,
  claimTableRows: claimTable.length,
  sourceClaimReviewDecisions: sourceClaimReviewDecisions.length
}, null, 2));
