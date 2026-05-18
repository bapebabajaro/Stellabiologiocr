# PageRecord review readiness - Stella Biologi

Generated: 2026-05-17

Status: `blocked_review_worklist_only`

| Artifact | Count |
|---|---:|
| BookLocations | 43 |
| Page records | 702 |
| Physical page records | 360 |
| Source evidence rows | 43 |
| Review items | 43 |

This worklist groups locator-only page records by BookLocation and also writes
one `physical-page-record` per unique private source page, plus a link table
from BookLocation to physical page. Review may confirm structure and boundary
handling, but it cannot promote runtime evidence, write KV, apply imports,
generate questions or bind pixels.

Reviewer decisions belong in `lineage/page-record-review-decisions.jsonl`.
Allowed decision states are `reviewed_not_runtime`, `request_fix` and `reject`.
Every decision must keep `runtimeEligible`, `runtimePromotionAllowed`,
`candidateGenerationAllowed`, `safeActiveWriteAllowed`, `pixelBindingAllowed`,
`kvWriteAllowed` and `importApplyAllowed` explicitly `false`, and must include
`reviewer` plus ISO-8601 UTC `reviewedAt`. Decision rows are identifier-only;
they must not contain free-text comments, OCR snippets or textbook copy.

Validate after review:

```powershell
node scripts/validate-page-record-review-decisions.mjs
node scripts/validate-ocr-contract.mjs
```
