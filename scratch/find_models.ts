import fs from 'fs';

const content = fs.readFileSync('d:/paraiso-floral/prisma/schema.prisma', 'utf-8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.trim().startsWith('model ')) {
    console.log(`Línea ${idx + 1}: ${line.trim()}`);
  }
});
