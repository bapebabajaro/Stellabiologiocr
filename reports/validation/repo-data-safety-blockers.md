# Repo data-safety blockers - Stella Biologi

Generated: 2026-05-17

## Blocker

Det befintliga publika biologi-repot innehåller redan material som inte uppfyller det nya rena handoff-kontraktet:

- trackade helsidesrenderingar under `page_renders/`
- trackad OCR/footer-rådata under `ocr_data/`
- trackade marginalbilder under `margin_samples/`
- äldre scripts med absoluta lokala path-exempel

## Beslut i denna branch

- Inget befintligt material raderas utan explicit ägarbeslut.
- Nya kontraktsartefakter i `manifest/`, `lineage/`, `questions/`, `assets/pixel-briefs/` och `reports/validation/` ska vara non-runtime och fria från privata OCR-utdrag.
- PPF-handoff får inte behandla detta repo som public-safe förrän blockeraren är löst genom purge, privat repo, Git LFS/private storage eller separat sanitized handoff-repo.

## Rekommenderad nästa order

Välj en av två vägar innan biologi kan bli importkälla:

1. Rensa/splitta publikt repo så endast sanitized manifest/index ligger här och PDF/OCR-renders flyttas till privat lagring.
2. Gör biologi-repot privat och skapa ett separat publikt sanitized handoff-repo.
