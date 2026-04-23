const fs = require('fs');
const path = require('path');

const files = [
  'src/components/facturas/templates/ClassicTemplate.tsx',
  'src/components/facturas/templates/LegacyTemplate.tsx',
  'src/components/facturas/templates/MinimalistTemplate.tsx',
  'src/components/facturas/templates/ModernTemplate.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Remove the tracking-widest class from the header grid
    content = content.replace(/tracking-widest /g, '');
    content = content.replace(/ tracking-widest/g, '');

    // Remove the conditional pr-2 and px-1 paddings from the header columns
    // We target the literal strings exactly as they appear in the templates.
    content = content.replace(/\$\{settings\?\.showTableVerticalBorders \? 'pr-2' : ''\}/g, '');
    content = content.replace(/\$\{settings\?\.showTableVerticalBorders \? 'px-1' : ''\}/g, '');
    
    // After removing them, there might be double spaces in the className
    content = content.replace(/  +/g, ' ');

    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  }
});
