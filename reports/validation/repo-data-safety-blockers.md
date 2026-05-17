# Repo Data-Safety Status - Stella Biologi

Generated: 2026-05-17

## Resolved Tracked-Artifact Blocker

The repository previously tracked artifacts that do not belong in the public
handoff contract:

- full-page renders under `page_renders/`
- OCR/footer working data under `ocr_data/`
- margin sample images under `margin_samples/`
- legacy scripts with machine-specific local path examples

## Branch Decision

- `page_renders/`, `ocr_data/` and `margin_samples/` are removed from git
  tracking and ignored as local-only OCR working artifacts.
- Legacy OCR scripts use `scripts/ocr_local_paths.py` instead of absolute
  machine paths.
- New contract artifacts in `manifest/`, `lineage/`, `questions/`,
  `assets/pixel-briefs/` and `reports/validation/` are non-runtime and do not
  contain private OCR excerpts.
- PPF may treat the tracked sanitized handoff set as public-safe, but not as
  runtime-ready.

## Remaining Runtime Blockers

Biology cannot become an import source until SourceClaims, atomic
KnowledgePoints, questions, QKL, safe-active metadata, pixel-bindings and pixel
assets are accepted through the normal gates.
