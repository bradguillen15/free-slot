import { Bold, Italic, Heading1, Heading2, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Editor } from "@tiptap/react";

type Props = {
  editor: Editor;
};

type ToolbarBtn = {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  isActive: boolean;
};

export function NoteToolbar({ editor }: Props) {
  const buttons: ToolbarBtn[] = [
    {
      label: "Bold",
      icon: <Bold className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
    },
    {
      label: "Italic",
      icon: <Italic className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
    },
    {
      label: "Heading 1",
      icon: <Heading1 className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
    },
    {
      label: "Heading 2",
      icon: <Heading2 className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
    },
    {
      label: "Bullet list",
      icon: <List className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
    },
    {
      label: "Numbered list",
      icon: <ListOrdered className="h-3.5 w-3.5" />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
    },
  ];

  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          aria-label={btn.label}
          onClick={btn.action}
          className={cn(
            "h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
            btn.isActive && "bg-muted text-foreground"
          )}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
