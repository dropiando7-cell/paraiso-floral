'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { useEffect, useRef } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Highlighter, Type
} from 'lucide-react';

interface Props {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

const FONT_SIZES = ['12px', '13px', '14px', '16px', '18px', '20px'];
const TEXT_COLORS = ['#000000', '#374151', '#dc2626', '#d97706', '#16a34a', '#2563eb', '#7c3aed'];
const HIGHLIGHT_COLORS = ['#fef9c3', '#dcfce7', '#dbeafe', '#f3e8ff', '#fce7f3'];

function ToolbarButton({ onClick, active, title, children }: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded-md transition-colors text-[11px] ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichDescriptionEditor({ content, onChange, readOnly = false, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: content || '',
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none outline-none min-h-[60px] px-2 py-1.5 text-xs text-slate-700',
      },
    },
  });

  // Sync content if changed externally
  const prevContent = useRef(content);
  useEffect(() => {
    if (editor && content !== prevContent.current && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', false as any);
    }
    prevContent.current = content;
  }, [content, editor]);

  if (readOnly) {
    return (
      <div
        className="prose prose-sm max-w-none text-xs text-slate-700 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-bold [&_em]:italic [&_u]:underline"
        dangerouslySetInnerHTML={{ __html: content || '' }}
      />
    );
  }

  if (!editor) return null;

  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-slate-50 border-b border-slate-200 flex-wrap">
        {/* Text formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita (Ctrl+B)">
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva (Ctrl+I)">
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Subrayado (Ctrl+U)">
          <UnderlineIcon size={13} />
        </ToolbarButton>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista de viñetas">
          <List size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
          <ListOrdered size={13} />
        </ToolbarButton>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Alinear izquierda">
          <AlignLeft size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrar">
          <AlignCenter size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Alinear derecha">
          <AlignRight size={13} />
        </ToolbarButton>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Text color */}
        <div className="relative group/color" title="Color de texto">
          <button type="button" className="flex items-center gap-1 p-1.5 rounded-md hover:bg-slate-100 transition-colors">
            <Type size={13} className="text-slate-500" />
            <div className="w-3 h-1 rounded-sm mt-0.5" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000' }} />
          </button>
          <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 hidden group-hover/color:flex gap-1 z-50">
            {TEXT_COLORS.map(c => (
              <button key={c} type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); }}
                className="w-5 h-5 rounded-full border border-slate-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
        </div>

        {/* Highlight */}
        <div className="relative group/hl" title="Resaltar texto">
          <button type="button" className="flex items-center gap-1 p-1.5 rounded-md hover:bg-slate-100 transition-colors">
            <Highlighter size={13} className="text-slate-500" />
          </button>
          <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 hidden group-hover/hl:flex gap-1 z-50">
            {HIGHLIGHT_COLORS.map(c => (
              <button key={c} type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHighlight({ color: c }).run(); }}
                className="w-5 h-5 rounded-full border border-slate-200 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }} title={c} />
            ))}
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); }}
              className="w-5 h-5 rounded-full border border-slate-300 bg-white hover:scale-110 transition-transform text-[9px] text-slate-400 flex items-center justify-center" title="Sin resaltar">✕</button>
          </div>
        </div>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />

      {/* Placeholder */}
      {editor.isEmpty && placeholder && (
        <div className="px-2 py-1.5 text-xs text-slate-300 pointer-events-none -mt-7 relative z-10">
          {placeholder}
        </div>
      )}
    </div>
  );
}
