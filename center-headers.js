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

    // For Classic and Legacy
    // Replace "flex items-center py-2" with "flex items-center justify-center text-center py-2"
    content = content.replace(/>Código<\/div>/g, '>Código</div>');
    content = content.replace(/className={`flex items-center py-2/g, 'className={`flex items-center justify-center text-center py-2');
    
    // Replace justify-end text-right with justify-center text-center
    // But ONLY inside the header grid! We can target the lines with >Precio</div> etc.
    content = content.replace(/justify-end text-right(.*?)>Precio<\/div>/g, 'justify-center text-center$1>Precio</div>');
    content = content.replace(/justify-end text-right(.*?)>Desc\.<\/div>/g, 'justify-center text-center$1>Desc.</div>');
    content = content.replace(/justify-end text-right(.*?)>Monto<\/div>/g, 'justify-center text-center$1>Monto</div>');
    content = content.replace(/justify-end text-right(.*?)>P\. Unitario<\/div>/g, 'justify-center text-center$1>P. Unitario</div>');
    content = content.replace(/justify-end text-right(.*?)>Descuento<\/div>/g, 'justify-center text-center$1>Descuento</div>');
    content = content.replace(/justify-end text-right(.*?)>Subtotal<\/div>/g, 'justify-center text-center$1>Subtotal</div>');

    // Minimalist / Modern have simpler classes like:
    // <div className="text-right">Precio</div>
    content = content.replace(/className="text-right">Precio<\/div>/g, 'className="text-center">Precio</div>');
    content = content.replace(/className="text-right">Desc\.<\/div>/g, 'className="text-center">Desc.</div>');
    content = content.replace(/className="text-right">Monto<\/div>/g, 'className="text-center">Monto</div>');
    content = content.replace(/className="text-right">P\. Unitario<\/div>/g, 'className="text-center">P. Unitario</div>');
    content = content.replace(/className="text-right">Descuento<\/div>/g, 'className="text-center">Descuento</div>');
    content = content.replace(/className="text-right">Subtotal<\/div>/g, 'className="text-center">Subtotal</div>');

    // Center Codigo and Descripcion in Minimalist/Modern
    content = content.replace(/className="">Código<\/div>/g, 'className="text-center">Código</div>');
    content = content.replace(/className="">Descripción<\/div>/g, 'className="text-center">Descripción</div>');
    // If they have no class:
    content = content.replace(/<div>Código<\/div>/g, '<div className="text-center">Código</div>');
    content = content.replace(/<div>Descripción<\/div>/g, '<div className="text-center">Descripción</div>');
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  }
});
