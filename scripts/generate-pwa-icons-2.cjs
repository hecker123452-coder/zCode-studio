// Generate maskable + remaining icons (simpler approach)
const sharp = require('sharp');
const fs = require('fs');

async function generate() {
  // Read the SVG file as buffer
  const svgBuf = fs.readFileSync('public/logo.svg');

  // Simple maskable: just add background color
  const maskableSvg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="#1e1e1e" rx="100"/>
    <g transform="translate(128, 128) scale(8.5)">
      <path d="M24.51,28.51H5.49c-2.21,0-4-1.79-4-4V5.49c0-2.21,1.79-4,4-4h19.03c2.21,0,4,1.79,4,4v19.03 C28.51,26.72,26.72,28.51,24.51,28.51z" fill="#2D2D2D" stroke="#FFFFFF" stroke-width="0.6317"/>
      <path d="M15.47,7.1l-1.3,1.85c-0.2,0.29-0.54,0.47-0.9,0.47h-7.1V7.09C6.16,7.1,15.47,7.1,15.47,7.1z" fill="#FFFFFF"/>
      <polygon points="24.3,7.1 13.14,22.91 5.7,22.91 16.86,7.1" fill="#FFFFFF"/>
      <path d="M14.53,22.91l1.31-1.86c0.2-0.29,0.54-0.47,0.9-0.47h7.09v2.33H14.53z" fill="#FFFFFF"/>
    </g>
  </svg>`;

  // Maskable 512
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile('public/maskable-512.png');
  console.log('✓ maskable-512.png');

  // Maskable 192
  await sharp(Buffer.from(maskableSvg))
    .resize(192, 192)
    .png()
    .toFile('public/maskable-192.png');
  console.log('✓ maskable-192.png');

  // Apple touch icon
  await sharp(svgBuf)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('✓ apple-touch-icon.png');

  // Favicon
  await sharp(svgBuf)
    .resize(32, 32)
    .png()
    .toFile('public/favicon-32.png');
  console.log('✓ favicon-32.png');

  console.log('\n✅ All icons generated!');
}

generate().catch(console.error);
