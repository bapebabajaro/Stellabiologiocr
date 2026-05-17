"""Analysera rådatat för att förstå struktur, sidspann och kapitel."""
import json
from collections import Counter, defaultdict
from ocr_local_paths import ocr_work_dir

with open(ocr_work_dir() / "page_index_raw.json", encoding="utf-8") as f:
    data = json.load(f)

print("=" * 70)
print("ÖVERSIKT PER PDF")
print("=" * 70)
per_pdf = defaultdict(list)
for r in data:
    per_pdf[r["source_pdf"]].append(r)

for pdf, rs in per_pdf.items():
    print(f"\n{pdf}: {len(rs)} PDF-sidor")
    with_cands = [r for r in rs if r["candidates"]]
    print(f"  Med sidnummerskandidat: {len(with_cands)}")
    # Plocka det mest sannolika kandidatnumret per sida (första)
    page_nums = []
    for r in with_cands:
        if r["candidates"]:
            # ta första kandidaten
            page_nums.append(r["candidates"][0][0])
    if page_nums:
        print(f"  Sidnummerspann (rå, första kandidat): {min(page_nums)}–{max(page_nums)}")
        # Hur sekventiellt?
        seq_breaks = 0
        for i in range(1, len(page_nums)):
            if page_nums[i] != page_nums[i-1] + 1 and page_nums[i] != page_nums[i-1] + 2:
                seq_breaks += 1
        print(f"  Hopp i sekvensen: {seq_breaks}")

print("\n" + "=" * 70)
print("KAPITELMARKÖRER (alla 'chapter_label')")
print("=" * 70)
for r in data:
    for m in r["chapter_markers"]:
        if m["type"] == "chapter_label":
            print(f"  {r['source_pdf']} PDF s.{r['pdf_page']}: {m['text']!r}")

print("\n" + "=" * 70)
print("VERSALRUBRIKER (de 40 första, per PDF)")
print("=" * 70)
for pdf, rs in per_pdf.items():
    print(f"\n--- {pdf} ---")
    shown = 0
    for r in rs:
        for m in r["chapter_markers"]:
            if m["type"] == "uppercase_heading" and shown < 40:
                print(f"  PDF s.{r['pdf_page']:3}: {m['text']!r}")
                shown += 1
                break

print("\n" + "=" * 70)
print("FÖRSTA 5 RADER PÅ SIDA 1, 5, 10, 20 PER PDF (sanity check)")
print("=" * 70)
for pdf, rs in per_pdf.items():
    print(f"\n--- {pdf} ---")
    for target in [1, 5, 10, 20, 50]:
        match = [r for r in rs if r["pdf_page"] == target]
        if match:
            r = match[0]
            print(f"  PDF s.{target}: cands={r['candidates'][:3] if r['candidates'] else None}")
            for fl in r["first_lines"][:3]:
                print(f"    > {fl[:80]}")
