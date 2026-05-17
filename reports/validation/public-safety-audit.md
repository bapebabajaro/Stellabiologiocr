# Public safety audit - Stella Biologi

Status: pass for tracked public handoff files.

## Previous blocker

The repository previously tracked PDF/OCR-derived artifacts under
`page_renders/`, `ocr_data/` and `margin_samples/`, plus legacy scripts with
machine-specific local path examples. A later adversarial review also found
tracked OCR-derived `indexering/*.md` material that is too close to textbook
notes/questions/captions for public handoff.

## Resolved in this branch

- `page_renders/`, `ocr_data/` and `margin_samples/` are removed from git
  tracking and are ignored as local-only OCR working artifacts.
- `indexering/*.md` is removed from git tracking and is ignored as local-only
  OCR working material under `private-source-local/indexering/`.
- Legacy OCR scripts now resolve local working paths through
  `scripts/ocr_local_paths.py`.
- Contract generators no longer point public evidence at `indexering/*.md`;
  tracked handoff uses only neutral metadata and `private-source://pdfer/...`
  locators.
- Repository history before this sanitizing commit may still contain private or
  OCR-derived material and requires separate history/GitHub remediation before
  public distribution.

## Sanitized contract rules

- No raw OCR text.
- No long textbook excerpts.
- No screenshots or page renders in public handoff output.
- No tracked OCR index markdown in public handoff output.
- No absolute local paths.
- No student data, PINs, cookies or KV keys.
- Private source references use `private-source://pdfer/...`.

## Remaining runtime blockers

The public handoff is sanitized, but runtime activation remains blocked because
SourceClaims, atomic KnowledgePoints, QKL, questions, safe-active metadata,
pixel-bindings and pixel assets are not accepted yet.
