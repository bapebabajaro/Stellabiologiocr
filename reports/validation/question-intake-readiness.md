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
- questions/intake-candidates.jsonl may only be populated after
  `atomic_kp_review_ready`.
- No QKL, safe-active metadata, import apply or KV write is allowed.

## Candidate gate now in place

`scripts/validate-question-intake-candidates.mjs` is the OCR-side validator for
future rows in `questions/intake-candidates.jsonl`. It allows the file to stay
empty in the current handoff, but if any candidate exists it requires:

- complete `atomic_kp_review_ready` lineage,
- one BookLocation-backed work item per candidate,
- reviewed non-runtime SourceClaim, source_atom and atomic KnowledgePoint
  references,
- exactly four answer options and one distractor rationale for each wrong
  option,
- candidate-local QKL rows,
- Kemi-compatible runtime projection fields,
- every runtime/import/generation/KV/safe-active/pixel/deploy flag set to
  `false`.

## Next input for the question agent

1. Resolve page-boundary blockers.
2. Accept reviewed SourceClaims.
3. Split section placeholders into atomic KnowledgePoints.
4. Run `node scripts/validate-question-intake-candidates.mjs` before and after
   adding candidate rows.
5. Generate candidate questions from accepted atomic KPs only.
6. Validate answer grounding, QKL, distractor rationales, uniqueness and public
   copy.
