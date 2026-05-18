# Source atom readiness - Stella Biologi

Generated: 2026-05-17

Status: `blocked_empty_until_review`

The tracked atom ledgers are intentionally empty:

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
