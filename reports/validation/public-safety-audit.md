# Public safety audit - Stella Biologi

Status: pass for tracked public handoff files.

## Previous blocker

The repository previously tracked PDF/OCR-derived artifacts under
`page_renders/`, `ocr_data/` and `margin_samples/`, plus legacy scripts with
machine-specific local path examples.

## Resolved in this branch

- `page_renders/`, `ocr_data/` and `margin_samples/` are removed from git
  tracking and are ignored as local-only OCR working artifacts.
- Legacy OCR scripts now resolve local working paths through
  `scripts/ocr_local_paths.py`.
- `node scripts/validate-ocr-contract.mjs --strict-public-safety` passes with
  zero warnings.

## Sanitized contract rules

- No raw OCR text.
- No long textbook excerpts.
- No screenshots or page renders in public handoff output.
- No absolute local paths.
- No student data, PINs, cookies or KV keys.
- Private source references use `private-source://pdfer/...`.

## Remaining runtime blockers

The public handoff is sanitized, but runtime activation remains blocked because
SourceClaims, atomic KnowledgePoints, QKL, questions, safe-active metadata,
pixel-bindings and pixel assets are not accepted yet.
