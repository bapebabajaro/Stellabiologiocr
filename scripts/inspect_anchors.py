"""Visa alla validerade ankarpunkter per PDF för manuell granskning."""
import json
from pathlib import Path
from ocr_local_paths import ocr_work_dir

WORK = ocr_work_dir()
with open(WORK / "sitemap_v3.json", encoding="utf-8") as f:
    sitemap = json.load(f)

for pdf, entries in sitemap.items():
    print(f"\n{'='*60}\n{pdf}\n{'='*60}")
    anchors = [(e["pdf_page"], e["book_page"], e["raw_chapter"])
               for e in entries if e["book_page_source"] == "anchor"]
    print(f"  PDF-s | Bok-s | Kapitel")
    for pp, bp, ch in anchors:
        print(f"  {pp:5} | {bp:5} | {ch}")
