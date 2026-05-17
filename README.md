# Stella Biologi - OCR och pedagogisk indexering

Strukturell indexering av läroboken Stella Biologi för lokal lektionsplanering och
förberedd PPF-handoff.

## Status

- Fas 1 - sidkarta: klar.
- Fas 2 - per-sida-indexering: klar för alla sex kapitel, s. 2-361.
- PPF runtime: blockerad tills accepterade SourceClaims, atomära KnowledgePoints,
  QKL, safe-active-frågor, pixelbindningar och femgranskade pixelbilder finns.

## Innehåll

| Mapp | Innehåll |
|---|---|
| `sidkarta/` | Slutlig sidkarta, mappning boksida till PDF-källa |
| `private-source-local/indexering/` | Lokal, ignorerad OCR-arbetsyta; får inte committas |
| `manifest/` | BookEdition, TOC, rotation och source-policy |
| `lineage/` | BookLocation, SourceClaim, source evidence och KP-kandidater |
| `questions/` | Tomt intake-lager och blockerad 1200-frågeplan |
| `assets/pixel-briefs/` | Endast framtida briefs; inga pixelbilder här än |
| `reports/validation/` | Blockerare, readiness och kontraktsstatus |
| `schemas/` | JSON-schema för OCR-kontraktet |
| `scripts/` | Lokala bygg- och valideringsskript |

Lokala OCR-arbetsytor `page_renders/`, `ocr_data/`, `margin_samples/`,
`indexering/*.md` och `private-source-local/` är gitignore:ade på denna branch
och får inte användas som public handoff eller PPF-import. Tidigare tracked
indexering kan finnas i repo-historik; publika distributioner kräver separat
historik-/GitHub-remediering.

## Kapitelöversikt

| Kapitel | Boksidor | Primär privat källreferens | Public handoff |
|---|---:|---|---|
| K1 Ekologi | s. 2-77 | `private-source://pdfer/biologi/Biologi-Stella-kapitel-1` | `manifest/toc.json` |
| K2 Miljö och hållbar utveckling | s. 78-143 | `private-source://pdfer/biologi/Stella-biolgi-kapitel-2` | `manifest/toc.json` |
| K3 Människokroppen | s. 144-207 | `private-source://pdfer/biologi/Biologi-del-1+Biologi-del-2` | `manifest/toc.json` |
| K4 Liv och hälsa | s. 208-263 | `private-source://pdfer/biologi/Biologi-del-2` | `manifest/toc.json` |
| K5 Genetik och genteknik | s. 264-327 enligt äldre sidkarta, färsk indexering s. 264-323 | `private-source://pdfer/biologi/Biologi-del-3` | `manifest/toc.json` |
| K6 Evolution | s. 328-361 enligt äldre sidkarta, färsk indexering s. 324-361 | `private-source://pdfer/biologi/Biologi-del-3` | `manifest/toc.json` |

Sidgränskonflikter för K3-K6 är avsiktligt blockerade i
`reports/validation/page-boundary-conflicts.md` tills accepterade page records
finns. De får inte lösas genom gissning.

## Sidreferens-format

Sidor refereras som `K{n}-s.{m}` enligt avtalat format:

- K1 = Ekologi
- K2 = Miljö och hållbar utveckling
- K3 = Människokroppen
- K4 = Liv och hälsa
- K5 = Genetik och genteknik
- K6 = Evolution

Exempel: `K3-s.156` betyder Människokroppen, boksida 156.

## Public handoff

Den spårade public handoffen dokumenterar endast:

1. Kapitel- och avsnittsrubrik som strukturell metadata.
2. Begrepp och termer som introduceras eller behandlas.
3. Locator-only page records och source evidence utan OCR-text eller sidbilder.
4. Framtida granskningsytor för source atoms, visual atoms, claim table och
   atomära KnowledgePoints.

Inga egna förklaringar, långa citat eller elevdata hör hemma i public handoff.

## OCR-kontrakt och runtime-gate

Kör validering med:

```powershell
node scripts/validate-ocr-contract.mjs
node scripts/validate-ocr-contract.mjs --strict-public-safety
node scripts/validate-source-claim-review-worklist.mjs
node scripts/validate-page-record-review-worklist.mjs
node scripts/validate-source-atoms.mjs
node scripts/validate-atomic-kp-worklist.mjs
node scripts/validate-atomic-kp-review-worklist.mjs
node scripts/validate-question-intake-worklist.mjs
node scripts/sanitize-handoff.mjs
```

Runtime-regel: inget i detta repo är safe-active, KV-write, import-apply eller
pixelbildsunderlag förrän alla källkedje- och PPF-gates har passerat separat.
