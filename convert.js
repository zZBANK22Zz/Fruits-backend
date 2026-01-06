const fs = require('fs');
const path = require('path');

// Configuration
const TARGET_FONT_NAME = 'NotoSansThai-Regular.ttf';
const OUTPUT_FILE = path.join(__dirname, 'app/services/thaiFont.js');

// Helper function to recursively search for the file
function findFile(dir, fileName) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            // Skip node_modules and hidden folders to save time
            if (stat.isDirectory()) {
                if (file !== 'node_modules' && !file.startsWith('.')) {
                    const found = findFile(fullPath, fileName);
                    if (found) return found;
                }
            } else if (file === fileName) {
                return fullPath;
            }
        }
    } catch (e) {
        // Ignore access errors
    }
    return null;
}

console.log(`🔍 Searching for "${TARGET_FONT_NAME}" in your project...`);
const fontPath = findFile(__dirname, TARGET_FONT_NAME);

if (!fontPath) {
    console.error(`❌ Error: Could not find "${TARGET_FONT_NAME}" anywhere in this folder.`);
    console.error('👉 Tip: Please ensure you have downloaded the font and placed it SOMEWHERE in the backend folder.');
    process.exit(1);
}

console.log(`✅ Found font at: ${fontPath}`);

// Convert to Base64
try {
    const fontBuffer = fs.readFileSync(fontPath);
    const base64String = fontBuffer.toString('base64');
    
    // Create the JS module
    const fileContent = `module.exports = "${base64String}";`;
    
    // Ensure directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, fileContent);
    
    console.log('---------------------------------------------------');
    console.log('🎉 SUCCESS! Font converted to code.');
    console.log(`📄 Created file: ${OUTPUT_FILE}`);
    console.log('---------------------------------------------------');
    console.log('👉 Next Step: Ensure your pdfService.js is using the Base64 code (Step 2 from previous answer).');

} catch (err) {
    console.error('Error converting file:', err);
}