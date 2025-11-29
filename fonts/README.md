# Thai Font for PDF Generation

This directory contains the Noto Sans Thai font file (`NotoSansThai-Regular.ttf`) which is automatically used by the PDF service to properly display Thai characters in invoices.

## Font File

- **NotoSansThai-Regular.ttf**: Downloaded automatically during setup
- This font supports Thai characters and is used for all PDF generation

## How It Works

The PDF service (`backend/app/services/pdfService.js`) will:
1. First check for `fonts/NotoSansThai-Regular.ttf` in this directory (preferred)
2. Fall back to system fonts if available:
   - Linux: `/usr/share/fonts/truetype/thai/NotoSansThai-Regular.ttf`
   - Windows: `C:/Windows/Fonts/THSarabunNew.ttf`
3. If no Thai font is found, use Helvetica (Thai characters will appear garbled)

## Note

PDFKit only supports `.ttf` (TrueType Font) files, not `.ttc` (TrueType Collection) files. The font file in this directory is a proper `.ttf` file that works with PDFKit.

