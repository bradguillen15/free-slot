import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle } from "lucide-react";
import { useInboxItems, useAddInboxItem, useArchiveInboxItem } from "@/lib/dataStore";
import type { LocalInboxItem } from "@/lib/localStore";

type Props = {
  className?: string;
};

export function InboxPanel({ className }: Props) {
  const { t } = useTranslation();
  const { data: items = [] } = useInboxItems();
  const addItem = useAddInboxItem();
  const archiveItem = useArchiveInboxItem();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    addItem.mutate(trimmed);
    setDraft("");
  }

  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t("notes.inbox")}</p>

      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("notes.inboxPlaceholder")}
        aria-label={t("notes.newInboxItem")}
        className="w-full text-sm bg-transparent border border-border rounded-md px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors mb-2"
      />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{t("notes.inboxEmpty")}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item: LocalInboxItem) => (
            <li key={item.id} className="flex items-start gap-2 group">
              <button
                type="button"
                aria-label={t("notes.archiveItem", { content: item.content })}
                onClick={() => archiveItem.mutate(item.id)}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
              >
                <Circle className="h-4 w-4 group-hover:hidden" />
                <CheckCircle2 className="h-4 w-4 hidden group-hover:block text-primary" />
              </button>
              <span className="text-sm text-foreground leading-snug">{item.content}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
