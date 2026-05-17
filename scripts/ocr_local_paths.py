"""Local-only OCR paths.

The public contract files use private-source:// locators. These helpers keep
machine-specific PDF/OCR working paths in ignored local state.
"""

import os
from pathlib import Path


def ocr_work_dir() -> Path:
    return Path(os.environ.get("STELLA_OCR_WORK_DIR", "private-source-local/stella_work"))


def ocr_pdf_dir() -> Path:
    return Path(os.environ.get("STELLA_OCR_PDF_DIR", "private-source-local/pdfer"))


def ocr_pdf_path(pdf_name: str) -> str:
    env_name = "STELLA_OCR_PDF_" + "".join(
        char.upper() if char.isalnum() else "_" for char in pdf_name
    )
    return os.environ.get(env_name, str(ocr_pdf_dir() / f"{pdf_name}.pdf"))
