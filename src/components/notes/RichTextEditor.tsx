import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "@/lib/utils";
import { NoteToolbar } from "./NoteToolbar";

export const EMPTY_TIPTAP_DOC = { type: "doc", content: [{ type: "paragraph" }] };

const PROSEMIRROR_CLASS =
  "tiptap text-sm outline-none text-foreground focus:outline-none";

type Props = {
  contentKey: string;
  initialContent: object | null;
  onChange: (json: object) => void;
  testId?: string;
  header?: React.ReactNode;
  minHeightClass?: string;
  className?: string;
};

export function RichTextEditor({
  contentKey,
  initialContent,
  onChange,
  testId,
  header,
  minHeightClass = "min-h-[120px]",
  className,
}: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent ?? EMPTY_TIPTAP_DOC,
    editable: true,
    editorProps: {
      attributes: {
        class: cn(PROSEMIRROR_CLASS, minHeightClass),
      },
    },
    onUpdate({ editor }) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(editor.getJSON());
      }, 300);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(initialContent ?? EMPTY_TIPTAP_DOC, { emitUpdate: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      data-testid={testId}
      className={cn(
        "rounded-md border border-border bg-surface focus-within:border-primary/60 transition-colors",
        className
      )}
    >
      {header}
      {editor && <NoteToolbar editor={editor} />}
      <EditorContent editor={editor} className="px-3 py-2 focus:outline-none" />
    </div>
  );
}
