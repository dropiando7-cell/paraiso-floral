const fs = require('fs');
const path = require('path');

const files = [
  'src/app/(dashboard)/facturas/DocumentBuilderClient.tsx',
  'src/components/facturas/templates/ClassicTemplate.tsx',
  'src/components/facturas/templates/LegacyTemplate.tsx',
  'src/components/facturas/templates/MinimalistTemplate.tsx',
  'src/components/facturas/templates/ModernTemplate.tsx'
];

const basePath = path.join(__dirname);
const newGridClass = 'grid-cols-[20fr_30fr_9fr_20fr_9fr_12fr_20fr]';

files.forEach(file => {
  const fullPath = path.join(basePath, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace grid-cols-12 with the new grid template
    content = content.replace(/grid-cols-12/g, newGridClass);
    
    // Remove col-span-X classes since we're using explicit column tracks
    // Wait, if we just remove col-span-X, we need to be careful not to remove it from other things
    // Let's specifically target the col-span classes in the table header and rows
    
    // Let's replace 'col-span-1 ' with ''
    // But wait, what if it's at the end of the string or before a quote?
    // Let's use regex that matches col-span-\d+ and a trailing space or leading space
    
    // Wait, if we use a regex, we might hit other grids.
    // In DocumentBuilderClient.tsx, are there other grids?
    // "grid-cols-12" only exists for the invoice table.
    // Are there other col-span classes?
    // SoporteDetailClient uses col-span-8, col-span-4.
    // In facturas templates, it's just the table.
    
    // Let's just strip col-span-1, col-span-2, col-span-3 from the content of these files entirely,
    // assuming they are only used for this table grid.
    content = content.replace(/col-span-\d+\s?/g, '');
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
