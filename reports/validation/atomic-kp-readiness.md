# Atomic KnowledgePoint readiness - Stella Biologi

Generated: 2026-05-17

Status: blocked planning only.

| Metric | Count |
|---|---:|
| Target future questions | 1200 |
| Target questions per atomic KP | 5 |
| Planned atomic KPs | 240 |
| Work items | 37 |
| Accepted SourceClaims | 0 |
| Accepted atomic KPs | 0 |

## Why blocked

- Current KP candidates are section placeholders only.
- SourceClaims are structure/index references, not accepted runtime evidence.
- Page records and source atoms are still pending reviewer acceptance.
- Pixel bindings and question generation remain forbidden.
- `atomic_kp_review_ready` requires one public-safe atomic KP for every
  planned review slot, complete source-atom readiness, matching SourceClaim and
  BookLocation links, a QKL role and `runtimeEligible:false`.

## Reviewer handoff

Each work item says how many atomic KPs the OCR/content reviewer should derive
from that section after accepted evidence exists. Every atom must be narrow,
measurable, public-safe and linked back to accepted SourceClaims. The next
question batch must consume only accepted atomic KPs.

Validate after atomic KP authoring:

```powershell
node scripts/validate-atomic-knowledge-points.mjs
node scripts/validate-ocr-contract.mjs
```
