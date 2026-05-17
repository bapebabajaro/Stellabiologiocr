# Public safety audit - Stella Biologi

Status: failed for existing repository, pass only for new contract files.

## Existing blocker

The repository already tracks PDF/OCR-derived artifacts under `page_renders/`,
`ocr_data/` and `margin_samples/`, plus legacy scripts with local path examples.
Those files predate this contract and were not removed in this branch.

## Sanitized contract rules

- No raw OCR text.
- No long textbook excerpts.
- No screenshots or page renders in public handoff output.
- No absolute local paths.
- No student data, PINs, cookies or KV keys.
- Private source references use `private-source://pdfer/...`.

## Required owner decision

Before this repo can become a public handoff source, choose one:

1. Purge/split derived artifacts and keep only sanitized structure here.
2. Make this repo private and create a separate sanitized public handoff repo.
3. Keep this repo as private working evidence and export sanitized bundles only.
