import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PickerCategory = {
  id: string;
  name: string;
  color: string;
  type: "productive" | "unproductive";
};

/**
 * Searchable label picker with on-the-fly creation. Replaces the old chip rows,
 * which stopped scaling once users could add their own labels.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  onCreate,
  allowNone = false,
}: {
  categories: PickerCategory[];
  value?: string;
  onChange: (id: string) => void;
  /** Create a label and return it (or null on failure). Caller persists + refreshes. */
  onCreate?: (name: string, type: "productive" | "unproductive") => Promise<PickerCategory | null>;
  /** Offer a "No label" option that calls onChange(""). */
  allowNone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const selected = categories.find((c) => c.id === value);

  // Dialog scroll-lock (react-remove-scroll) swallows trackpad wheel events on portaled
  // popovers unless we handle wheel locally on the list.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.stopPropagation();
      el.scrollTop += event.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  const trimmed = query.trim();
  const exactMatch = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());

  const create = async () => {
    if (!onCreate || !trimmed) return;
    const created = await onCreate(trimmed, "productive");
    if (created) {
      onChange(created.id);
      setQuery("");
      setOpen(false);
    }
  };

  const item = (c: PickerCategory) => (
    <CommandItem
      key={c.id}
      value={c.name}
      onSelect={() => {
        onChange(c.id);
        setOpen(false);
      }}
    >
      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
      <span className="truncate">{c.name}</span>
      <Check className={cn("ml-auto h-4 w-4", c.id === value ? "opacity-100" : "opacity-0")} />
    </CommandItem>
  );

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">Pick a label&hellip;</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[60] w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search or create&hellip;" value={query} onValueChange={setQuery} />
          <CommandList ref={listRef} className="overscroll-contain">
            <CommandEmpty>{onCreate ? "No label found — create it below." : "No label found."}</CommandEmpty>
            {allowNone && (
              <CommandGroup>
                <CommandItem value="__none" onSelect={() => { onChange(""); setOpen(false); }}>
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full shrink-0 border border-border" />
                  No label
                  <Check className={cn("ml-auto h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              </CommandGroup>
            )}
            {categories.length > 0 && (
              <CommandGroup>{categories.map(item)}</CommandGroup>
            )}
            {onCreate && trimmed && !exactMatch && (
              <CommandGroup heading="New label">
                <CommandItem value={`__create_${trimmed}`} onSelect={() => create()}>
                  <Plus className="mr-2 h-4 w-4" />
                  {`Create "${trimmed}"`}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
