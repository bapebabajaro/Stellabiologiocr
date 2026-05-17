# Lineage contract

This repo is a non-runtime source package. The lineage files must preserve the
same chain used by the chemistry canon while keeping private textbook material
out of git:

`Book -> BookEdition -> BookLocation -> SourceClaim -> KnowledgePoint -> Question -> PixelEvidence`

## Required rules

- `book-locations.jsonl` contains structural locations only: chapter, section,
  page spans, source refs and blocker status.
- `source-claims.jsonl` contains short claim summaries and evidence locators.
  It must not contain raw OCR paragraphs, long textbook quotes or local paths.
- `knowledge-point-candidates.jsonl` may contain candidate labels only. A
  candidate is not accepted until it links to accepted SourceClaims.
- `questions/intake-candidates.jsonl` stays empty until sanitized question copy
  and QKL review exist.
- Every private locator uses `private-source://pdfer/...`.
- Runtime eligibility is fail-closed. Empty, pending or conflict states never
  become active student content.

## Biology-specific blockers

- K3/K4 page boundary conflict is still open.
- K5/K6 have chapter shells only and need OCR index files.
- This existing public repo contains tracked legacy PDF/OCR-derived artifacts.
  The public-safety blocker must be resolved before it is used as a public
  handoff source.
