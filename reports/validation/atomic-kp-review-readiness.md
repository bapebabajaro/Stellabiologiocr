# Atomic KnowledgePoint review readiness - Stella Biologi

Generated: 2026-05-17

Status: `blocked_review_worklist_only`

| Artifact | Count |
|---|---:|
| Section work items | 37 |
| Planned atomic KP slots | 240 |
| Review items | 240 |
| Accepted atomic KPs | 0 |

The review worklist expands the planning quota into individual atomic KP slots.
It still blocks runtime import, question generation and pixel binding until
SourceClaims, source atoms, QKL and safe-active metadata are reviewed.

Filled atomic KnowledgePoints must be validated separately with
`scripts/validate-atomic-knowledge-points.mjs`. Readiness requires complete slot
coverage and does not authorize runtime import, KV writes, question generation
or pixel binding.
