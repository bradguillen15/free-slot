import { RichTextEditor } from "./RichTextEditor";

type Props = {
  date: string;
  initialContent: object | null;
  onChange: (json: object) => void;
};

export function DailyNoteCard({ date, initialContent, onChange }: Props) {
  return (
    <RichTextEditor
      testId="daily-note-editor"
      contentKey={date}
      initialContent={initialContent}
      onChange={onChange}
    />
  );
}
