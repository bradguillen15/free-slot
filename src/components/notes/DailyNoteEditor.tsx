import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Props = {
  date: string;
  initialContent: object | null;
  onChange: (json: object) => void;
};

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function isDocEmpty(json: object): boolean {
  const doc = json as { content?: { content?: unknown[] }[] };
  const blocks = doc.content ?? [];
  return blocks.length === 0 || blocks.every((b) => !b.content || b.content.length === 0);
}

export function DailyNoteEditor({ date, initialContent, onChange }: Props) {
  const [expanded, setExpanded] = useState(!!initialContent && !isDocEmpty(initialContent ?? {}));
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
    const next = initialContent ?? EMPTY_DOC;
    editor.commands.setContent(next, { emitUpdate: false });
    setExpanded(!!initialContent && !isDocEmpty(initialContent));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!expanded) {
    return (
      <button
        type="button"
        aria-label="Add a note for this day"
        onClick={() => setExpanded(true)}
        className="w-full text-left text-sm text-muted-foreground px-3 py-2 rounded-md border border-dashed border-border hover:border-primary/40 hover:text-foreground transition-colors"
      >
        Add a note for today…
      </button>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface focus-within:border-primary/60 transition-colors">
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 text-foreground focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[80px]"
      />
    </div>
  );
}
