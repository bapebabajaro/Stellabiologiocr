"""Lista de PDF-sidor som har osäker sidnummermappning."""
import json
from pathlib import Path
from ocr_local_paths import ocr_work_dir

with open(ocr_work_dir() / "sitemap_final.json", encoding="utf-8") as f:
    final = json.load(f)

# Vilka PDF-sidor i Stella-biolgi-kapitel-2 är osäkra?
print("Osäkra PDF-sidor i Stella-biolgi-kapitel-2:")
for e in final["per_pdf"]["Stella-biolgi-kapitel-2"]:
    if e["book_page_source"] in ("section_break", "section_break_implicit", "unknown"):
        print(f"  PDF s.{e['pdf_page']}: source={e['book_page_source']}, raw_page={e['raw_page']}")

print("\nOsäkra PDF-sidor i Biologi-del-1:")
for e in final["per_pdf"]["Biologi-del-1"]:
    if e["book_page_source"] in ("section_break", "section_break_implicit", "unknown"):
        print(f"  PDF s.{e['pdf_page']}: source={e['book_page_source']}, raw_page={e['raw_page']}")
