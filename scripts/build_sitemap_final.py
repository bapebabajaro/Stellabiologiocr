"""
Slutgiltig sidkarta. Använder kända ankare per PDF-sektion för att
filtrera bort OCR-felaktiga ankare och bygga en pålitlig mappning.
"""
import json
import re
from pathlib import Path
from collections import Counter
from ocr_local_paths import ocr_work_dir

WORK = ocr_work_dir()

PDFS = ["Biologi-Stella-kapitel-1", "Stella-biolgi-kapitel-2",
        "Biologi-del-1", "Biologi-del-2", "Biologi-del-3"]
PAGE_COUNTS = {
    "Biologi-Stella-kapitel-1": 76,
    "Stella-biolgi-kapitel-2": 66,
    "Biologi-del-1": 100,
    "Biologi-del-2": 80,
    "Biologi-del-3": 100,
}

# Förväntat boksideintervall per PDF (efter att ha tittat på ankarpunkterna)
EXPECTED_RANGE = {
    "Biologi-Stella-kapitel-1": (2, 77),       # EKOLOGI
    "Stella-biolgi-kapitel-2": (78, 143),       # MILJÖ OCH HÅLLBAR UTVECKLING
    "Biologi-del-1": (6, 183),                  # Kombo: EKOLOGI 6-77, sedan MÄNNISKOKROPPEN 144-183
    "Biologi-del-2": (184, 263),                # MÄNNISKOKROPPEN + LIV OCH HÄLSA
    "Biologi-del-3": (264, 361),                # GENETIK + EVOLUTION
}

# Kapitelgränser i boksidor
CHAPTERS = [
    {"name": "EKOLOGI", "start": 2, "end": 77},
    {"name": "MILJÖ OCH HÅLLBAR UTVECKLING", "start": 78, "end": 143},
    {"name": "MÄNNISKOKROPPEN", "start": 144, "end": 207},
    {"name": "LIV OCH HÄLSA", "start": 208, "end": 263},
    {"name": "GENETIK OCH GENTEKNIK", "start": 264, "end": 327},
    {"name": "EVOLUTION", "start": 328, "end": 361},
]

# Vilken PDF är primär för varje kapitel?
# (när en boksida finns i två PDF:er väljs primär)
PRIMARY_PDF_PER_CHAPTER = {
    "EKOLOGI": "Biologi-Stella-kapitel-1",        # Nyare version
    "MILJÖ OCH HÅLLBAR UTVECKLING": "Stella-biolgi-kapitel-2",
    "MÄNNISKOKROPPEN": "Biologi-del-1",            # börjar i del-1, fortsätter del-2
    "LIV OCH HÄLSA": "Biologi-del-2",
    "GENETIK OCH GENTEKNIK": "Biologi-del-3",
    "EVOLUTION": "Biologi-del-3",
}

v4 = {}
for pdf in PDFS:
    with open(WORK / f"footer_ocr_v4_{pdf}.json", encoding="utf-8") as f:
        v4.update(json.load(f))

def filtered_anchors(pdf_name, entries):
    """Behåll bara ankare där raw_page ligger inom förväntat spann."""
    lo, hi = EXPECTED_RANGE[pdf_name]
    n = len(entries)
    raw_pages = [e["raw_page"] for e in entries]
    score = [0]*n
    for i in range(n):
        if raw_pages[i] is None or not (lo <= raw_pages[i] <= hi):
            continue
        for j in [i-2, i-1, i+1, i+2]:
            if 0 <= j < n and raw_pages[j] is not None and lo <= raw_pages[j] <= hi:
                pdf_diff = entries[j]["pdf_page"] - entries[i]["pdf_page"]
                book_diff = raw_pages[j] - raw_pages[i]
                if pdf_diff == book_diff:
                    score[i] += 1
    return [(i, raw_pages[i]) for i in range(n) if score[i] >= 1]

def fill_with_sections(entries, anchors):
    """Extrapolera mellan ankare; respektera sektionsbrott."""
    n = len(entries)
    final = [None]*n
    sources = ["unknown"]*n
    for idx, bp in anchors:
        final[idx] = bp
        sources[idx] = "anchor"
    if not anchors:
        return final, sources

    anchor_idx_list = [a[0] for a in anchors]

    # Identifiera sektionsbrott
    breaks = set()
    for k in range(len(anchor_idx_list)-1):
        i1, i2 = anchor_idx_list[k], anchor_idx_list[k+1]
        if final[i2] - final[i1] != entries[i2]["pdf_page"] - entries[i1]["pdf_page"]:
            for j in range(i1+1, i2):
                breaks.add(j)

    for i in range(n):
        if final[i] is not None:
            continue
        if i in breaks:
            sources[i] = "section_break"
            continue
        # Närmsta ankare
        left = right = None
        for j in range(i-1, -1, -1):
            if sources[j] == "anchor":
                left = (j, final[j])
                break
        for j in range(i+1, n):
            if sources[j] == "anchor":
                right = (j, final[j])
                break
        pp_i = entries[i]["pdf_page"]
        if left and right:
            from_left = left[1] + (pp_i - entries[left[0]]["pdf_page"])
            from_right = right[1] - (entries[right[0]]["pdf_page"] - pp_i)
            if from_left == from_right:
                final[i] = from_left
                sources[i] = "extrapolated"
            else:
                sources[i] = "section_break_implicit"
        elif left:
            final[i] = left[1] + (pp_i - entries[left[0]]["pdf_page"])
            sources[i] = "extrapolated_left"
        elif right:
            final[i] = right[1] - (entries[right[0]]["pdf_page"] - pp_i)
            sources[i] = "extrapolated_right"
    return final, sources

def normalize_chapter(s):
    if not s:
        return None
    s = re.sub(r'^[^A-ZÅÄÖa-zåäö]+', '', s.strip())
    s = re.sub(r'[^A-ZÅÄÖa-zåäö\s]+$', '', s).strip()
    if len(s) < 3:
        return None
    upper = sum(1 for c in s if c.isupper())
    letters = sum(1 for c in s if c.isalpha())
    if letters > 0 and upper / letters > 0.6:
        s = s.upper()
    return s

def chapter_of(bp):
    if bp is None:
        return None
    for ch in CHAPTERS:
        if ch["start"] <= bp <= ch["end"]:
            return ch["name"]
    return None

sitemap = {}
for pdf, n in PAGE_COUNTS.items():
    entries = []
    for pp in range(1, n+1):
        rec = v4.get(f"{pdf}/{pp:03d}", {})
        entries.append({
            "pdf_page": pp,
            "raw_page": rec.get("page_num"),
            "raw_chapter_ocr": normalize_chapter(rec.get("chapter")),
        })
    anchors = filtered_anchors(pdf, entries)
    final, sources = fill_with_sections(entries, anchors)
    for e, fp, src in zip(entries, final, sources):
        e["book_page"] = fp
        e["book_page_source"] = src
        e["assigned_chapter"] = chapter_of(fp)
    sitemap[pdf] = entries

# Bygg kanonisk boksida → bästa tillgängliga PDF-källa
# Prioritet: primär PDF först, sedan andra PDF:er som innehåller sidan
canonical = {}
for ch in CHAPTERS:
    primary = PRIMARY_PDF_PER_CHAPTER[ch["name"]]
    fallback_order = [primary] + [p for p in PDFS if p != primary]
    for bp in range(ch["start"], ch["end"]+1):
        for pdf_candidate in fallback_order:
            match = next((e for e in sitemap[pdf_candidate] if e["book_page"] == bp), None)
            if match:
                canonical[bp] = {
                    "book_page": bp,
                    "chapter": ch["name"],
                    "source_pdf": pdf_candidate,
                    "pdf_page": match["pdf_page"],
                    "book_page_source": match["book_page_source"],
                    "is_fallback": pdf_candidate != primary,
                }
                break

# Vad saknas?
all_book_pages = set(range(2, 362))
covered = set(canonical.keys())
missing = sorted(all_book_pages - covered)

# Skriv master
out = {
    "chapters": CHAPTERS,
    "per_pdf": sitemap,
    "canonical_pages": canonical,
    "missing_pages": missing,
    "primary_pdf_per_chapter": PRIMARY_PDF_PER_CHAPTER,
}
with open(WORK / "sitemap_final.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

# Rapport
print("="*70)
print("SLUTGILTIG SIDKARTA - SAMMANFATTNING")
print("="*70)
print(f"\nTotalt unika boksidor täckta: {len(covered)} / 360")
print(f"Saknade boksidor: {len(missing)}")
if missing:
    print(f"  Sidor som saknas: {missing}")

print("\nPer kapitel:")
for ch in CHAPTERS:
    pages_in_ch = sum(1 for bp in covered if ch["start"] <= bp <= ch["end"])
    expected = ch["end"] - ch["start"] + 1
    primary = PRIMARY_PDF_PER_CHAPTER[ch["name"]]
    print(f"  {ch['name']:35} s.{ch['start']:3}–{ch['end']:3} | {pages_in_ch}/{expected} sidor från {primary}")

print("\nPer PDF (med källkvalitet):")
for pdf, entries in sitemap.items():
    bp_set = {e["book_page"] for e in entries if e["book_page"]}
    src_counts = Counter(e["book_page_source"] for e in entries)
    anchors = src_counts.get("anchor", 0)
    extrapolated = src_counts.get("extrapolated", 0) + src_counts.get("extrapolated_left", 0) + src_counts.get("extrapolated_right", 0)
    broken = src_counts.get("section_break", 0) + src_counts.get("section_break_implicit", 0) + src_counts.get("unknown", 0)
    print(f"  {pdf}: {len(entries)} PDF-sidor → {len(bp_set)} unika boksidor")
    print(f"    Ankare: {anchors}, Extrapolerade: {extrapolated}, Osäkra: {broken}")
