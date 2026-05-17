"""
Bygger den slutliga sidkartan genom att:
1. Använda v4-data (riktad footer-OCR) som primära ankarpunkter
2. Validera sekventiellt - boken är paginerad löpande, så grannsidor ska skilja sig med 1
3. Extrapolera osäkra sidor från säkra ankarpunkter
4. Använda kapitelnamn från footer-OCR för kapitelindelning
"""
import json
import re
from pathlib import Path
from collections import defaultdict, Counter
from ocr_local_paths import ocr_work_dir

WORK = ocr_work_dir()

# Läs in alla tre v4-filer
v4 = {}
for pdf in ["Biologi-Stella-kapitel-1", "Stella-biolgi-kapitel-2", "Biologi-del-1", "Biologi-del-2", "Biologi-del-3"]:
    f = WORK / f"footer_ocr_v4_{pdf}.json"
    with open(f, encoding="utf-8") as fh:
        v4.update(json.load(fh))

PAGE_COUNTS = {"Biologi-Stella-kapitel-1": 76, "Stella-biolgi-kapitel-2": 66, "Biologi-del-1": 100, "Biologi-del-2": 80, "Biologi-del-3": 100}

def normalize_chapter(s):
    """Normalisera kapitelnamn - ta bort skräp, gemener till versaler."""
    if not s:
        return None
    s = s.strip()
    # Ta bort vanligt OCR-skräp
    s = re.sub(r'^[^A-ZÅÄÖa-zåäö]+', '', s)
    s = re.sub(r'[^A-ZÅÄÖa-zåäö\s]+$', '', s)
    s = s.strip()
    if len(s) < 3:
        return None
    # Versalrenormalisering om text är mest versaler
    upper_count = sum(1 for c in s if c.isupper())
    letter_count = sum(1 for c in s if c.isalpha())
    if letter_count > 0 and upper_count / letter_count > 0.6:
        s = s.upper()
    return s

# Steg 1: bygg per-PDF lista av (pdf_page, raw_book_page, raw_chapter)
per_pdf = {}
for pdf, n in PAGE_COUNTS.items():
    entries = []
    for pp in range(1, n+1):
        key = f"{pdf}/{pp:03d}"
        rec = v4.get(key, {})
        entries.append({
            "pdf_page": pp,
            "raw_page": rec.get("page_num"),
            "raw_chapter": normalize_chapter(rec.get("chapter")),
            "ocr_raw": rec.get("ocr", {}),
        })
    per_pdf[pdf] = entries

# Steg 2: hitta sekventiellt godkända ankarpunkter
# Ett ankare = en sida vars raw_page passar med en granne (±1, ±2)
def find_anchors(entries):
    """Returnera lista (idx, book_page) för sidor som passar sekvensen."""
    n = len(entries)
    score = [0]*n
    for i, e in enumerate(entries):
        if e["raw_page"] is None:
            continue
        for j in [i-2, i-1, i+1, i+2]:
            if 0 <= j < n and entries[j]["raw_page"] is not None:
                pdf_diff = entries[j]["pdf_page"] - e["pdf_page"]
                book_diff = entries[j]["raw_page"] - e["raw_page"]
                if pdf_diff == book_diff:
                    score[i] += 1
    anchors = []
    for i, (e, sc) in enumerate(zip(entries, score)):
        if sc >= 1 and e["raw_page"] is not None:
            anchors.append((i, e["pdf_page"], e["raw_page"]))
    return anchors, score

# Steg 3: extrapolera från ankare
def fill_from_anchors(entries, anchors):
    n = len(entries)
    final = [None]*n
    sources = ["unknown"]*n
    # Sätt ankare först
    for idx, pp, bp in anchors:
        final[idx] = bp
        sources[idx] = "anchor"
    # Extrapolera mellan ankare
    for i in range(n):
        if final[i] is not None:
            continue
        # Hitta närmaste ankare vänster och höger
        left = None
        for j in range(i-1, -1, -1):
            if final[j] is not None and sources[j] == "anchor":
                left = (j, final[j])
                break
        right = None
        for j in range(i+1, n):
            if final[j] is not None and sources[j] == "anchor":
                right = (j, final[j])
                break
        pp_i = entries[i]["pdf_page"]
        if left and right:
            from_left = left[1] + (pp_i - entries[left[0]]["pdf_page"])
            from_right = right[1] - (entries[right[0]]["pdf_page"] - pp_i)
            if from_left == from_right:
                final[i] = from_left
                sources[i] = "extrapolated_consistent"
            else:
                # Konflikt - litar mer på närmaste
                d_left = i - left[0]
                d_right = right[0] - i
                if d_left <= d_right:
                    final[i] = from_left
                    sources[i] = "extrapolated_left_preferred"
                else:
                    final[i] = from_right
                    sources[i] = "extrapolated_right_preferred"
        elif left:
            final[i] = left[1] + (pp_i - entries[left[0]]["pdf_page"])
            sources[i] = "extrapolated_left_only"
        elif right:
            final[i] = right[1] - (entries[right[0]]["pdf_page"] - pp_i)
            sources[i] = "extrapolated_right_only"
    return final, sources

sitemap = {}
for pdf, entries in per_pdf.items():
    anchors, scores = find_anchors(entries)
    final_pages, sources = fill_from_anchors(entries, anchors)
    for e, fp, src in zip(entries, final_pages, sources):
        e["book_page"] = fp
        e["book_page_source"] = src
    sitemap[pdf] = entries
    print(f"\n{pdf}: {len(entries)} PDF-sidor, {len(anchors)} ankare")
    src_count = Counter(sources)
    for s, c in src_count.most_common():
        print(f"  {s}: {c}")
    bp = [e["book_page"] for e in entries if e["book_page"]]
    if bp:
        print(f"  Boksidspann: {min(bp)}–{max(bp)}")

with open(WORK / "sitemap_v2.json", "w", encoding="utf-8") as f:
    json.dump(sitemap, f, ensure_ascii=False, indent=2)

# Steg 4: hitta kapitelövergångar
print("\n" + "="*70)
print("KAPITELÖVERGÅNGAR (där footer-kapitel ändras)")
print("="*70)
all_chapters_seen = Counter()
for pdf, entries in sitemap.items():
    print(f"\n--- {pdf} ---")
    prev_chapter = None
    for e in entries:
        ch = e["raw_chapter"]
        if ch:
            all_chapters_seen[ch] += 1
        if ch and ch != prev_chapter:
            bp = e["book_page"]
            print(f"  PDF s.{e['pdf_page']:3} | Bok s.{bp} | Kapitel: {ch!r}")
            prev_chapter = ch

print("\n" + "="*70)
print("ALLA UNIKA KAPITELSTRÄNGAR (rådata från footer-OCR)")
print("="*70)
for ch, c in all_chapters_seen.most_common(40):
    print(f"  {c:3} ggr: {ch!r}")
