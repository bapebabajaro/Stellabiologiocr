# Stella Biologi — OCR och pedagogisk indexering

Strukturell indexering av läroboken Stella Biologi för Albin Holmqvists personliga lektionsplanering.

## Innehåll

| Mapp | Innehåll |
|---|---|
| `sidkarta/` | Slutlig sidkarta (Markdown, CSV, JSON) — mappning boksida ↔ PDF-källa |
| `page_renders/` | Alla 422 PDF-sidor renderade som PNG i 150 DPI gråskala |
| `ocr_data/` | Rådata från Tesseract OCR (footer-zon, sidnummer + kapiteltext per sida) |
| `scripts/` | Python-skript som användes för indexeringen |
| `margin_samples/` | Marginalbilder från olika sidor för verifiering |
| `indexering/` | Per-kapitel pedagogisk indexering (Fas 2 — kommer steg för steg) |

## Sidkartan i korthet

| Kapitel | Boksidor | Primär källa-PDF |
|---|---|---|
| EKOLOGI | s.2–77 | Biologi-Stella-kapitel-1 |
| MILJÖ OCH HÅLLBAR UTVECKLING | s.78–143 | Stella-biolgi-kapitel-2 |
| MÄNNISKOKROPPEN | s.144–207 | Biologi-del-1 + Biologi-del-2 |
| LIV OCH HÄLSA | s.208–263 | Biologi-del-2 |
| GENETIK OCH GENTEKNIK | s.264–327 | Biologi-del-3 |
| EVOLUTION | s.328–361 | Biologi-del-3 |

Täckning: 334/360 boksidor. Saknade sidor är listade i `sidkarta/stella_biologi_sidkarta.md`.

## Sidreferens-format

Sidor refereras som `K{n}-s.{m}` enligt avtalat format:
- K1 = EKOLOGI
- K2 = MILJÖ OCH HÅLLBAR UTVECKLING
- K3 = MÄNNISKOKROPPEN
- K4 = LIV OCH HÄLSA
- K5 = GENETIK OCH GENTEKNIK
- K6 = EVOLUTION

Exempel: `K3-s.156` = MÄNNISKOKROPPEN, boksida 156.

## Per-sida-indexering (Fas 2)

För varje sida dokumenteras endast följande fyra kategorier:

1. **Kapitel- och avsnittsrubrik** (strukturell metadata)
2. **Begrepp och termer** som introduceras eller behandlas (nyckelord, inte definitioner)
3. **Pedagogiska element** — typ av modell/figur/tabell och vad den illustrerar funktionellt
4. **Frågor/övningar** — antal och typ (faktafråga, resonemangsfråga, laboration)

Inga egna kopplingar, förklaringar eller tillägg.

## OCR-kontrakt och runtime-gate

Detta repo innehåller nu ett roterbart OCR-skelett för PPF-handoff:

| Yta | Syfte |
|---|---|
| `manifest/` | BookEdition, TOC och source-policy |
| `lineage/` | BookLocation, SourceClaim och KnowledgePoint-kandidater |
| `questions/` | Tomt intake-lager tills frågor finns |
| `assets/pixel-briefs/` | Endast framtida briefs; inga pixelbilder här än |
| `reports/validation/` | Blockerare och kontraktsstatus |
| `scripts/validate-ocr-contract.mjs` | Lokal kontraktsvalidator |

Kör validering med:

```powershell
node scripts/validate-ocr-contract.mjs
```

Runtime-regel: inget i detta repo är safe-active, KV-write, import-apply eller pixelbildsunderlag förrän SourceClaims har accepterad sid-/locator-evidens och PPF-gates har körts separat.

## Data-safety blocker

Det befintliga repot innehåller redan PDF-deriverade renders/OCR-artefakter. De nya kontraktsfilerna är non-runtime, men repot ska inte behandlas som public-safe importkälla förrän `reports/validation/repo-data-safety-blockers.md` är löst.
