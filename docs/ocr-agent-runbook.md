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
4. `SourceClaim`: candidate claim tied to evidence refs, still non-runtime.
5. `SourceClaimReviewDecision`: `reviewed_not_runtime`, `request_fix` or
   `reject`; never production acceptance.
6. `source_atom`, `visual_source_atom` and `claim_table`: short neutral
   public-safe statements derived after non-runtime SourceClaim review.
7. `KnowledgePoint`: atomic candidate linked to reviewed_not_runtime claims and
   reviewed source atoms only.
8. `AtomicKpReviewDecision`: one non-runtime decision per atomic KP review slot.
9. `Question`: manual sanitized candidate authoring only after
   `atomic_kp_review_decisions_ready`; runtime generation/import flags stay
   false.
10. `PixelEvidence`: only after reviewed KP, QKL, pixel binding and separate
   visual review gates.

## Biology-specific order

1. Keep OCR-derived `indexering/*.md` in ignored private workspace only.
2. Resolve K3/K4 page boundary conflict.
3. Resolve K5/K6 page boundary conflict.
4. Review `lineage/page-records.jsonl`, `lineage/physical-page-records.jsonl`,
   `lineage/book-location-page-links.jsonl` and `lineage/evidence-refs.jsonl`.
5. Write `lineage/page-record-review-decisions.jsonl` with one decision per
   review item. Use only `reviewed_not_runtime`, `request_fix` or `reject`, and
   keep every runtime/import/KV/pixel/question flag explicitly `false`. Include
   `reviewer` and ISO-8601 UTC `reviewedAt`.
6. Review SourceClaims and write `lineage/source-claim-review-decisions.jsonl`
   only after all page-record decisions are reviewed and boundary decisions are
   resolved. These decisions are still non-runtime and cannot accept claims for
   production use. Include `reviewer` and ISO-8601 UTC `reviewedAt`.
   Review ledgers do not support free-text comments or copied snippets; keep
   private review notes outside tracked artifacts.
7. Create reviewed `source_atom`, optional `visual_source_atom` and
   `claim_table` rows without copied textbook language. Source atoms are
   public-safe neutral summaries only and require complete non-runtime
   SourceClaim review first.
8. Only then promote atomic KnowledgePoint candidates.
   Atomic KPs must match one planned review slot, link to reviewed source atoms,
   include a QKL role and remain non-runtime/non-pixel.
9. Review each atomic KP in `lineage/atomic-kp-review-decisions.jsonl`.
   Every decision must target the matching `atomic-kp-review-*` slot and
   `kp-biologi-*` row, stay `reviewed_not_runtime`, and keep runtime/import,
   generation, KV, safe-active and pixel flags explicitly `false`.
10. Only after `atomic_kp_review_decisions_ready`, manually author sanitized
   question candidates in `questions/intake-candidates.jsonl`. This is not a
   runtime generation or import unlock: candidate rows must match
   `schemas/question-intake-candidate.schema.json`, include candidate-local QKL
   rows, and keep every runtime/import/generation/KV/safe-active/pixel/deploy
   flag explicitly `false`.

## Local validation

Run these after adding page/source review decisions:

```powershell
node scripts/validate-page-record-review-decisions.mjs
node scripts/validate-source-claim-review-decisions.mjs
node scripts/validate-source-atoms.mjs
node scripts/validate-atomic-knowledge-points.mjs
node scripts/validate-atomic-kp-review-decisions.mjs
node scripts/validate-question-intake-worklist.mjs
node scripts/validate-question-intake-candidates.mjs
node scripts/validate-ocr-contract.mjs
```

## Output discipline

- Prefer hashes and locators over snippets.
- Keep all candidate states fail-closed.
- Never set `runtimeEligible: true` in this repo without a separate release
  order.
