"""
V2: Större marginal-crop (15% topp/botten), samt högre OCR-upplösning för
del 2 som verkar ha sidnummer på annan plats.
"""
import subprocess
import re
import json
from pathlib import Path
from PIL import Image
from concurrent.futures import ProcessPoolExecutor, as_completed

THUMBS = Path("/home/user/workspace/stella_work/thumbs")
OUT = Path("/home/user/workspace/stella_work/margin_ocr_v2.json")

def ocr_region(img, top_frac, bot_frac, label_prefix, stem):
    w, h = img.size
    top = img.crop((0, 0, w, int(h * top_frac)))
    bot = img.crop((0, int(h * (1-bot_frac)), w, h))
    results = {}
    for label, region in [(f"{label_prefix}_top", top), (f"{label_prefix}_bottom", bot)]:
        tmp = f"/tmp/m2_{stem}_{label}.png"
        region.save(tmp)
        try:
            out = subprocess.run(
                ["tesseract", tmp, "-", "-l", "swe", "--psm", "6"],
                capture_output=True, text=True, timeout=20
            )
            text = out.stdout.strip()
        except Exception as e:
            text = f"<err:{e}>"
        results[label] = text
        Path(tmp).unlink(missing_ok=True)
    return results

def process(png_path):
    img = Image.open(png_path)
    # Två snitt: smal (8%) och bred (15%)
    r = ocr_region(img, 0.08, 0.08, "narrow", png_path.stem)
    r2 = ocr_region(img, 0.15, 0.15, "wide", png_path.stem)
    r.update(r2)
    return png_path, r

tasks = []
for pdf_dir in sorted(THUMBS.iterdir()):
    if not pdf_dir.is_dir():
        continue
    for png in sorted(pdf_dir.glob("p-*.png")):
        tasks.append(png)

print(f"V2 OCR: {len(tasks)} sidor...")
results = {}
with ProcessPoolExecutor(max_workers=4) as ex:
    futures = {ex.submit(process, p): p for p in tasks}
    done = 0
    for fut in as_completed(futures):
        png_path, margins = fut.result()
        key = f"{png_path.parent.name}/{png_path.name}"
        results[key] = margins
        done += 1
        if done % 40 == 0:
            print(f"  {done}/{len(tasks)}")

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"Klart.")
