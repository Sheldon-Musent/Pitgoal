const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'public/icons');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const svg = (size, maskable = false) => {
  const s = size / 512, cx = size / 2, cy = size / 2, p = size * 0.05;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:#00ff9f"/><stop offset="100%" style="stop-color:#00d4ff"/></linearGradient>
    <filter id="s"><feDropShadow dx="0" dy="0" stdDeviation="${4*s}" flood-color="#00ff9f" flood-opacity="0.4"/></filter></defs>
  <rect width="${size}" height="${size}" rx="${size*0.18}" fill="#060a12"/>
  <line x1="${p}" y1="${cy}" x2="${size-p}" y2="${cy}" stroke="#0d1a2a" stroke-width="${s}"/>
  <line x1="${cx}" y1="${p}" x2="${cx}" y2="${size-p}" stroke="#0d1a2a" stroke-width="${s}"/>
  <path d="M${p+20*s},${p+8*s} L${p+8*s},${p+8*s} L${p+8*s},${p+20*s}" fill="none" stroke="#00ff9f" stroke-width="${2.5*s}" stroke-opacity="0.3"/>
  <path d="M${size-p-20*s},${p+8*s} L${size-p-8*s},${p+8*s} L${size-p-8*s},${p+20*s}" fill="none" stroke="#00ff9f" stroke-width="${2.5*s}" stroke-opacity="0.3"/>
  <path d="M${p+8*s},${size-p-20*s} L${p+8*s},${size-p-8*s} L${p+20*s},${size-p-8*s}" fill="none" stroke="#00ff9f" stroke-width="${2.5*s}" stroke-opacity="0.3"/>
  <path d="M${size-p-8*s},${size-p-20*s} L${size-p-8*s},${size-p-8*s} L${size-p-20*s},${size-p-8*s}" fill="none" stroke="#00ff9f" stroke-width="${2.5*s}" stroke-opacity="0.3"/>
  <text x="${cx}" y="${cy+40*s}" font-family="Arial Black,Arial,sans-serif" font-size="${260*s}" font-weight="900" fill="url(#g)" filter="url(#s)" text-anchor="middle" dominant-baseline="middle">D</text>
  <circle cx="${cx+90*s}" cy="${cy-80*s}" r="${8*s}" fill="#00ff9f" opacity="0.8"/></svg>`);
};

async function run() {
  for (const size of [72,96,128,144,152,192,384,512]) {
    await sharp(svg(size)).png().toFile(path.join(OUT, `icon-${size}.png`));
    console.log('✓ icon-' + size + '.png');
  }
  for (const size of [192,512]) {
    await sharp(svg(size, true)).png().toFile(path.join(OUT, `icon-maskable-${size}.png`));
    console.log('✓ icon-maskable-' + size + '.png');
  }
  await sharp(svg(180)).png().toFile(path.join(OUT, 'apple-touch-icon.png'));
  await sharp(svg(32)).png().toFile(path.join(OUT, 'favicon-32.png'));
  await sharp(svg(16)).png().toFile(path.join(OUT, 'favicon-16.png'));
  console.log('✅ All icons generated');
}
run();
