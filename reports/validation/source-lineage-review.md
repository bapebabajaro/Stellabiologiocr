# Source lineage review - Stella Biologi

Generated: 2026-05-17

Status: source lineage reviewed_not_runtime.

| Artifact | Count | Runtime status |
|---|---:|---|
| BookLocations | 43 | non-runtime |
| SourceClaims | 43 | reviewed_not_runtime, 0 runtimeEligible |
| Page records | 702 | locator-only, reviewed non-runtime |
| Source evidence rows | 43 | locator-only, public-safe metadata |
| Source atoms | 43 | reviewed_not_runtime |
| Visual source atoms | 43 | reviewed_not_runtime |
| Claim table rows | 43 | reviewed_not_runtime |

Runtime remains blocked until separate release/data order. Reviewers must still
verify before promotion:

- each page_record points to the correct private-source locator;
- source_atom is a neutral summary rather than a quote;
- visual_source_atom does not copy textbook images;
- claim_table is linked to the correct BookLocation;
- runtimeEligible remains false until separate release order.
