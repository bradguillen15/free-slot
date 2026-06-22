import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { NoteToolbar } from "./NoteToolbar";

type Props = {
  date: string;
  initialContent: object | null;
  onChange: (json: object) => void;
};

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function DailyNoteEditor({ date, initialContent, onChange }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent ?? EMPTY_DOC,
    editable: true,
    onUpdate({ editor }) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(editor.getJSON());
      }, 300);
    },
  });

  // Re-initialise content when the date prop changes (navigating between days).
  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(initialContent ?? EMPTY_DOC, { emitUpdate: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div data-testid="daily-note-editor" className="rounded-md border border-border bg-surface focus-within:border-primary/60 transition-colors">
      {editor && <NoteToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 text-foreground focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[120px]"
      />
    </div>
  );
}
