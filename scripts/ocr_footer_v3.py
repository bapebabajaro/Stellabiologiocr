"""
V3: Riktad OCR på nedre högra hörnet där 'KAPITELRUBRIK ✱ NN' sitter.
Plus mittersta sidan av översta delen för kapitelrubriker som börjar avsnitt.
"""
import subprocess
import re
import json
from pathlib import Path
from PIL import Image
from concurrent.futures import ProcessPoolExecutor, as_completed

THUMBS = Path("/home/user/workspace/stella_work/thumbs")
OUT = Path("/home/user/workspace/stella_work/footer_ocr_v3.json")

def ocr_zone(img, box, stem, label):
    """box: (left_frac, top_frac, right_frac, bottom_frac)"""
    w, h = img.size
    crop = img.crop((int(w*box[0]), int(h*box[1]), int(w*box[2]), int(h*box[3])))
    tmp = f"/tmp/v3_{stem}_{label}.png"
    crop.save(tmp)
    try:
        out = subprocess.run(
            ["tesseract", tmp, "-", "-l", "swe", "--psm", "7"],
            capture_output=True, text=True, timeout=15
        )
        text = out.stdout.strip()
    except Exception as e:
        text = f"<err:{e}>"
    Path(tmp).unlink(missing_ok=True)
    return text

def process(png_path):
    img = Image.open(png_path)
    results = {}
    # Footer höger - där 'KAPITEL ✱ NN' finns
    results["footer_right"] = ocr_zone(img, (0.55, 0.88, 1.00, 0.99), png_path.stem, "fr")
    # Footer vänster (för jämna sidor om numreringen är spegelvänd)
    results["footer_left"] = ocr_zone(img, (0.00, 0.88, 0.45, 0.99), png_path.stem, "fl")
    return png_path, results

def parse_footer(text):
    """Extrahera (kapitel, sidnummer) från footer-text."""
    if not text:
        return None, None
    # Hitta sidnumret: 1-3 siffror i slutet
    # Stjärnan/asterisken blir ofta inte korrekt OCR:ad - kan vara *, %, +, x, w m.m.
    m = re.search(r'(\d{1,3})\s*$', text)
    if not m:
        return None, None
    page_num = int(m.group(1))
    if not (1 <= page_num <= 400):
        return None, None
    # Allt före siffran är kapitel + skiljetecken
    prefix = text[:m.start()].strip()
    # Ta bort vanliga skiljetecken/stjärnor från slutet
    prefix = re.sub(r'[\*\+\%\#\xA0xw\s]+$', '', prefix).strip()
    return prefix if prefix else None, page_num

tasks = []
for pdf_dir in sorted(THUMBS.iterdir()):
    if not pdf_dir.is_dir():
        continue
    for png in sorted(pdf_dir.glob("p-*.png")):
        tasks.append(png)

print(f"V3 OCR (footer right+left): {len(tasks)} sidor...")
results = {}
with ProcessPoolExecutor(max_workers=4) as ex:
    futures = {ex.submit(process, p): p for p in tasks}
    done = 0
    for fut in as_completed(futures):
        png_path, margins = fut.result()
        key = f"{png_path.parent.name}/{png_path.name}"
        ch_r, num_r = parse_footer(margins["footer_right"])
        ch_l, num_l = parse_footer(margins["footer_left"])
        results[key] = {
            "footer_right_text": margins["footer_right"],
            "footer_left_text": margins["footer_left"],
            "right_chapter": ch_r,
            "right_page": num_r,
            "left_chapter": ch_l,
            "left_page": num_l,
        }
        done += 1
        if done % 40 == 0:
            print(f"  {done}/{len(tasks)}")

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"Klart.")

# Snabb sammanfattning
hits_r = sum(1 for v in results.values() if v["right_page"])
hits_l = sum(1 for v in results.values() if v["left_page"])
hits_any = sum(1 for v in results.values() if v["right_page"] or v["left_page"])
print(f"\nRight footer hits: {hits_r}/{len(results)}")
print(f"Left footer hits: {hits_l}/{len(results)}")
print(f"Någondera: {hits_any}/{len(results)}")
