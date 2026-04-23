const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, 'src', 'app', '(dashboard)', 'facturas', 'DocumentBuilderClient.tsx');
let content = fs.readFileSync(clientPath, 'utf8');

// Replace the Actions block
const oldActions = `<div className="flex flex-col gap-0.5 items-center justify-center w-[24px] shrink-0 print:hidden py-2 print:py-1">
          {item.isSection ? (
            <button
              onClick={() => onToggleLongDesc(item.id)}
              title="Personalizar diseño"
              className={\`p-1.5 rounded-lg transition-all \${item.showLongDesc ? 'bg-indigo-100 text-indigo-600' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-indigo-400 hover:bg-indigo-50'}\`}
            >
              <Palette size={12} />
            </button>
          ) : (
            <button
              onClick={() => onToggleLongDesc(item.id)}
              title="Descripción técnica"
              className={\`p-1.5 rounded-lg transition-all \${item.showLongDesc ? 'bg-blue-100 text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-400 hover:bg-blue-50'}\`}
            >
              <Info size={12} />
            </button>
          )}
          <button
            onClick={() => onDuplicate(item.id)}
            title="Duplicar fila"
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-slate-300 hover:text-emerald-500 hover:bg-emerald-50"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            title="Eliminar fila"
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-slate-300 hover:text-red-400 hover:bg-red-50"
          >
            <Trash2 size={12} />
          </button>
        </div>`;

const newActions = `<div className="relative w-[24px] shrink-0 print:hidden flex items-center justify-center">
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-row gap-1 items-center justify-end opacity-0 group-hover:opacity-100 transition-all bg-white/95 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-slate-200 z-50">
          {item.isSection ? (
            <button
              onClick={() => onToggleLongDesc(item.id)}
              title="Personalizar diseño"
              className={\`p-1 rounded-md transition-all \${item.showLongDesc ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}\`}
            >
              <Palette size={13} />
            </button>
          ) : (
            <button
              onClick={() => onToggleLongDesc(item.id)}
              title="Descripción técnica"
              className={\`p-1 rounded-md transition-all \${item.showLongDesc ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}\`}
            >
              <Info size={13} />
            </button>
          )}
          <button
            onClick={() => onDuplicate(item.id)}
            title="Duplicar fila"
            className="p-1 rounded-md transition-all text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            title="Eliminar fila"
            className="p-1 rounded-md transition-all text-slate-400 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 size={13} />
          </button>
          </div>
        </div>`;

if (content.includes('flex flex-col gap-0.5 items-center justify-center w-[24px] shrink-0 print:hidden py-2 print:py-1')) {
  // Simple search and replace via string split since we have backticks inside template literal
  const startIdx = content.indexOf('<div className="flex flex-col gap-0.5 items-center justify-center w-[24px] shrink-0 print:hidden py-2 print:py-1">');
  const endStr = '</button>\n        </div>';
  const endIdx = content.indexOf(endStr, startIdx) + endStr.length;
  
  if (startIdx !== -1 && endIdx > startIdx) {
     content = content.substring(0, startIdx) + newActions + content.substring(endIdx);
     fs.writeFileSync(clientPath, content);
     console.log('Successfully updated actions layout to horizontal absolute floating bar.');
  } else {
     console.error('Could not find the exact bounds of the old actions block.');
  }
} else {
  console.error('Could not find the old actions block to replace.');
}
