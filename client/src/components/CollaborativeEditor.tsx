import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { useLiveblocksExtension, useIsEditorReady } from "@liveblocks/react-tiptap";

interface CollaborativeEditorProps {
  field: string;
  initialContent: string;
  onSave: (html: string) => void;
  onSavedStateChange?: (saved: boolean) => void;
  placeholder?: string;
  className?: string;
}

export default function CollaborativeEditor({
  field,
  initialContent,
  onSave,
  onSavedStateChange,
  placeholder,
  className = "",
}: CollaborativeEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onSavedStateChangeRef = useRef(onSavedStateChange);
  onSavedStateChangeRef.current = onSavedStateChange;
  const initialContentRef = useRef(initialContent);
  const seededRef = useRef(false);

  const liveblocks = useLiveblocksExtension({ field });

  const save = useCallback((html: string) => {
    const normalized = html === "<p></p>" ? "" : html;
    onSaveRef.current(normalized);
    onSavedStateChangeRef.current?.(true);
  }, []);

  const editor = useEditor({
    extensions: [
      liveblocks,
      StarterKit.configure({
        undoRedo: false, // Liveblocks handles undo/redo via Yjs
        link: { autolink: true, openOnClick: false },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "Start writing..." }),
      Typography,
    ],
    editable: true,
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

  const isReady = useIsEditorReady();

  // Seed Yjs document from SQLite content when field is empty on first sync
  useEffect(() => {
    if (!editor || !isReady || seededRef.current) return;
    seededRef.current = true;

    const currentHtml = editor.getHTML();
    const isEmpty = !currentHtml || currentHtml === "<p></p>";
    if (isEmpty && initialContentRef.current) {
      editor.commands.setContent(initialContentRef.current, false);
    }
  }, [editor, isReady]);

  // Sync external content changes (e.g. after AI reprocess) when editor is not focused
  useEffect(() => {
    if (!editor || editor.isFocused || !isReady) return;
    const current = editor.getHTML();
    if (current !== initialContent && initialContent !== initialContentRef.current) {
      initialContentRef.current = initialContent;
      editor.commands.setContent(initialContent, false);
    }
  }, [editor, initialContent, isReady]);

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
