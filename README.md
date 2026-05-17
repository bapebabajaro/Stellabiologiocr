# Stella Biologi — OCR och pedagogisk indexering

Strukturell indexering av läroboken Stella Biologi för Albin Holmqvists personliga lektionsplanering.

## Status

- **Fas 1 — Sidkarta:** KLAR
- **Fas 2 — Per-sida-indexering:** KLAR (alla 6 kapitel, s.2–s.361)

## Innehåll

| Mapp | Innehåll |
|---|---|
| `sidkarta/` | Slutlig sidkarta (Markdown, CSV, JSON) — mappning boksida ↔ PDF-källa |
| `page_renders/` | PDF-sidor renderade som PNG (lågupplöst för alla 360 sidor; högupplöst 200 DPI för K1–K2) |
| `ocr_data/` | Rådata från Tesseract OCR (footer-zon, sidnummer + kapiteltext per sida) |
| `scripts/` | Python-skript som användes för indexeringen |
| `margin_samples/` | Marginalbilder från olika sidor för verifiering |
| `indexering/` | Per-kapitel pedagogisk indexering (Fas 2 — KLAR) |

## Kapitelöversikt och indexeringsstatus

| Kapitel | Boksidor | Primär källa-PDF | Indexering | Rader |
|---|---|---|---|---|
| K1 EKOLOGI | s.2–77 | Biologi-Stella-kapitel-1 | [`EKOLOGI.md`](indexering/EKOLOGI.md) | 482 |
| K2 MILJÖ OCH HÅLLBAR UTVECKLING | s.78–143 | Stella-biolgi-kapitel-2 | [`MILJO.md`](indexering/MILJO.md) | 443 |
| K3 MÄNNISKOKROPPEN | s.144–207 | Biologi-del-1 + Biologi-del-2 | [`MANNISKOKROPPEN.md`](indexering/MANNISKOKROPPEN.md) | 447 |
| K4 LIV OCH HÄLSA | s.208–263 | Biologi-del-2 | [`LIV_OCH_HALSA.md`](indexering/LIV_OCH_HALSA.md) | 422 |
| K5 GENETIK OCH GENTEKNIK | s.264–327 | Biologi-del-3 | [`GENETIK_OCH_GENTEKNIK.md`](indexering/GENETIK_OCH_GENTEKNIK.md) | 427 |
| K6 EVOLUTION | s.328–361 | Biologi-del-3 | [`EVOLUTION.md`](indexering/EVOLUTION.md) | 299 |

Täckning sidkarta: 334/360 boksidor. Saknade sidor är listade i `sidkarta/stella_biologi_sidkarta.md`.

## Sidreferens-format

Sidor refereras som `K{n}-s.{m}` enligt avtalat format:
- K1 = EKOLOGI
- K2 = MILJÖ OCH HÅLLBAR UTVECKLING
- K3 = MÄNNISKOKROPPEN
- K4 = LIV OCH HÄLSA
- K5 = GENETIK OCH GENTEKNIK
- K6 = EVOLUTION

Exempel: `K3-s.156` = MÄNNISKOKROPPEN, boksida 156.

## Per-sida-indexering (Fas 2) — format

För varje sida dokumenteras endast följande fyra kategorier:

1. **Kapitel- och avsnittsrubrik** (strukturell metadata)
2. **Begrepp och termer** som introduceras eller behandlas (nyckelord, inte definitioner)
3. **Pedagogiska element** — typ av modell/figur/tabell och vad den illustrerar funktionellt
4. **Frågor/övningar** — antal och typ (faktafråga, resonemangsfråga, laboration)

Inga egna kopplingar, förklaringar eller tillägg.

## Commits per kapitel (Fas 2)

| Kapitel | Commits |
|---|---|
| K1 EKOLOGI | `7d81d08` (s.8–21), `90f3116` (s.22–39), `d995b4f` (s.40–59), `44aa83a` (s.60–77) |
| K2 MILJÖ | `c1cbc3a` (s.78–85), `3f56863` (s.86–141) |
| K3 MÄNNISKOKROPPEN | `1ed63e8` (s.142–205) |
| K4 LIV OCH HÄLSA | `f9a6f7f` (s.206–263) |
| K5 GENETIK | `9dd63f3` (s.264–323) |
| K6 EVOLUTION | `d851001` (s.324–361), `91db2c8` (granskningspass rev 2) |
