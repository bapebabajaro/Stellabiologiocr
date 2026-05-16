"""Lista alla säkra marginalträffar för att se var de faktiska sekvenserna går."""
import json
from pathlib import Path

with open("/home/user/workspace/stella_work/sitemap_v1.json", encoding="utf-8") as f:
    sitemap = json.load(f)

for pdf_name, pages in sitemap.items():
    print(f"\n{'='*70}\n{pdf_name} — säkra marginalträffar\n{'='*70}")
    anchors = []
    for p in pages:
        # Hämta första marginalkandidat
        for num, src in p["candidates"]:
            if src.startswith("margin"):
                anchors.append((p["pdf_page"], num, src))
                break
    print(f"Totalt ankarpunkter: {len(anchors)}")
    print(f"{'PDF-s':>6} {'Bok-s':>6}  Källa")
    for pp, bp, src in anchors:
        print(f"{pp:>6} {bp:>6}  {src}")
