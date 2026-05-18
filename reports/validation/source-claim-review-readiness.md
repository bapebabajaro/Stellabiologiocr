# SourceClaim review readiness - Stella Biologi

Generated: 2026-05-17

Status: `blocked_review_worklist_only`

| Artifact | Count |
|---|---:|
| SourceClaims | 43 |
| BookLocations | 43 |
| Page records | 702 |
| Physical page records | 360 |
| Source evidence rows | 43 |
| Review items | 43 |
| Accepted SourceClaims | 0 |
| Runtime-eligible SourceClaims | 0 |

This worklist prepares human or agent review. It does not accept claims,
promote runtime evidence, generate questions, create pixel bindings, write KV or
apply imports.

Each SourceClaim review item requires page_record review, evidence_ref review,
neutral source_atom, optional visual_source_atom, claim_table row and leak check.
Boundary-linked items remain blocked for runtime until reviewed page records
resolve the boundary decision.

Each item now includes explicit `pageRecordIds`, `sourceEvidenceIds`,
`requiresBoundaryResolution` and allowed non-runtime reviewer decisions:
`reviewed_not_runtime | request_fix | reject`.

Reviewer decisions belong in `lineage/source-claim-review-decisions.jsonl`.
They are valid only after every page-record review item has a
`reviewed_not_runtime` decision and every section-boundary decision is
`resolved`. SourceClaim decisions may prepare source-atom work, but they still
cannot promote runtime evidence, generate questions, bind pixels, write KV or
apply imports. Each decision must include `reviewer` plus ISO-8601 UTC
`reviewedAt`. Decision rows are identifier-only; they must not contain
free-text comments, OCR snippets or textbook copy.

Validate after review:

```powershell
node scripts/validate-source-claim-review-decisions.mjs
node scripts/validate-ocr-contract.mjs
```
