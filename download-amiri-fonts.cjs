const fs = require('fs');
const https = require('https');
const path = require('path');

const fonts = [
  {
    name: 'Amiri-Bold.ttf',
    url: 'https://raw.githubusercontent.com/aliftype/amiri-font/master/Amiri-Bold.ttf',
  },
  {
    name: 'Amiri-Slanted.ttf',
    url: 'https://raw.githubusercontent.com/aliftype/amiri-font/master/Amiri-Slanted.ttf',
  },
  {
    name: 'Amiri-BoldSlanted.ttf',
    url: 'https://raw.githubusercontent.com/aliftype/amiri-font/master/Amiri-BoldSlanted.ttf',
  },
];

const fontsDir = path.join(__dirname, 'public', 'fonts');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
  console.log(`✅ Created directory: ${fontsDir}`);
}

fonts.forEach(({ name, url }) => {
  const dest = path.join(fontsDir, name);
  const file = fs.createWriteStream(dest);

  https.get(url, (response) => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      // Follow redirect
      https.get(response.headers.location, (redirectRes) => {
        redirectRes.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded after redirect: ${name}`);
        });
      });
    } else if (response.statusCode === 200) {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${name}`);
      });
    } else {
      console.error(`❌ Failed to download ${name}: ${response.statusCode}`);
    }
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    console.error(`❌ Error downloading ${name}: ${err.message}`);
  });
});
