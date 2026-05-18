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
| Reviewed non-runtime SourceClaims | 0 |
| Runtime-eligible SourceClaims | 0 |

This worklist prepares human or agent review. It does not accept claims for
production, promote runtime evidence, generate questions, create pixel bindings,
write KV or apply imports.

Each SourceClaim review item requires page_record review, evidence_ref review,
boundary resolution when needed and leak check. After a SourceClaim has a
`reviewed_not_runtime` decision, the next lineage step may create neutral
`source_atom`, optional `visual_source_atom` and `claim_table` rows. Those rows
are still public-safe, non-runtime review artifacts, not production evidence.
Boundary-linked items remain blocked for runtime until reviewed page records
resolve the boundary decision.

Each item now includes explicit `pageRecordIds`, `sourceEvidenceIds`,
`requiresBoundaryResolution` and allowed non-runtime reviewer decisions:
`reviewed_not_runtime | request_fix | reject`.
