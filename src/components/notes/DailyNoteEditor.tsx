import { RichTextEditor } from "./RichTextEditor";

type Props = {
  date: string;
  initialContent: object | null;
  onChange: (json: object) => void;
};

export function DailyNoteEditor({ date, initialContent, onChange }: Props) {
  return (
    <RichTextEditor
      testId="daily-note-editor"
      contentKey={date}
      initialContent={initialContent}
      onChange={onChange}
    />
  );
}
