import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslation } from "react-i18next";
import { NoteToolbar } from "./NoteToolbar";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

type Props = {
  date: string;
  initialContent: object | null;
  carriedFrom?: string | null;
  onChange: (json: object) => void;
};

export function RecurringNoteEditor({ date, initialContent, carriedFrom, onChange }: Props) {
  const { t } = useTranslation();
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
    <div className="rounded-md border border-border bg-surface focus-within:border-primary/60 transition-colors">
      {carriedFrom && (
        <p className="text-[10px] text-muted-foreground/60 px-3 pt-2">
          {t("notes.carriedFrom", { date: carriedFrom })}
        </p>
      )}
      {editor && <NoteToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 text-foreground focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[120px]"
      />
    </div>
  );
}
