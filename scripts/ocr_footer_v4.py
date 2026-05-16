"""
V4: Rendera footer-zonen direkt från PDF i 400 DPI för maximal OCR-kvalitet.
"""
import subprocess
import re
import json
from pathlib import Path
from PIL import Image, ImageOps
from concurrent.futures import ProcessPoolExecutor, as_completed

WORK = Path("/home/user/workspace/stella_work")
OUT = WORK / "footer_ocr_v4.json"

PDFS = {
    "Biologi-del-1": "/home/user/workspace/Biologi-del-1.pdf",
    "Biologi-del-2": "/home/user/workspace/Biologi-del-2.pdf",
    "Biologi-del-3": "/home/user/workspace/Biologi-del-3.pdf",
    "Biologi-Stella-kapitel-1": "/home/user/workspace/Biologi-Stella-kapitel-1.pdf",
    "Stella-biolgi-kapitel-2": "/home/user/workspace/Stella-biolgi-kapitel-2.pdf",
}

# Antal sidor per PDF
PAGE_COUNTS = {
    "Biologi-del-1": 100,
    "Biologi-del-2": 80,
    "Biologi-del-3": 100,
    "Biologi-Stella-kapitel-1": 76,
    "Stella-biolgi-kapitel-2": 66,
}

import sys
ONLY_PDF = sys.argv[1] if len(sys.argv) > 1 else None

def render_and_ocr_footer(pdf_path, pdf_page, label):
    """Rendera en enskild sida i 300 DPI och OCR:a nedre delen."""
    tmp_prefix = f"/tmp/v4_{label}"
    # Rendera bara denna sida i 300 DPI
    subprocess.run(
        ["pdftoppm", "-r", "250", "-f", str(pdf_page), "-l", str(pdf_page),
         "-png", pdf_path, tmp_prefix],
        capture_output=True, timeout=90
    )
    # Hitta filen pdftoppm skapade
    candidates = list(Path("/tmp").glob(f"v4_{label}-*.png"))
    if not candidates:
        return {"error": "no rendered file"}
    img_path = candidates[0]
    img = Image.open(img_path)
    w, h = img.size
    # Crop nedersta 12% — separat höger och vänster
    bottom_full = img.crop((0, int(h * 0.88), w, h))
    bottom_right = img.crop((int(w*0.5), int(h * 0.88), w, h))
    bottom_left = img.crop((0, int(h * 0.88), int(w*0.5), h))

    def ocr(region, suffix):
        g = ImageOps.autocontrast(ImageOps.grayscale(region), cutoff=2)
        tmp = f"/tmp/v4_{label}_{suffix}.png"
        g.save(tmp)
        try:
            r = subprocess.run(["tesseract", tmp, "-", "-l", "swe", "--psm", "7"],
                              capture_output=True, text=True, timeout=15)
            t = r.stdout.strip()
        except Exception as e:
            t = f"<err:{e}>"
        Path(tmp).unlink(missing_ok=True)
        return t

    text_full = ocr(bottom_full, "full")
    text_right = ocr(bottom_right, "right")
    text_left = ocr(bottom_left, "left")

    # Cleanup
    img_path.unlink(missing_ok=True)

    return {"psm7": text_full, "psm6": text_full, "right": text_right, "left": text_left}

def parse_pageno_and_chapter(text):
    """Höger-layout: KAPITEL ✱ NN — sidnummer sist på raden."""
    if not text:
        return None, None
    last_lines = [l for l in text.splitlines() if l.strip()]
    for line in reversed(last_lines):
        m = re.search(r'(\d{1,3})\s*$', line)
        if m:
            num = int(m.group(1))
            if 1 <= num <= 400:
                prefix = line[:m.start()].strip()
                prefix = re.sub(r'[\*\+\%\#xw\xA0\s]+$', '', prefix).strip()
                return prefix if prefix else None, num
    return None, None

def parse_pageno_and_chapter_left(text):
    """Vänster-layout: NN ✱ KAPITEL — sidnummer först på raden."""
    if not text:
        return None, None
    last_lines = [l for l in text.splitlines() if l.strip()]
    for line in last_lines:
        m = re.match(r'^\s*(\d{1,3})\b', line)
        if m:
            num = int(m.group(1))
            if 1 <= num <= 400:
                rest = line[m.end():].strip()
                rest = re.sub(r'^[\*\+\%\#xw\xA0\s]+', '', rest).strip()
                return rest if rest else None, num
    return None, None

def task(args):
    pdf_name, pdf_page = args
    pdf_path = PDFS[pdf_name]
    label = f"{pdf_name}_{pdf_page:03d}"
    r = render_and_ocr_footer(pdf_path, pdf_page, label)
    if "error" in r:
        return pdf_name, pdf_page, r, None, None
    # Försök höger, vänster, sedan full
    ch_r, p_r = parse_pageno_and_chapter(r.get("right", ""))
    ch_l, p_l = parse_pageno_and_chapter_left(r.get("left", ""))
    ch_f, p_f = parse_pageno_and_chapter(r.get("psm7", ""))
    if p_r is not None:
        return pdf_name, pdf_page, r, ch_r, p_r
    if p_l is not None:
        return pdf_name, pdf_page, r, ch_l, p_l
    if p_f is not None:
        return pdf_name, pdf_page, r, ch_f, p_f
    return pdf_name, pdf_page, r, None, None

tasks = []
for pdf_name, n in PAGE_COUNTS.items():
    if ONLY_PDF and pdf_name != ONLY_PDF:
        continue
    for p in range(1, n+1):
        tasks.append((pdf_name, p))

print(f"V4: Rendrerar och OCR:ar {len(tasks)} sidor i 300 DPI...")
results = {}
with ProcessPoolExecutor(max_workers=2) as ex:
    futures = {ex.submit(task, t): t for t in tasks}
    done = 0
    for fut in as_completed(futures):
        pdf_name, pdf_page, ocr, ch, num = fut.result()
        results[f"{pdf_name}/{pdf_page:03d}"] = {
            "ocr": ocr,
            "chapter": ch,
            "page_num": num,
        }
        done += 1
        if done % 30 == 0:
            print(f"  {done}/{len(tasks)}")

out_path = OUT.with_name(f"footer_ocr_v4_{ONLY_PDF or 'all'}.json")
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

hits = sum(1 for v in results.values() if v["page_num"] is not None)
print(f"\nTräffar: {hits}/{len(results)}")
