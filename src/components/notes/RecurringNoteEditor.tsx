import { useTranslation } from "react-i18next";
import { RichTextEditor } from "./RichTextEditor";

type Props = {
  date: string;
  initialContent: object | null;
  carriedFrom?: string | null;
  onChange: (json: object) => void;
};

export function RecurringNoteEditor({ date, initialContent, carriedFrom, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <RichTextEditor
      contentKey={date}
      initialContent={initialContent}
      onChange={onChange}
      header={
        carriedFrom ? (
          <p className="text-[10px] text-muted-foreground/60 px-3 pt-2">
            {t("notes.carriedFrom", { date: carriedFrom })}
          </p>
        ) : undefined
      }
    />
  );
}
