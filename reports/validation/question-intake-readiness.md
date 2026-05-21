# Question intake readiness - Stella Biologi

Generated: 2026-05-18

Status: offline candidate authoring in progress.

The repository now has a 1200-question planning worklist and reviewed
non-runtime lineage for offline candidate authoring. Offline question
candidates exist for reviewed work items, but no candidate is runtime-eligible.

| Metric | Count |
|---|---:|
| Target future candidates | 1200 |
| Planned candidate quota | 1200 |
| Work items | 37 |
| Reviewed non-runtime SourceClaims | 43 |
| Reviewed atomic KnowledgePoints | 240 |
| Offline candidate questions | 396 |
| Filled work items | 12 |
| Active questions | 0 |

## Remaining runtime blocks

- No QKL, safe-active metadata, import apply or KV write is allowed.
- Every candidate must remain `candidate_review_required`.
- Runtime import, activation, pixel binding and production deploy remain
  forbidden.

## Candidate gate now in place

scripts/validate-question-intake-candidates.mjs is the OCR-side validator for
future rows in questions/intake-candidates.jsonl. It allows the file to stay
empty in the current handoff, but if any candidate exists it requires:

- complete atomic_kp_review_ready lineage,
- complete atomic_kp_review_decisions_ready review decisions,
- one BookLocation-backed work item per candidate,
- reviewed non-runtime SourceClaim, source_atom and atomic KnowledgePoint
  references,
- exactly four answer options and one distractor rationale for each wrong
  option,
- candidate-local QKL rows,
- Kemi-compatible runtime projection fields,
- every runtime/import/generation/KV/safe-active/pixel/deploy flag set to
  false.

## Next input for the question agent

1. Run scripts/validate-question-generation-readiness.mjs before authoring.
2. Run scripts/validate-question-intake-candidates.mjs before and after adding
   candidate rows.
3. Manually author sanitized candidate questions from reviewed atomic KPs only;
   candidateGenerationAllowed remains false for runtime or automated generation.
4. Validate answer grounding, QKL, distractor rationales, uniqueness and public
   copy.
