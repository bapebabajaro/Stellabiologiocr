# SourceClaim review readiness - Stella Biologi

Generated: 2026-05-17

Status: `source_claim_review_ready`

| Artifact | Count |
|---|---:|
| SourceClaims | 43 |
| BookLocations | 43 |
| Page records | 702 |
| Physical page records | 360 |
| Source evidence rows | 43 |
| Review items | 43 |
| Reviewed non-runtime SourceClaims | 43 |
| Runtime-eligible SourceClaims | 0 |

The worklist has reviewed non-runtime decisions for all SourceClaims. It does
not accept claims for production, promote runtime evidence, generate active
questions, create pixel bindings, write KV or apply imports.

Each SourceClaim review item is linked to page_record review, evidence_ref
review, boundary resolution when needed and leak check. The downstream
`source_atom`, optional `visual_source_atom` and `claim_table` rows are still
public-safe, non-runtime review artifacts, not production evidence.

Each item now includes explicit `pageRecordIds`, `sourceEvidenceIds`,
`requiresBoundaryResolution` and allowed non-runtime reviewer decisions:
`reviewed_not_runtime | request_fix | reject`.
