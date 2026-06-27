import { useCallback, useEffect, useRef } from "react";
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
  const pendingJsonRef = useRef<object | null>(null);

  const flushPending = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (pendingJsonRef.current) {
      onChange(pendingJsonRef.current);
      pendingJsonRef.current = null;
    }
  }, [onChange]);

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
      const nextJson = editor.getJSON();
      pendingJsonRef.current = nextJson;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange(nextJson);
        pendingJsonRef.current = null;
        debounceRef.current = null;
      }, 300);
    },
  });

  useEffect(() => {
    if (!editor) return;
    flushPending();
    editor.commands.setContent(initialContent ?? EMPTY_TIPTAP_DOC, { emitUpdate: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  useEffect(() => () => flushPending(), [flushPending]);

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
