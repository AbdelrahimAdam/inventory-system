// generate-barcode.cjs
const bwipjs = require('bwip-js');
const fs = require('fs');
const path = require('path');

// Barcode text
const barcodeText = 'INV-20250525';

// Destination path
const outputPath = path.join(__dirname, 'public', 'barcode', `${barcodeText}.png`);

// Ensure directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

// Generate barcode image and save it
bwipjs.toBuffer({
  bcid:        'code128',       // Barcode type
  text:        barcodeText,     // Text to encode
  scale:       3,               // 3x scaling factor
  height:      10,              // Bar height, in mm
  includetext: true,            // Show human-readable text
  textxalign:  'center',        // Center text below barcode
}, (err, png) => {
  if (err) {
    console.error('❌ Error generating barcode:', err);
  } else {
    fs.writeFileSync(outputPath, png);
    console.log('✅ Barcode saved to:', outputPath);
  }
});
