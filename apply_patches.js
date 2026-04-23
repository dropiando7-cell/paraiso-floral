const fs = require('fs');
const path = require('path');

const replaces = JSON.parse(fs.readFileSync('replaces.json', 'utf8'));

for (const patch of replaces) {
  let targetFile = patch.args.TargetFile;
  if (targetFile.startsWith('"') && targetFile.endsWith('"')) {
    targetFile = targetFile.slice(1, -1);
  }
  
  if (!fs.existsSync(targetFile)) {
    console.log(`Skipping missing file: ${targetFile}`);
    continue;
  }
  
  let content = fs.readFileSync(targetFile, 'utf8');
  const chunks = typeof patch.args.ReplacementChunks === 'string' ? JSON.parse(patch.args.ReplacementChunks) : patch.args.ReplacementChunks;
  
  chunks.sort((a, b) => b.StartLine - a.StartLine);
  const lines = content.split('\n');
  
  for (const chunk of chunks) {
    const start = chunk.StartLine - 1;
    const end = chunk.EndLine - 1;
    const replacementLines = chunk.ReplacementContent.split('\n');
    lines.splice(start, end - start + 1, ...replacementLines);
  }
  
  fs.writeFileSync(targetFile, lines.join('\n'));
  console.log(`Applied patch: ${patch.args.Instruction} to ${path.basename(targetFile)}`);
}
console.log('All patches applied successfully!');
