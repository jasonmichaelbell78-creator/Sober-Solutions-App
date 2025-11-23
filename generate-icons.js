// Simple icon generator for PWA
// This creates SVG icons with the app's branding

const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const primaryColor = '#5D8C5A';
const creamColor = '#F5F5DC';

sizes.forEach(size => {
  const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="${primaryColor}" rx="${size * 0.2}"/>

  <!-- Steps Icon (simplified) -->
  <g fill="${creamColor}">
    <rect x="${size * 0.2}" y="${size * 0.6}" width="${size * 0.25}" height="${size * 0.08}" rx="${size * 0.02}"/>
    <rect x="${size * 0.35}" y="${size * 0.45}" width="${size * 0.25}" height="${size * 0.08}" rx="${size * 0.02}"/>
    <rect x="${size * 0.5}" y="${size * 0.3}" width="${size * 0.25}" height="${size * 0.08}" rx="${size * 0.02}"/>
  </g>

  <!-- Text "SS" -->
  <text x="${size * 0.5}" y="${size * 0.75}" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="${creamColor}" text-anchor="middle">SS</text>
</svg>`.trim();

  const outputPath = path.join(__dirname, 'public', `icon-${size}.svg`);
  fs.writeFileSync(outputPath, svg);
  console.log(`Created ${outputPath}`);
});

console.log('\nSVG icons created successfully!');
console.log('Note: For production, convert these SVG files to PNG using an online tool or image library.');
