"""
Kombinerar marginal-OCR + textlager för att bestämma boksidnummer för varje PDF-sida.
Bygger sedan en sidkarta med kapitelstruktur och dedupliceringsinfo.
"""
import json
import re
from pathlib import Path
from collections import defaultdict, Counter
from ocr_local_paths import ocr_work_dir

WORK = ocr_work_dir()

with open(WORK / "margin_ocr.json", encoding="utf-8") as f:
    margin = json.load(f)
with open(WORK / "page_index_raw.json", encoding="utf-8") as f:
    raw = json.load(f)

# Bygg lookup för rådata: (source_pdf, pdf_page) -> record
raw_by_key = {(r["source_pdf"], r["pdf_page"]): r for r in raw}

def pick_page_num(pdf_name, pdf_page):
    """
    Välj boksidnummer för en sida.
    Prioritet:
      1. Marginal-OCR (bottom_num eller top_num, isolerat tal)
      2. Textlagrets kandidater
    """
    key = f"{pdf_name}/p-{pdf_page:03d}.png"
    m = margin.get(key, {})
    candidates = []

    # Marginal OCR - bottom är vanligast för sidnummer
    for src in ["bottom_num", "top_num"]:
        v = m.get(src)
        if v is None:
            continue
        if isinstance(v, list):
            for n in v:
                candidates.append((n, f"margin_{src}_list"))
        else:
            candidates.append((v, f"margin_{src}"))

    # Textlagrets kandidater
    raw_rec = raw_by_key.get((pdf_name, pdf_page))
    if raw_rec and raw_rec["candidates"]:
        for num, pos, line_idx in raw_rec["candidates"][:5]:
            candidates.append((num, f"text_{pos}"))

    return candidates, m, raw_rec

# Steg 1: hitta råa kandidater per sida
per_pdf = defaultdict(list)
for pdf_name in ["Biologi-del-1", "Biologi-del-2", "Biologi-del-3"]:
    # Hur många PDF-sidor i denna?
    pages_in_pdf = sorted({int(k.split("/p-")[1].split(".")[0])
                          for k in margin if k.startswith(pdf_name + "/")})
    for pp in pages_in_pdf:
        cands, m, raw_rec = pick_page_num(pdf_name, pp)
        per_pdf[pdf_name].append({
            "pdf_page": pp,
            "candidates": cands,
            "margin_top_text": m.get("top_text", ""),
            "margin_bottom_text": m.get("bottom_text", ""),
            "first_lines": raw_rec["first_lines"] if raw_rec else [],
        })

# Steg 2: bestäm bästa boksidnummer per PDF-sida med sekvenskontroll
def best_sequential(pages):
    """
    För varje PDF-sida, välj den kandidat som passar bäst i en löpande sekvens.
    Strategi: börja med första sidan som har tydlig marginalträff,
    räkna baklänges/framlänges som referens.
    """
    # Förstapass: ta första kandidaten med marginalkälla för varje sida
    initial = []
    for rec in pages:
        chosen = None
        chosen_src = None
        for num, src in rec["candidates"]:
            if src.startswith("margin"):
                chosen = num
                chosen_src = src
                break
        if chosen is None and rec["candidates"]:
            chosen = rec["candidates"][0][0]
            chosen_src = rec["candidates"][0][1]
        initial.append((chosen, chosen_src))

    # Andrapass: hitta längsta sekventiella ankarpunkten
    # Vi tar ett glidande fönster - för varje par av närliggande sidor som
    # skiljer sig med 1 eller 2 i boksidnummer, markera som "ankrad".
    # Sedan extrapolerar vi.
    pdf_pages = [r["pdf_page"] for r in pages]
    n = len(pages)

    # Räkna stöd för varje (pdf_page -> book_page) via sekventiella par
    score = [0] * n
    chosen_arr = [c[0] for c in initial]
    for i in range(n):
        if chosen_arr[i] is None:
            continue
        # Kolla närmaste grannar
        for j in (i-2, i-1, i+1, i+2):
            if 0 <= j < n and chosen_arr[j] is not None:
                pdf_diff = pdf_pages[j] - pdf_pages[i]
                book_diff = chosen_arr[j] - chosen_arr[i]
                if pdf_diff == book_diff:
                    score[i] += 1

    # Behåll val med stöd; för övriga, extrapolera från närmsta anchor
    final = list(chosen_arr)
    sources = [c[1] for c in initial]
    for i in range(n):
        if score[i] < 1 and final[i] is not None:
            final[i] = None  # osäker
            sources[i] = "unanchored"

    # Extrapolera: hitta närmaste ankarpunkt åt vänster/höger
    for i in range(n):
        if final[i] is not None:
            continue
        # vänsteranchor
        left = None
        for j in range(i-1, -1, -1):
            if final[j] is not None and score[j] >= 1:
                left = (j, final[j])
                break
        right = None
        for j in range(i+1, n):
            if final[j] is not None and score[j] >= 1:
                right = (j, final[j])
                break
        if left and right:
            # Båda finns - kolla att de stämmer
            expected_from_left = left[1] + (pdf_pages[i] - pdf_pages[left[0]])
            expected_from_right = right[1] - (pdf_pages[right[0]] - pdf_pages[i])
            if expected_from_left == expected_from_right:
                final[i] = expected_from_left
                sources[i] = "extrapolated"
            else:
                final[i] = expected_from_left
                sources[i] = "extrapolated_uncertain"
        elif left:
            final[i] = left[1] + (pdf_pages[i] - pdf_pages[left[0]])
            sources[i] = "extrapolated_left"
        elif right:
            final[i] = right[1] - (pdf_pages[right[0]] - pdf_pages[i])
            sources[i] = "extrapolated_right"

    return final, sources, score

sitemap = {}
for pdf_name, pages in per_pdf.items():
    final, sources, scores = best_sequential(pages)
    for rec, book_page, src, sc in zip(pages, final, sources, scores):
        rec["book_page"] = book_page
        rec["book_page_source"] = src
        rec["sequential_score"] = sc
    sitemap[pdf_name] = pages

# Skriv mellanresultat
with open(WORK / "sitemap_v1.json", "w", encoding="utf-8") as f:
    json.dump(sitemap, f, ensure_ascii=False, indent=2)

# Sammanfattning
print("SAMMANFATTNING PER PDF")
print("=" * 70)
for pdf_name, pages in sitemap.items():
    with_page = [p for p in pages if p["book_page"] is not None]
    if with_page:
        bp = [p["book_page"] for p in with_page]
        print(f"\n{pdf_name}: {len(pages)} PDF-sidor")
        print(f"  Boksidspann: {min(bp)}–{max(bp)}")
        print(f"  Sidor med bestämt boksnr: {len(with_page)}/{len(pages)}")
        src_counts = Counter(p["book_page_source"] for p in pages)
        for s, c in src_counts.most_common():
            print(f"    {s}: {c}")
        # luckor
        bp_set = set(bp)
        expected = set(range(min(bp), max(bp)+1))
        missing = sorted(expected - bp_set)
        if missing:
            print(f"  Saknade boksidor i spannet: {len(missing)} st (visar 10 första): {missing[:10]}")
        # dubbletter
        bp_count = Counter(bp)
        dups = {k: v for k, v in bp_count.items() if v > 1}
        if dups:
            print(f"  Dubbletter inom samma PDF: {dict(list(dups.items())[:10])}")

# Övergripande sekvenskontroll
print("\n" + "=" * 70)
print("ÖVERLAPP MELLAN PDF:erna")
print("=" * 70)
pdfs = ["Biologi-del-1", "Biologi-del-2", "Biologi-del-3"]
for i, p in enumerate(pdfs):
    bp = sorted({r["book_page"] for r in sitemap[p] if r["book_page"]})
    if bp:
        print(f"{p}: {min(bp)}–{max(bp)}")
for i in range(len(pdfs)-1):
    a = {r["book_page"] for r in sitemap[pdfs[i]] if r["book_page"]}
    b = {r["book_page"] for r in sitemap[pdfs[i+1]] if r["book_page"]}
    overlap = sorted(a & b)
    print(f"\nÖverlapp {pdfs[i]} ∩ {pdfs[i+1]}: {len(overlap)} sidor")
    if overlap:
        print(f"  Spann: {min(overlap)}–{max(overlap)}")
        print(f"  Sidor: {overlap[:20]}{'...' if len(overlap)>20 else ''}")
