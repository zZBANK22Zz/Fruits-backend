# Installing Noto Sans Thai Font

To properly display Thai characters in PDF invoices, you need to install the Noto Sans Thai font.

## Manual Installation

1. **Download the font:**
   - Visit: https://fonts.google.com/noto/specimen/Noto+Sans+Thai
   - Click "Download family" button
   - Extract the ZIP file
   - Find `NotoSansThai-Regular.ttf` in the extracted folder

2. **Place the font file:**
   - Copy `NotoSansThai-Regular.ttf` to this directory: `backend/fonts/`
   - The file should be at: `backend/fonts/NotoSansThai-Regular.ttf`

3. **Verify the file:**
   ```bash
   ls -lh backend/fonts/NotoSansThai-Regular.ttf
   ```
   The file should be approximately 290KB in size.

## Alternative: Using System Fonts

The PDF service will also check for Thai fonts in common system locations:
- **macOS**: System fonts (Thonburi) - but these are .ttc format and won't work
- **Linux**: `/usr/share/fonts/truetype/thai/NotoSansThai-Regular.ttf`
- **Windows**: `C:/Windows/Fonts/THSarabunNew.ttf`

## Troubleshooting

If you see "Unknown font format" errors:
- Ensure the file is a valid `.ttf` file (not `.ttc` or HTML)
- Check file size (should be ~290KB for Noto Sans Thai)
- Verify the file path is correct
- Restart the backend server after adding the font

