import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { MoveLines } from "../lib/tiptap-move-lines";

interface RichEditorProps {
  content: string;
  onSave: (html: string) => void;
  onSavedStateChange?: (saved: boolean) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

export default function RichEditor({
  content,
  onSave,
  onSavedStateChange,
  placeholder,
  editable = true,
  className = "",
}: RichEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onSavedStateChangeRef = useRef(onSavedStateChange);
  onSavedStateChangeRef.current = onSavedStateChange;

  const save = useCallback((html: string) => {
    const normalized = html === "<p></p>" ? "" : html;
    onSaveRef.current(normalized);
    onSavedStateChangeRef.current?.(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { autolink: true, openOnClick: false },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Start writing..." }),
      Typography,
      MoveLines,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onSavedStateChangeRef.current?.(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        save(editor.getHTML());
      }, 800);
    },
    onBlur: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      save(editor.getHTML());
    },
  });

  // Sync external content changes (e.g. after reprocess), but only when not focused
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = editor.getHTML();
    if (current !== content) {
      editor.commands.setContent(content, false);
      save(content);
    }
  }, [editor, content, save]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={`rich-editor-wrapper ${className}`}>
      <EditorContent editor={editor} />
    </div>
  );
}
