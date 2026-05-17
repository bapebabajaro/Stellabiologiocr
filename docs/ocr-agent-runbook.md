# OCR agent runbook - Stella Biologi

Status: non-runtime. This runbook tells the next OCR agent how to add structure
without leaking protected textbook material.

## Inputs

- Private textbook/OCR material may be used only in a private workspace.
- Public git artifacts may contain structure, ids, page numbers, short neutral
  summaries, hashes and `private-source://pdfer/...` locators.
- Public git artifacts must not contain raw OCR text, long textbook quotes,
  screenshots, page images, captions, answer keys, local paths, cookies, KV
  keys or student data.

## Required chain

For each usable page or section, build this chain in order:

1. `page_record`: source id, printed page, pdf page, page hash, confidence.
2. `evidence_ref`: private locator, zone id and hash; no copied text.
3. `source_atom`: short neutral statement of the concept, not a quote.
4. `visual_source_atom`: neutral description of any visual source idea.
5. `claim_table`: SourceClaim candidate with review state.
6. `KnowledgePoint`: atomic candidate linked to accepted claims only.
7. `Question`: only after public sanitized copy and distractor rationales exist.
8. `PixelEvidence`: only after accepted KP, QKL and pixel binding.

## Biology-specific order

1. Resolve repository public-safety route: purge/split/private repo/sanitized
   export. Do not claim the existing repo is public-safe before that decision.
2. Resolve K3/K4 page boundary conflict.
3. Add K5/K6 index files before creating section claims there.
4. Produce `lineage/page-records.jsonl` and `lineage/source-evidence.jsonl`.
5. Review SourceClaims.
6. Only then promote KnowledgePoint candidates.

## Output discipline

- Prefer hashes and locators over snippets.
- Keep all candidate states fail-closed.
- Never set `runtimeEligible: true` in this repo without a separate release
  order.
