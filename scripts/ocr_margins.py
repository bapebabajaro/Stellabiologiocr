"""
Kör Tesseract OCR enbart på topp- och bottenmarginalerna för att
hitta tryckta boksidnummer.
"""
import subprocess
import re
import json
from pathlib import Path
from PIL import Image
from concurrent.futures import ProcessPoolExecutor, as_completed
from ocr_local_paths import ocr_work_dir

WORK = ocr_work_dir()
THUMBS = WORK / "thumbs"
OUT = WORK / "margin_ocr.json"

def ocr_margins(png_path):
    img = Image.open(png_path)
    w, h = img.size
    # Översta 8% och nedersta 8%
    top = img.crop((0, 0, w, int(h * 0.08)))
    bot = img.crop((0, int(h * 0.92), w, h))
    results = {}
    for label, region in [("top", top), ("bottom", bot)]:
        tmp = f"/tmp/margin_{png_path.stem}_{label}.png"
        region.save(tmp)
        try:
            out = subprocess.run(
                ["tesseract", tmp, "-", "-l", "swe", "--psm", "7"],
                capture_output=True, text=True, timeout=20
            )
            text = out.stdout.strip()
        except Exception as e:
            text = f"<err:{e}>"
        results[label] = text
        Path(tmp).unlink(missing_ok=True)
    return png_path, results

def extract_page_num(margin_text):
    """Hitta troligt sidnummer i marginal-text."""
    if not margin_text:
        return None
    # Leta efter isolerat 1-3-siffrigt tal
    matches = re.findall(r'\b(\d{1,3})\b', margin_text)
    if matches:
        nums = [int(m) for m in matches if 1 <= int(m) <= 400]
        if nums:
            return nums[0] if len(nums) == 1 else nums
    return None

tasks = []
for pdf_dir in sorted(THUMBS.iterdir()):
    if not pdf_dir.is_dir():
        continue
    for png in sorted(pdf_dir.glob("p-*.png")):
        tasks.append(png)

print(f"Bearbetar {len(tasks)} sidor parallellt...")
results = {}
with ProcessPoolExecutor(max_workers=4) as ex:
    futures = {ex.submit(ocr_margins, p): p for p in tasks}
    done = 0
    for fut in as_completed(futures):
        png_path, margins = fut.result()
        key = f"{png_path.parent.name}/{png_path.name}"
        results[key] = {
            "top_text": margins["top"],
            "bottom_text": margins["bottom"],
            "top_num": extract_page_num(margins["top"]),
            "bottom_num": extract_page_num(margins["bottom"]),
        }
        done += 1
        if done % 20 == 0:
            print(f"  {done}/{len(tasks)}")

with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print(f"\nKlart. Skrev {OUT}")
