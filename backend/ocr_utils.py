"""Receipt OCR and locale-aware extraction helpers."""
from __future__ import annotations

import logging
import os
import re
import unicodedata
from datetime import date

import pytesseract
from pytesseract import Output
from pytesseract.pytesseract import TesseractError, TesseractNotFoundError

try:
    from PIL import Image, ImageFilter, ImageOps
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import pymupdf
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False


logger = logging.getLogger(__name__)
MAX_PDF_PAGES = 5
MAX_PDF_RENDER_PIXELS = 8_000_000
MAX_PDF_PREVIEW_PIXELS = 2_000_000

_tesseract_cmd = os.getenv("TESSERACT_CMD")
if not _tesseract_cmd and os.name == "nt":
    _windows_tesseract = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(_windows_tesseract):
        _tesseract_cmd = _windows_tesseract
if _tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd

_DATE_NUMERIC = re.compile(
    r"(?<!\d)(?:\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})(?!\d)"
)
_TIME_PATTERN = re.compile(
    r"(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM)?(?![A-Z])",
    re.IGNORECASE,
)
_AMOUNT_PATTERN = re.compile(
    r"(?<![\d/])(?:\d{1,3}(?:[\s\u00a0\u202f.,'’]\d{3})+|\d+)(?:[.,]\d{1,2})?(?![\d/])"
)
_CURRENCY_PATTERN = re.compile(
    r"(?:₺|€|£|\$|\b(?:TRY|TL|USD|EUR|GBP|CHF|CAD|AUD|JPY|INR|AED)\b)",
    re.IGNORECASE,
)
_SUBTOTAL_PATTERN = re.compile(r"\b(?:ara\s+toplam|subtotal|sub\s+total)\b")
_DISCOUNT_TOTAL_PATTERN = re.compile(
    r"\b(?:toplam\s+(?:indirim|iskonto)|(?:indirim|iskonto)\s+toplami|"
    r"total\s+discount|discount\s+total)\b"
)
_TOTAL_PATTERNS = (
    (4, re.compile(
        r"\b(?:genel\s+toplam|toplam\s+tutar|odenecek(?:\s+tutar)?|"
        r"tahsil\s+edilen|grand\s+total|total\s+due|amount\s+due|balance\s+due)\b"
    )),
    (3, re.compile(r"\b(?:toplam|total|amount\s+due|payable)\b")),
)

_MONTHS = {
    "ocak": 1, "jan": 1, "january": 1,
    "subat": 2, "feb": 2, "february": 2,
    "mart": 3, "mar": 3, "march": 3,
    "nisan": 4, "apr": 4, "april": 4,
    "mayis": 5, "may": 5,
    "haziran": 6, "jun": 6, "june": 6,
    "temmuz": 7, "jul": 7, "july": 7,
    "agustos": 8, "aug": 8, "august": 8,
    "eylul": 9, "sep": 9, "september": 9,
    "ekim": 10, "oct": 10, "october": 10,
    "kasim": 11, "nov": 11, "november": 11,
    "aralik": 12, "dec": 12, "december": 12,
}


def _empty_result(raw_text: str) -> dict:
    return {
        "ocr_price": None,
        "ocr_date": None,
        "ocr_time": None,
        "ocr_raw_text": raw_text,
    }


def validate_pdf_bytes(contents: bytes) -> None:
    if not PYMUPDF_AVAILABLE:
        raise ValueError("PDF support is unavailable; install PyMuPDF.")

    try:
        with pymupdf.open(stream=contents, filetype="pdf") as document:
            if document.needs_pass:
                raise ValueError("Password-protected PDFs are not supported.")
            if len(document) == 0:
                raise ValueError("The PDF contains no pages.")
            if len(document) > MAX_PDF_PAGES:
                raise ValueError(f"PDFs are limited to {MAX_PDF_PAGES} pages.")
    except ValueError:
        raise
    except Exception as error:
        raise ValueError("The uploaded PDF is invalid or unreadable.") from error


def get_pdf_page_count(pdf_bytes: bytes) -> int:
    if not PYMUPDF_AVAILABLE:
        raise RuntimeError("PDF preview is unavailable; install PyMuPDF.")

    with pymupdf.open(stream=pdf_bytes, filetype="pdf") as document:
        if document.needs_pass:
            raise ValueError("Password-protected PDFs are not supported.")
        if len(document) == 0:
            raise ValueError("The PDF contains no pages.")
        return len(document)


def render_pdf_preview(pdf_bytes: bytes, page_number: int = 1) -> bytes:
    if not PYMUPDF_AVAILABLE:
        raise RuntimeError("PDF preview is unavailable; install PyMuPDF.")

    with pymupdf.open(stream=pdf_bytes, filetype="pdf") as document:
        if document.needs_pass:
            raise ValueError("Password-protected PDFs are not supported.")
        if page_number < 1 or page_number > len(document):
            raise ValueError("PDF page not found.")

        page = document[page_number - 1]
        page_area = max(1.0, page.rect.width * page.rect.height)
        scale = min(1.5, (MAX_PDF_PREVIEW_PIXELS / page_area) ** 0.5)
        pixmap = page.get_pixmap(
            matrix=pymupdf.Matrix(scale, scale),
            alpha=False,
        )
        return pixmap.tobytes("png")


def _fold_text(text: str) -> str:
    text = text.casefold().replace("ı", "i")
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def _resolve_tessdata_dir() -> str | None:
    configured = os.getenv("TESSDATA_DIR")
    if configured:
        if not os.path.isdir(configured):
            raise RuntimeError(f"TESSDATA_DIR does not exist: {configured}")
        return configured

    local_app_data = os.getenv("LOCALAPPDATA")
    if os.name == "nt" and local_app_data:
        user_tessdata = os.path.join(
            local_app_data,
            "Tesseract-OCR",
            "tessdata",
        )
        if os.path.isfile(os.path.join(user_tessdata, "tur.traineddata")):
            return user_tessdata
    return None


def _tesseract_config(options: str = "") -> str:
    tessdata_dir = _resolve_tessdata_dir()
    if tessdata_dir:
        return f'--tessdata-dir "{tessdata_dir}" {options}'.strip()
    return options


def get_available_ocr_languages() -> list[str]:
    return pytesseract.get_languages(config=_tesseract_config())


def _resolve_ocr_languages() -> str:
    requested = [
        language.strip()
        for language in os.getenv("OCR_LANGUAGES", "eng+tur").split("+")
        if language.strip()
    ]
    try:
        available = set(get_available_ocr_languages())
    except TesseractNotFoundError:
        raise
    except TesseractError as error:
        raise RuntimeError(f"Unable to read installed Tesseract languages: {error}") from error

    selected = [language for language in requested if language in available]
    if not selected and "eng" in available:
        selected = ["eng"]
    if not selected and available:
        selected = [sorted(available)[0]]
    if not selected:
        raise RuntimeError(
            "No Tesseract language data is installed. Install eng and tur traineddata."
        )

    missing = [language for language in requested if language not in available]
    if missing:
        logger.warning(
            "Tesseract language data missing for %s; using %s",
            ", ".join(missing),
            "+".join(selected),
        )
    return "+".join(selected)


def _preprocess_images(image):
    corrected = ImageOps.exif_transpose(image)
    gray = ImageOps.grayscale(corrected)

    longest_side = max(gray.size)
    if longest_side < 1800:
        scale = min(3.0, 1800 / longest_side)
    elif longest_side > 4200:
        scale = 4200 / longest_side
    else:
        scale = 1.0
    if scale != 1.0:
        size = (max(1, round(gray.width * scale)), max(1, round(gray.height * scale)))
        gray = gray.resize(size, Image.Resampling.LANCZOS)

    enhanced = ImageOps.autocontrast(gray)
    sharpened = enhanced.filter(
        ImageFilter.UnsharpMask(radius=1.5, percent=150, threshold=3)
    )
    thresholded = enhanced.point(lambda pixel: 255 if pixel >= 175 else 0)
    return enhanced, sharpened, thresholded


def _text_from_ocr_data(data: dict) -> tuple[str, list[float]]:
    lines = {}
    confidences = []
    for index, word in enumerate(data.get("text", [])):
        word = word.strip()
        if not word:
            continue
        key = (
            data["block_num"][index],
            data["par_num"][index],
            data["line_num"][index],
        )
        lines.setdefault(key, []).append(word)
        try:
            confidence = float(data["conf"][index])
            if confidence >= 0:
                confidences.append(confidence)
        except (TypeError, ValueError, IndexError):
            continue

    text = "\n".join(" ".join(words) for words in lines.values())
    return text, confidences


def run_ocr_with_fallbacks(image) -> str:
    """Run OCR across common receipt layouts and select the clearest result."""
    language = _resolve_ocr_languages()
    variants = _preprocess_images(image)
    best_text = ""
    best_score = float("-inf")
    errors = []

    for variant in variants:
        for page_segmentation_mode in (6, 4, 11):
            try:
                data = pytesseract.image_to_data(
                    variant,
                    lang=language,
                    config=_tesseract_config(
                        f"--oem 3 --psm {page_segmentation_mode}"
                    ),
                    output_type=Output.DICT,
                )
            except TesseractNotFoundError:
                raise
            except TesseractError as error:
                errors.append(str(error))
                continue

            text, confidences = _text_from_ocr_data(data)
            if not text:
                continue
            confidence = sum(confidences) / len(confidences) if confidences else 0
            score = confidence + min(len(text), 800) / 100
            if score > best_score:
                best_score = score
                best_text = text

    if best_text:
        return best_text
    if errors:
        raise RuntimeError(f"Tesseract could not read this image: {errors[0]}")
    return ""


def _extract_pdf_text(pdf_path: str) -> str:
    if not PYMUPDF_AVAILABLE:
        raise RuntimeError("PDF support is unavailable; install PyMuPDF.")

    page_texts = []
    with pymupdf.open(pdf_path) as document:
        if document.needs_pass:
            raise ValueError("Password-protected PDFs are not supported.")
        if len(document) > MAX_PDF_PAGES:
            raise ValueError(f"PDFs are limited to {MAX_PDF_PAGES} pages.")

        for page in document:
            native_text = page.get_text("text", sort=True).strip()
            if native_text and extract_price(native_text) is not None:
                page_texts.append(native_text)
                continue

            bounds = page.rect
            page_area = max(1.0, bounds.width * bounds.height)
            scale = min(2.0, (MAX_PDF_RENDER_PIXELS / page_area) ** 0.5)
            pixmap = page.get_pixmap(
                matrix=pymupdf.Matrix(scale, scale),
                alpha=False,
            )
            page_image = Image.frombytes(
                "RGB",
                (pixmap.width, pixmap.height),
                pixmap.samples,
            )
            try:
                ocr_text = run_ocr_with_fallbacks(page_image)
            except Exception:
                if not native_text:
                    raise
                logger.warning(
                    "OCR failed for a scanned PDF page; preserving embedded text.",
                    exc_info=True,
                )
                page_texts.append(native_text)
                continue

            combined_text = "\n".join(
                value for value in (native_text, ocr_text) if value
            )
            if combined_text:
                page_texts.append(combined_text)

    return "\n".join(page_texts)


def extract_receipt_data(image_path: str) -> dict:
    """Extract amount, date, time, and source text from a receipt image."""
    if not PIL_AVAILABLE:
        return _empty_result("OCR unavailable: install Pillow to process receipt images.")

    try:
        with open(image_path, "rb") as file:
            is_pdf = b"%PDF-" in file.read(1024)
        if is_pdf:
            text = _extract_pdf_text(image_path)
        else:
            with Image.open(image_path) as source:
                image = ImageOps.exif_transpose(source).copy()
            text = run_ocr_with_fallbacks(image)
        if not text.strip():
            return _empty_result(
                "No readable text detected. The image was saved for manual review."
            )
        return {
            "ocr_price": extract_price(text),
            "ocr_date": extract_date(text),
            "ocr_time": extract_time(text),
            "ocr_raw_text": text,
        }
    except TesseractNotFoundError:
        logger.warning("Tesseract executable is unavailable; OCR is disabled.")
        return _empty_result(
            "OCR unavailable: install Tesseract and set TESSERACT_CMD if it is not on PATH."
        )
    except Exception as error:
        logger.exception("Receipt OCR failed for %s", image_path)
        return _empty_result(f"OCR failed: {error}")


def _parse_localized_amount(value: str) -> float | None:
    number = re.sub(r"[^\d.,]", "", value)
    if not number or not any(char.isdigit() for char in number):
        return None

    last_separator = max(number.rfind("."), number.rfind(","))
    if last_separator < 0:
        try:
            return float(number)
        except ValueError:
            return None

    integer_part = number[:last_separator]
    fractional_part = number[last_separator + 1:]
    if not fractional_part:
        return None

    separators = [index for index, char in enumerate(number) if char in ".,"]
    if len(separators) > 1:
        integer_digits = re.sub(r"[.,]", "", integer_part)
        normalized = f"{integer_digits}.{fractional_part}"
    elif len(fractional_part) == 3 and len(integer_part) <= 3:
        normalized = number.replace(".", "").replace(",", "")
    elif len(fractional_part) <= 2:
        normalized = f"{integer_part}.{fractional_part}"
    else:
        normalized = number.replace(".", "").replace(",", "")

    try:
        return float(normalized)
    except ValueError:
        return None


def _amounts_on_line(line: str) -> list[tuple[str, float]]:
    candidates = []
    for match in _AMOUNT_PATTERN.finditer(line):
        raw_amount = match.group(0)
        amount = _parse_localized_amount(raw_amount)
        if amount is not None and 0 < amount < 1_000_000_000:
            candidates.append((raw_amount, amount))
    return candidates


def _total_priority(line: str) -> int:
    folded = _fold_text(line)
    if _SUBTOTAL_PATTERN.search(folded) or _DISCOUNT_TOTAL_PATTERN.search(folded):
        return 0
    for priority, pattern in _TOTAL_PATTERNS:
        if pattern.search(folded):
            return priority
    return 0


def extract_price(text: str) -> float | None:
    """Find the receipt total and parse Turkish or western number separators."""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    labeled_candidates = []
    currency_candidates = []
    fallback_candidates = []

    for index, line in enumerate(lines):
        folded = _fold_text(line)
        if _SUBTOTAL_PATTERN.search(folded) or _DISCOUNT_TOTAL_PATTERN.search(folded):
            continue

        priority = _total_priority(line)
        amounts = _amounts_on_line(line)
        nearby_line = lines[index + 1] if index + 1 < len(lines) else ""
        nearby_folded = _fold_text(nearby_line)
        if (
            _SUBTOTAL_PATTERN.search(nearby_folded)
            or _DISCOUNT_TOTAL_PATTERN.search(nearby_folded)
        ):
            nearby_line = ""
        if not amounts and priority:
            amounts = _amounts_on_line(nearby_line)
        if not amounts:
            continue

        raw_amount, amount = amounts[-1]
        position = index / max(1, len(lines) - 1)
        has_currency = bool(
            _CURRENCY_PATTERN.search(line) or _CURRENCY_PATTERN.search(nearby_line)
        )
        candidate = (priority, has_currency, position, amount)
        if priority:
            labeled_candidates.append(candidate)
        elif has_currency:
            currency_candidates.append(candidate)
        elif not _DATE_NUMERIC.search(line) and not _TIME_PATTERN.search(line):
            fallback_candidates.append((position, amount, raw_amount))

    if labeled_candidates:
        return max(
            labeled_candidates,
            key=lambda candidate: (
                candidate[0],
                candidate[1],
                candidate[2],
            ),
        )[3]
    if currency_candidates:
        return max(currency_candidates, key=lambda candidate: candidate[2])[3]
    if fallback_candidates:
        lower_half = [
            candidate for candidate in fallback_candidates if candidate[0] >= 0.5
        ]
        candidates = lower_half or fallback_candidates
        return max(candidates, key=lambda candidate: candidate[1])[1]
    return None


def _make_iso_date(year: int, month: int, day: int) -> str | None:
    if year < 100:
        year += 2000 if year < 70 else 1900
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def extract_date(text: str) -> str | None:
    """Extract a date and return it in unambiguous ISO-8601 form."""
    iso_match = re.search(
        r"(?<!\d)(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?!\d)", text
    )
    if iso_match:
        year, month, day = map(int, iso_match.groups())
        parsed = _make_iso_date(year, month, day)
        if parsed:
            return parsed

    numeric_match = re.search(
        r"(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?!\d)", text
    )
    if numeric_match:
        first, second, year = map(int, numeric_match.groups())
        if first <= 12 < second:
            month, day = first, second
        else:
            day, month = first, second
        parsed = _make_iso_date(year, month, day)
        if parsed:
            return parsed

    folded = _fold_text(text)
    for match in re.finditer(r"\b(\d{1,2})\s+([a-z]+)\s+(\d{2,4})\b", folded):
        day, month_name, year = match.groups()
        month = _MONTHS.get(month_name)
        if month:
            parsed = _make_iso_date(int(year), month, int(day))
            if parsed:
                return parsed

    for match in re.finditer(
        r"\b([a-z]+)\s+(\d{1,2}),?\s+(\d{2,4})\b", folded
    ):
        month_name, day, year = match.groups()
        month = _MONTHS.get(month_name)
        if month:
            parsed = _make_iso_date(int(year), month, int(day))
            if parsed:
                return parsed
    return None


def extract_time(text: str) -> str | None:
    """Extract and normalize 24-hour or AM/PM receipt times."""
    match = _TIME_PATTERN.search(text)
    if not match:
        return None

    hour, minute, second, meridiem = match.groups()
    hour = int(hour)
    if meridiem:
        if not 1 <= hour <= 12:
            return None
        hour = hour % 12 + (12 if meridiem.casefold() == "pm" else 0)
    result = f"{hour:02d}:{minute}"
    if second:
        result += f":{second}"
    return result
