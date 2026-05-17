# Question intake readiness - Stella Biologi

Generated: 2026-05-17

Status: blocked planning only.

The repository now has a 1200-question planning worklist, but no question
candidate is generated or runtime-eligible.

| Metric | Count |
|---|---:|
| Target future candidates | 1200 |
| Planned candidate quota | 1200 |
| Work items | 37 |
| Accepted SourceClaims | 0 |
| Accepted atomic KnowledgePoints | 0 |
| Active questions | 0 |

## Why blocked

- SourceClaims are structure-only and not accepted runtime evidence.
- KnowledgePoint candidates are section placeholders, not atomic KnowledgePoints.
- questions/intake-candidates.jsonl must remain empty until lineage gates pass.
- No QKL, safe-active metadata, import apply or KV write is allowed.

## Next input for the question agent

1. Resolve page-boundary blockers.
2. Accept reviewed SourceClaims.
3. Split section placeholders into atomic KnowledgePoints.
4. Generate candidate questions from accepted KPs only.
5. Validate answer grounding, distractor rationales, uniqueness and public copy.
