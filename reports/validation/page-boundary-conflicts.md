# Page boundary conflicts - Stella Biologi

Generated: 2026-05-17

## Blocker: K3/K4 boundary

| Source | K3 MANNISKOKROPPEN | K4 LIV OCH HALSA |
|---|---:|---:|
| Sidkarta/README | s.144-207 | s.208-263 |
| Indexering | s.142-205 | s.206-263 |

Decision: keep sidkarta/README as top-level book structure, but keep all K3/K4 SourceClaims non-runtime until accepted page records resolve the boundary.

## Blocker: K5/K6 boundary

| Source | K5 GENETIK OCH GENTEKNIK | K6 EVOLUTION |
|---|---:|---:|
| Sidkarta/README | s.264-327 | s.328-361 |
| Fresh indexering | s.264-323 | s.324-361 |

Decision: generated OCR locations use the fresh K5/K6 index spans because K5 explicitly ends at s.323 and K6 explicitly starts at s.324. Runtime activation remains blocked until page records are accepted.

## Runtime decision

- No SourceClaim may be accepted by this generator.
- No question, QKL, pixel binding or pixel image may become runtime-eligible from this report.
- PPF may consume the sanitized structure as a locked, non-runtime handoff only.
