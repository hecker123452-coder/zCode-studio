// Generate PWA icons from SVG using sharp
const sharp = require('sharp');
const fs = require('fs');

const svg = fs.readFileSync('public/logo.svg');

async function generate() {
  // 512x512 — required by PWABuilder
  await sharp(svg)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512.png');
  console.log('✓ icon-512.png');

  // 192x192 — required by manifest
  await sharp(svg)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192.png');
  console.log('✓ icon-192.png');

  // 256x256
  await sharp(svg)
    .resize(256, 256)
    .png()
    .toFile('public/icon-256.png');
  console.log('✓ icon-256.png');

  // Maskable icons (with padding for safe zone)
  const maskableSvg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="#1e1e1e"/>
    <g transform="translate(96, 96) scale(10.67)">
      ${svg.match(/<g>[\s\S]*<\/g>/)?.[0] || ''}
    </g>
  </svg>`;
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile('public/maskable-512.png');
  console.log('✓ maskable-512.png');

  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png()
    .toFile('public/maskable-192.png');
  console.log('✓ maskable-192.png');

  // Apple touch icon
  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('✓ apple-touch-icon.png');

  // Favicon
  await sharp(svg)
    .resize(32, 32)
    .png()
    .toFile('public/favicon-32.png');
  console.log('✓ favicon-32.png');

  console.log('\n✅ All PWA icons generated!');
}

generate().catch(console.error);
