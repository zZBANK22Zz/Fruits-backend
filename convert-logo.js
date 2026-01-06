const fs = require('fs');
const path = require('path');

// 1. Search for the logo file automatically
function findFile(dir, fileName) {
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && file !== 'node_modules' && !file.startsWith('.')) {
                const found = findFile(fullPath, fileName);
                if (found) return found;
            } else if (file === fileName) {
                return fullPath;
            }
        }
    } catch (e) {}
    return null;
}

console.log('🔍 Searching for Logo.png...');
const logoPath = findFile(__dirname, 'Logo.png');

if (!logoPath) {
    console.error('❌ Error: Could not find Logo.png anywhere.');
    process.exit(1);
}

// 2. Convert to Base64
const imgBuffer = fs.readFileSync(logoPath);
const base64String = imgBuffer.toString('base64');
const fileContent = `module.exports = "${base64String}";`;

// 3. Save as a JS module
const outputPath = path.join(__dirname, 'app/services/shopLogo.js');
fs.writeFileSync(outputPath, fileContent);

console.log('✅ Success! Created app/services/shopLogo.js');