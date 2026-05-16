"""
Hittar tryckta boksidnummer och kapitelinformation på varje sida.
Boksidnummer ligger typiskt:
- Som isolerat tal överst eller nederst på sidan
- Ofta i sidans yttre marginal
"""
import os
import re
import json
from pathlib import Path

TEXT_ROOT = Path("/home/user/workspace/stella_work/text")
OUT = Path("/home/user/workspace/stella_work/page_index_raw.json")

def find_page_number(lines):
    """
    Hitta troligt boksidnummer.
    Strategi: leta efter isolerat tal (1-3 siffror) på första eller sista
    icke-tomma raden, eller bland de första/sista 3 raderna.
    """
    non_empty = [(i, l.strip()) for i, l in enumerate(lines) if l.strip()]
    if not non_empty:
        return None, None

    candidates = []
    # Kolla första 3 och sista 3 raderna
    check = non_empty[:3] + non_empty[-3:]
    for idx, line in check:
        # Isolerat tal på raden, ev. med whitespace
        m = re.match(r'^\s*(\d{1,3})\s*$', line)
        if m:
            num = int(m.group(1))
            if 1 <= num <= 400:
                pos = "top" if idx < len(lines)/2 else "bottom"
                candidates.append((num, pos, idx))
        # Tal i början eller slutet av rad med annat innehåll
        m2 = re.match(r'^\s*(\d{1,3})\s+\S', line)
        if m2:
            num = int(m2.group(1))
            if 1 <= num <= 400:
                pos = "top" if idx < len(lines)/2 else "bottom"
                candidates.append((num, pos+"_start", idx))
        m3 = re.search(r'\S\s+(\d{1,3})\s*$', line)
        if m3:
            num = int(m3.group(1))
            if 1 <= num <= 400:
                pos = "top" if idx < len(lines)/2 else "bottom"
                candidates.append((num, pos+"_end", idx))
    return candidates, non_empty

def find_chapter_markers(lines):
    """Leta efter kapitelrubriker och stora rubriker (versaler)."""
    markers = []
    for i, line in enumerate(lines[:15]):  # rubriker oftast i toppen
        s = line.strip()
        if not s:
            continue
        # Versalrubrik (minst 4 tecken, mest versaler)
        letters = [c for c in s if c.isalpha()]
        if len(letters) >= 4:
            upper_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
            if upper_ratio > 0.7 and len(s) < 80:
                markers.append({"line": i, "text": s, "type": "uppercase_heading"})
        # "Kapitel X" eller "KAPITEL X"
        if re.search(r'[Kk]apitel\s+\d+', s):
            markers.append({"line": i, "text": s, "type": "chapter_label"})
    return markers

results = []
for pdf_dir in sorted(TEXT_ROOT.iterdir()):
    if not pdf_dir.is_dir():
        continue
    pdf_name = pdf_dir.name
    for txt_file in sorted(pdf_dir.glob("page_*.txt")):
        pdf_page = int(re.search(r'page_(\d+)', txt_file.name).group(1))
        with open(txt_file, encoding='utf-8', errors='replace') as f:
            content = f.read()
        lines = content.splitlines()
        cands, non_empty = find_page_number(lines)
        chapter_markers = find_chapter_markers(lines)
        first_lines = [l.strip() for l in lines if l.strip()][:5]
        results.append({
            "source_pdf": pdf_name,
            "pdf_page": pdf_page,
            "candidates": cands,
            "first_lines": first_lines,
            "chapter_markers": chapter_markers,
            "char_count": len(content),
            "nonempty_line_count": len(non_empty) if non_empty else 0,
        })

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"Skrev {len(results)} poster till {OUT}")
print(f"Sidor med sidnummerskandidat: {sum(1 for r in results if r['candidates'])}")
print(f"Sidor utan sidnummerskandidat: {sum(1 for r in results if not r['candidates'])}")
