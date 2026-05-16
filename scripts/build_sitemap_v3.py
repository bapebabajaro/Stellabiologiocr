"""
v3: Bättre extrapolering som hanterar sektionshopp inom samma PDF.
När två ankarpunkter inom en PDF visar att (book_diff != pdf_diff),
betyder det ett sektionsbyte. Då ska extrapoleringen brytas där.
"""
import json
import re
from pathlib import Path
from collections import Counter

WORK = Path("/home/user/workspace/stella_work")

PDFS_ORDER = ["Biologi-Stella-kapitel-1", "Stella-biolgi-kapitel-2",
              "Biologi-del-1", "Biologi-del-2", "Biologi-del-3"]
PAGE_COUNTS = {
    "Biologi-Stella-kapitel-1": 76,
    "Stella-biolgi-kapitel-2": 66,
    "Biologi-del-1": 100,
    "Biologi-del-2": 80,
    "Biologi-del-3": 100,
}

v4 = {}
for pdf in PDFS_ORDER:
    with open(WORK / f"footer_ocr_v4_{pdf}.json", encoding="utf-8") as f:
        v4.update(json.load(f))

def normalize_chapter(s):
    if not s:
        return None
    s = s.strip()
    s = re.sub(r'^[^A-ZÅÄÖa-zåäö]+', '', s)
    s = re.sub(r'[^A-ZÅÄÖa-zåäö\s]+$', '', s)
    s = s.strip()
    if len(s) < 3:
        return None
    upper = sum(1 for c in s if c.isupper())
    letters = sum(1 for c in s if c.isalpha())
    if letters > 0 and upper / letters > 0.6:
        s = s.upper()
    return s

# Bygg per-PDF lista
per_pdf = {}
for pdf, n in PAGE_COUNTS.items():
    entries = []
    for pp in range(1, n+1):
        rec = v4.get(f"{pdf}/{pp:03d}", {})
        entries.append({
            "pdf_page": pp,
            "raw_page": rec.get("page_num"),
            "raw_chapter": normalize_chapter(rec.get("chapter")),
        })
    per_pdf[pdf] = entries

def find_validated_anchors(entries):
    """
    Hitta ankarpunkter där två närliggande sidor stämmer sekventiellt.
    Returnerar lista (idx, book_page) med endast verifierade ankare.
    """
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
    return [(i, entries[i]["raw_page"]) for i in range(n) if score[i] >= 1]

def fill_with_section_awareness(entries, anchors):
    """
    Extrapolera mellan ankare, men bara om de tillhör samma sektion.
    Två ankare tillhör samma sektion om (book_diff == pdf_diff).
    """
    n = len(entries)
    final = [None]*n
    sources = ["unknown"]*n
    for idx, bp in anchors:
        final[idx] = bp
        sources[idx] = "anchor"

    # Hitta "sektionsbrott" - där två närliggande ankare har book_diff != pdf_diff
    anchor_indices = [a[0] for a in anchors]
    section_breaks = set()
    for k in range(len(anchor_indices)-1):
        i1 = anchor_indices[k]
        i2 = anchor_indices[k+1]
        bp1 = final[i1]
        bp2 = final[i2]
        pdf_diff = entries[i2]["pdf_page"] - entries[i1]["pdf_page"]
        book_diff = bp2 - bp1
        if book_diff != pdf_diff:
            # Sektionsbrott någonstans mellan i1 och i2
            # Markera alla sidor mellan i1 och i2 som "tvetydiga"
            for j in range(i1+1, i2):
                section_breaks.add(j)

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
        # Är denna sida i ett sektionsbrott?
        if i in section_breaks:
            sources[i] = "section_break_unknown"
            # Lämna final[i] som None - kräver visuell verifiering
            continue
        if left and right:
            from_left = left[1] + (pp_i - entries[left[0]]["pdf_page"])
            from_right = right[1] - (entries[right[0]]["pdf_page"] - pp_i)
            if from_left == from_right:
                final[i] = from_left
                sources[i] = "extrapolated"
            else:
                # Sektionsbrott - lämna osäker
                sources[i] = "section_break_inconsistent"
        elif left:
            final[i] = left[1] + (pp_i - entries[left[0]]["pdf_page"])
            sources[i] = "extrapolated_left"
        elif right:
            final[i] = right[1] - (entries[right[0]]["pdf_page"] - pp_i)
            sources[i] = "extrapolated_right"
    return final, sources

sitemap = {}
for pdf, entries in per_pdf.items():
    anchors = find_validated_anchors(entries)
    final, sources = fill_with_section_awareness(entries, anchors)
    for e, fp, src in zip(entries, final, sources):
        e["book_page"] = fp
        e["book_page_source"] = src
    sitemap[pdf] = entries
    bp = [e["book_page"] for e in entries if e["book_page"]]
    src_counts = Counter(sources)
    print(f"\n{pdf}: {len(entries)} PDF-sidor, {len(anchors)} ankare")
    for s, c in src_counts.most_common():
        print(f"  {s}: {c}")
    if bp:
        print(f"  Boksidspann: {min(bp)}–{max(bp)}")
        # Lista luckor inom spannet
        bp_set = set(bp)
        expected = set(range(min(bp), max(bp)+1))
        missing = sorted(expected - bp_set)
        if missing:
            print(f"  Luckor i spannet: {len(missing)} st: {missing[:20]}")

with open(WORK / "sitemap_v3.json", "w", encoding="utf-8") as f:
    json.dump(sitemap, f, ensure_ascii=False, indent=2)
print("\nSparad: sitemap_v3.json")
