# Stella Biologi - OCR och pedagogisk indexering

Strukturell indexering av läroboken Stella Biologi för Albin Holmqvists personliga
lektionsplanering och förberedd PPF-handoff.

## Status

- Fas 1 - sidkarta: klar.
- Fas 2 - per-sida-indexering: klar för alla sex kapitel, s. 2-361.
- PPF runtime: blockerad tills accepterade SourceClaims, atomära KnowledgePoints,
  QKL, safe-active-frågor, pixelbindningar och femgranskade pixelbilder finns.

## Innehåll

| Mapp | Innehåll |
|---|---|
| `sidkarta/` | Slutlig sidkarta, mappning boksida till PDF-källa |
| `indexering/` | Per-kapitel pedagogisk indexering, Fas 2 klar |
| `manifest/` | BookEdition, TOC, rotation och source-policy |
| `lineage/` | BookLocation, SourceClaim, source evidence och KP-kandidater |
| `questions/` | Tomt intake-lager och blockerad 1200-frågeplan |
| `assets/pixel-briefs/` | Endast framtida briefs; inga pixelbilder här än |
| `reports/validation/` | Blockerare, readiness och kontraktsstatus |
| `schemas/` | JSON-schema för OCR-kontraktet |
| `scripts/` | Lokala bygg- och valideringsskript |

Lokala OCR-arbetsytor `page_renders/`, `ocr_data/` och `margin_samples/` är
gitignore:ade på denna branch och får inte användas som public handoff eller
PPF-import.

## Kapitelöversikt

| Kapitel | Boksidor | Primär källa-PDF | Indexering |
|---|---:|---|---|
| K1 Ekologi | s. 2-77 | Biologi-Stella-kapitel-1 | `indexering/EKOLOGI.md` |
| K2 Miljö och hållbar utveckling | s. 78-143 | Stella-biolgi-kapitel-2 | `indexering/MILJO.md` |
| K3 Människokroppen | s. 144-207 | Biologi-del-1 + Biologi-del-2 | `indexering/MANNISKOKROPPEN.md` |
| K4 Liv och hälsa | s. 208-263 | Biologi-del-2 | `indexering/LIV_OCH_HALSA.md` |
| K5 Genetik och genteknik | s. 264-327 enligt äldre sidkarta, färsk indexering s. 264-323 | Biologi-del-3 | `indexering/GENETIK_OCH_GENTEKNIK.md` |
| K6 Evolution | s. 328-361 enligt äldre sidkarta, färsk indexering s. 324-361 | Biologi-del-3 | `indexering/EVOLUTION.md` |

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

## Per-sida-indexering

För varje sida dokumenteras endast:

1. Kapitel- och avsnittsrubrik som strukturell metadata.
2. Begrepp och termer som introduceras eller behandlas.
3. Pedagogiska element, till exempel modell, figur, tabell eller laborationstyp.
4. Frågor/övningar som antal och typ, aldrig full frågetext.

Inga egna förklaringar, långa citat eller elevdata hör hemma i public handoff.

## OCR-kontrakt och runtime-gate

Kör validering med:

```powershell
node scripts/validate-ocr-contract.mjs
node scripts/validate-ocr-contract.mjs --strict-public-safety
node scripts/validate-atomic-kp-worklist.mjs
node scripts/validate-question-intake-worklist.mjs
node scripts/sanitize-handoff.mjs
```

Runtime-regel: inget i detta repo är safe-active, KV-write, import-apply eller
pixelbildsunderlag förrän alla källkedje- och PPF-gates har passerat separat.
