# Stella Biologi lineage

Generated: 2026-05-17

This lineage package is a non-runtime contract for the current OCR index state.

- K1-K6 have generated chapter locations.
- Section-level locations exist where the index files expose delkapitel or existing TOC section boundaries.
- SourceClaims are structure-only and not accepted.
- PageRecord and SourceClaim review decisions may be added as
  `reviewed_not_runtime`, `request_fix` or `reject`, but they do not create
  runtime evidence. Review decision rows are identifier-only and must not carry
  copied OCR text, textbook snippets or free-text comments.
- KnowledgePoint candidates are section placeholders only.
- Page records and source evidence contain locators, not raw OCR text or page images.
- Source atoms, visual atoms and claim-table rows may be populated only after
  complete `reviewed_not_runtime` SourceClaim decisions and must remain
  public-safe, short and non-runtime.

Runtime activation remains blocked until accepted SourceClaims, atomic KnowledgePoints, QKL, safe-active question metadata, pixel bindings and five-reviewer visual PASS exist.
