import io
import os
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image
from pytesseract.pytesseract import TesseractNotFoundError
import pymupdf

import ocr_utils


class ReceiptParsingTests(unittest.TestCase):
    def create_pdf(self, path, page_texts):
        document = pymupdf.open()
        for text in page_texts:
            page = document.new_page()
            if text:
                page.insert_text((72, 72), text)
        document.save(path)
        document.close()

    def test_extracts_turkish_total_with_decimal_comma(self):
        text = "URUN 1.250,00 TL\nKDV 250,00 TL\nGENEL TOPLAM 1.500,00 TL"

        self.assertEqual(ocr_utils.extract_price(text), 1500.0)

    def test_prefers_total_over_subtotal(self):
        text = "ARA TOPLAM 4.500,00 TL\nKDV 900,00 TL\nTOPLAM 5.400,00 TL"

        self.assertEqual(ocr_utils.extract_price(text), 5400.0)

    def test_ignores_discount_total_when_extracting_receipt_total(self):
        text = (
            "ARA TOPLAM 4.560,00 TL\n"
            "TOPLAM INDIRIM 456,00 TL\n"
            "TOPLAM\n4.104,00 TL"
        )

        self.assertEqual(ocr_utils.extract_price(text), 4104.0)

    def test_extracts_western_grouping_and_decimal(self):
        self.assertEqual(
            ocr_utils.extract_price("Grand Total: $1,234.56"),
            1234.56,
        )

    def test_extracts_turkish_numeric_and_month_dates(self):
        self.assertEqual(ocr_utils.extract_date("Tarih: 13.11.2026"), "2026-11-13")
        self.assertEqual(ocr_utils.extract_date("13 Kasım 2026"), "2026-11-13")

    def test_normalizes_time_without_reading_date_as_time(self):
        text = "Tarih 13.11.2026\nSaat 2:30 PM"

        self.assertEqual(ocr_utils.extract_time(text), "14:30")

    def test_uses_english_if_turkish_traineddata_is_missing(self):
        with patch.dict(os.environ, {"OCR_LANGUAGES": "eng+tur"}):
            with patch("ocr_utils.pytesseract.get_languages", return_value=["eng"]):
                self.assertEqual(ocr_utils._resolve_ocr_languages(), "eng")

    def test_missing_tesseract_is_reported_in_ocr_result(self):
        with tempfile.TemporaryDirectory() as directory:
            image_path = os.path.join(directory, "receipt.png")
            Image.new("RGB", (20, 20), "white").save(image_path)
            with patch(
                "ocr_utils.pytesseract.get_languages",
                side_effect=TesseractNotFoundError,
            ):
                result = ocr_utils.extract_receipt_data(image_path)

        self.assertIsNone(result["ocr_price"])
        self.assertIn("OCR unavailable", result["ocr_raw_text"])

    def test_extracts_data_from_searchable_pdf_without_running_ocr(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf_path = os.path.join(directory, "receipt.pdf")
            self.create_pdf(
                pdf_path,
                ["GENEL TOPLAM 1.234,56 TL\nTarih: 13.11.2026"],
            )
            with patch("ocr_utils.run_ocr_with_fallbacks") as run_ocr:
                result = ocr_utils.extract_receipt_data(pdf_path)

        self.assertEqual(result["ocr_price"], 1234.56)
        self.assertEqual(result["ocr_date"], "2026-11-13")
        run_ocr.assert_not_called()

    def test_ocr_processes_scanned_pdf_pages(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf_path = os.path.join(directory, "scanned.pdf")
            self.create_pdf(pdf_path, [""])
            with patch(
                "ocr_utils.run_ocr_with_fallbacks",
                return_value="TOPLAM 250,00 TL",
            ) as run_ocr:
                result = ocr_utils.extract_receipt_data(pdf_path)

        self.assertEqual(result["ocr_price"], 250.0)
        run_ocr.assert_called_once()

    def test_rejects_pdfs_over_page_limit(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf_path = os.path.join(directory, "too-many-pages.pdf")
            self.create_pdf(pdf_path, [""] * (ocr_utils.MAX_PDF_PAGES + 1))
            with open(pdf_path, "rb") as pdf_file:
                pdf_bytes = pdf_file.read()

        with self.assertRaisesRegex(ValueError, "limited to 5 pages"):
            ocr_utils.validate_pdf_bytes(pdf_bytes)

    def test_renders_pdf_first_page_as_png_preview(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf_path = os.path.join(directory, "preview.pdf")
            self.create_pdf(pdf_path, ["Receipt image preview"])
            with open(pdf_path, "rb") as pdf_file:
                preview = ocr_utils.render_pdf_preview(pdf_file.read())

        with Image.open(io.BytesIO(preview)) as rendered_image:
            self.assertEqual(rendered_image.format, "PNG")
            self.assertGreater(rendered_image.width, 0)
            self.assertGreater(rendered_image.height, 0)


if __name__ == "__main__":
    unittest.main()
