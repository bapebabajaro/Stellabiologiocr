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
2. `physical_page_record` and BookLocation page link: one physical page/source
   record can support multiple chapter or section locations.
3. `evidence_ref`: private locator, zone id and hash; no copied text.
4. `source_atom`: short neutral statement of the concept, not a quote.
5. `visual_source_atom`: neutral description of any visual source idea.
6. `claim_table`: SourceClaim candidate with review state.
7. `KnowledgePoint`: atomic candidate linked to accepted claims only.
8. `Question`: only after public sanitized copy and distractor rationales exist.
9. `PixelEvidence`: only after accepted KP, QKL and pixel binding.

## Biology-specific order

1. Keep OCR-derived `indexering/*.md` in ignored private workspace only.
2. Resolve K3/K4 page boundary conflict.
3. Resolve K5/K6 page boundary conflict.
4. Review `lineage/page-records.jsonl`, `lineage/physical-page-records.jsonl`,
   `lineage/book-location-page-links.jsonl` and `lineage/evidence-refs.jsonl`.
5. Create reviewed `source_atom`, optional `visual_source_atom` and
   `claim_table` rows without copied textbook language.
6. Review SourceClaims.
7. Only then promote atomic KnowledgePoint candidates.

## Output discipline

- Prefer hashes and locators over snippets.
- Keep all candidate states fail-closed.
- Never set `runtimeEligible: true` in this repo without a separate release
  order.
