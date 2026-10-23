const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// 1x1 transparent PNG
const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
// Minimal valid JPG
const jpgBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
// Minimal valid ICO
const icoBuffer = Buffer.from('AAABAAEAAQEAAAEAIAAwAAAAFgAAACgAAAABAAAAAgAAAAEAIAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', 'base64');

// Create the files
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuffer);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), pngBuffer);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), pngBuffer);
fs.writeFileSync(path.join(publicDir, 'og-image.jpg'), jpgBuffer);

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#2563eb"/><text x="50" y="70" font-family="Arial" font-size="60" fill="white" text-anchor="middle">E</text></svg>`;
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

const manifestContent = {
  "short_name": "ECRAS",
  "name": "ECRAS | Enterprise Recruitment System",
  "icons": [
    {
      "src": "/icon-192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "/icon-512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": "/",
  "background_color": "#ffffff",
  "display": "standalone",
  "theme_color": "#2563eb"
};
fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifestContent, null, 2));

console.log("Assets created successfully.");
