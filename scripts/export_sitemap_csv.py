"""Exportera sidkartan som CSV och Markdown för granskning."""
import json
import csv
from pathlib import Path

WORK = Path("/home/user/workspace/stella_work")
with open(WORK / "sitemap_final.json", encoding="utf-8") as f:
    final = json.load(f)

# CSV - en rad per kanonisk boksida
csv_path = WORK / "stella_biologi_sidkarta.csv"
with open(csv_path, "w", newline="", encoding="utf-8") as fh:
    w = csv.writer(fh)
    w.writerow(["boksida", "kapitel", "kalla_pdf", "pdf_sida", "kallkvalitet", "ar_fallback"])
    for bp in sorted(int(k) for k in final["canonical_pages"].keys()):
        rec = final["canonical_pages"][str(bp)]
        w.writerow([
            rec["book_page"],
            rec["chapter"],
            rec["source_pdf"],
            rec["pdf_page"],
            rec["book_page_source"],
            "ja" if rec.get("is_fallback") else "nej",
        ])

# Markdown - översikt + saknade sidor + per-kapitel-tabeller
md_path = WORK / "stella_biologi_sidkarta.md"
lines = []
lines.append("# Stella Biologi — sidkarta\n")
lines.append(f"Datum: 2026-05-15\n")
lines.append(f"Källfiler: 5 PDF:er (Biologi-Stella-kapitel-1, Stella-biolgi-kapitel-2, Biologi-del-1, Biologi-del-2, Biologi-del-3)\n")
lines.append(f"Täckning: {len(final['canonical_pages'])}/360 boksidor\n")
lines.append(f"Saknade sidor: {final['missing_pages']}\n\n")

lines.append("## Kapitelstruktur\n\n")
lines.append("| Kapitel | Boksidor | Primär PDF |\n")
lines.append("|---|---|---|\n")
for ch in final["chapters"]:
    lines.append(f"| {ch['name']} | s.{ch['start']}–{ch['end']} | {final['primary_pdf_per_chapter'][ch['name']]} |\n")

lines.append("\n## Per-sida-mappning\n\n")
for ch in final["chapters"]:
    lines.append(f"\n### {ch['name']} (s.{ch['start']}–{ch['end']})\n\n")
    lines.append("| Boksida | Källa-PDF | PDF-sida | Kvalitet |\n|---|---|---|---|\n")
    for bp in range(ch["start"], ch["end"]+1):
        rec = final["canonical_pages"].get(str(bp))
        if rec:
            fb = " (fallback)" if rec.get("is_fallback") else ""
            lines.append(f"| **{bp}** | {rec['source_pdf']}{fb} | {rec['pdf_page']} | {rec['book_page_source']} |\n")
        else:
            lines.append(f"| **{bp}** | — | — | SAKNAS |\n")

with open(md_path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"Skrev:\n  {csv_path}\n  {md_path}")
