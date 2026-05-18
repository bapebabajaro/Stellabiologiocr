# Source atom readiness - Stella Biologi

Generated: 2026-05-17

Status: `blocked_empty_until_source_claim_review`

The tracked atom ledgers are intentionally empty in the current handoff:

- `lineage/source-atoms.jsonl`
- `lineage/visual-source-atoms.jsonl`
- `lineage/claim-table.jsonl`

Atoms must be neutral, public-safe, reviewer-authored summaries linked to
reviewed non-runtime SourceClaim decisions and locator evidence. They must not
contain raw OCR, long textbook quotes, student data, KV data or absolute local
paths.

`lineage/source-claim-review-decisions.jsonl` may be populated before this atom
stage, but those decisions must remain `reviewed_not_runtime | request_fix |
reject` with `reviewer`, ISO-8601 UTC `reviewedAt`, and all
runtime/import/KV/pixel/question flags explicitly `false`. Free-text content
belongs only in later validated atom/claim-table rows, not in review decisions.

After SourceClaim review is complete, `lineage/source-atoms.jsonl`,
`lineage/visual-source-atoms.jsonl` and `lineage/claim-table.jsonl` may be
filled. The validator still keeps them non-runtime:

- source atom text and visual summaries must be short single-line public
  summaries, not copied textbook prose;
- atom evidence refs must belong to the reviewed SourceClaim worklist item;
- every source atom must have a matching claim-table row;
- `source_atom_review_ready` requires atom and claim-table coverage for every
  reviewed SourceClaim, and every visual atom must also be
  `reviewed_not_runtime`;
- `runtimeEligible`, KV/import/question/pixel promotion and page images remain
  blocked.

Validate after atom work:

```powershell
node scripts/validate-source-atoms.mjs
node scripts/validate-ocr-contract.mjs
```
