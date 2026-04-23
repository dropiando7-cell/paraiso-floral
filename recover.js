const fs = require('fs');
const log = fs.readFileSync('overview.txt', 'utf8');
const lines = log.split('\n');
const tools = [];
for (const line of lines) {
  try {
    const parsed = JSON.parse(line);
    if (parsed.tool_calls) {
      tools.push(...parsed.tool_calls);
    }
  } catch (e) {}
}
const replaces = tools.filter(t => t.name === 'multi_replace_file_content' || t.name === 'replace_file_content');
fs.writeFileSync('replaces.json', JSON.stringify(replaces, null, 2));
