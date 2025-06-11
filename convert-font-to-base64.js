import fs from 'fs/promises';

async function convertFontToBase64() {
  try {
    const fontPath = './fonts/Amiri-Regular.ttf'; // Make sure the path is correct
    const fontBuffer = await fs.readFile(fontPath);
    const base64 = fontBuffer.toString('base64');
    console.log(base64); // <- This prints the base64 to console
  } catch (err) {
    console.error('❌ Error reading font file:', err.message);
  }
}

convertFontToBase64();
