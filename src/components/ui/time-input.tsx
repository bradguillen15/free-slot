import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fmtDisplayTime,
  from12HourParts,
  parseTimeInput,
  to12HourParts,
  type TimeFormat,
} from "@/lib/time";

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) => i * 5);
const ROW_HEIGHT = 36;

const pad = (n: number) => String(n).padStart(2, "0");

function minuteOptions(currentMinute: number): number[] {
  const set = new Set(MINUTE_STEPS);
  set.add(currentMinute);
  return [...set].sort((a, b) => a - b);
}

function fmtFieldTime(hhmm: string, format: TimeFormat): string {
  if (format === "24h") return fmtDisplayTime(hhmm, format);
  const parts = to12HourParts(hhmm);
  return `${parts.hour12}:${pad(parts.minute)} ${parts.period}`;
}

type Props = {
  value: string;
  onChange: (hhmm: string) => void;
  format: TimeFormat;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
  "aria-label"?: string;
};

export function TimeInput({
  value,
  onChange,
  format,
  disabled,
  className,
  "data-testid": dataTestId,
  "aria-label": ariaLabel = "Time",
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => fmtFieldTime(value, format));
  const typing = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedHourRef = useRef<HTMLButtonElement>(null);
  const selectedMinuteRef = useRef<HTMLButtonElement>(null);
  const hourScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minuteScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [h24, m] = value.split(":").map(Number);
  const minute = m || 0;
  const parts = to12HourParts(value);
  const minutes = minuteOptions(minute);

  useEffect(() => {
    if (!typing.current) setDraft(fmtFieldTime(value, format));
  }, [value, format]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      selectedHourRef.current?.scrollIntoView?.({ block: "center" });
      selectedMinuteRef.current?.scrollIntoView?.({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (hourScrollTimer.current) clearTimeout(hourScrollTimer.current);
      if (minuteScrollTimer.current) clearTimeout(minuteScrollTimer.current);
    };
  }, []);

  const commitDraft = () => {
    typing.current = false;
    const parsed = parseTimeInput(draft);
    if (parsed && parsed !== value) onChange(parsed);
    setDraft(fmtFieldTime(parsed ?? value, format));
  };

  const onFieldChange = (next: string) => {
    typing.current = true;
    setDraft(next);
  };

  const emit = (next: string) => {
    typing.current = false;
    setDraft(fmtFieldTime(next, format));
    if (next !== value) onChange(next);
  };

  const emit24 = (hour24: number, min: number) => emit(`${pad(hour24)}:${pad(min)}`);
  const emit12 = (hour12: number, min: number, period: "AM" | "PM") =>
    emit(from12HourParts(hour12, min, period));

  const commitScrolledHour = (scrollTop: number) => {
    if (hourScrollTimer.current) clearTimeout(hourScrollTimer.current);
    hourScrollTimer.current = setTimeout(() => {
      const hours = format === "24h" ? HOURS_24 : HOURS_12;
      const index = Math.min(Math.max(Math.round(scrollTop / ROW_HEIGHT), 0), hours.length - 1);
      const hour = hours[index];
      if (format === "24h") emit24(hour, minute);
      else emit12(hour, minute, parts.period);
    }, 120);
  };

  const commitScrolledMinute = (scrollTop: number) => {
    if (minuteScrollTimer.current) clearTimeout(minuteScrollTimer.current);
    minuteScrollTimer.current = setTimeout(() => {
      const index = Math.min(Math.max(Math.round(scrollTop / ROW_HEIGHT), 0), minutes.length - 1);
      const nextMinute = minutes[index];
      if (format === "24h") emit24(h24 || 0, nextMinute);
      else emit12(parts.hour12, nextMinute, parts.period);
    }, 120);
  };

  const wheelClass =
    "relative z-10 h-[180px] w-14 snap-y snap-mandatory overflow-y-auto [&::-webkit-scrollbar]:hidden";
  const wheelButtonClass =
    "flex h-9 w-full snap-center items-center justify-center rounded-md font-mono-num text-sm text-muted-foreground hover:bg-accent hover:text-foreground";
  const selectedButtonClass = "bg-primary font-medium text-primary-foreground hover:bg-primary";

  return (
    <div
      ref={rootRef}
      className={cn("relative", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          typing.current = false;
          setDraft(fmtFieldTime(value, format));
          setOpen(false);
        }
      }}
    >
      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <input
          type="text"
          inputMode={format === "24h" ? "numeric" : "text"}
          data-testid={dataTestId}
          value={draft}
          disabled={disabled}
          aria-label={ariaLabel}
          className="w-full flex-1 bg-transparent font-mono-num outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          onChange={(e) => onFieldChange(e.target.value)}
          onClick={() => !disabled && setOpen(true)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Open time picker"
          disabled={disabled}
          className="text-muted-foreground"
          onClick={() => !disabled && setOpen((o) => !o)}
        >
          <Clock className="h-4 w-4 opacity-50" />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute left-0 top-full z-50 mt-2 w-auto rounded-md border bg-popover p-3 text-popover-foreground shadow-md">
          <div className="relative flex gap-2">
            <div className="pointer-events-none absolute inset-x-0 top-[72px] z-0 h-9 rounded-md bg-accent/60" />
            <div
              role="listbox"
              aria-label="Hour wheel"
              className={wheelClass}
              onScroll={(e) => commitScrolledHour(e.currentTarget.scrollTop)}
            >
              <div className="h-[72px]" />
              {(format === "24h" ? HOURS_24 : HOURS_12).map((h) => {
                const selected = format === "24h" ? h === (h24 || 0) : h === parts.hour12;
                return (
                  <button
                    key={h}
                    ref={selected ? selectedHourRef : undefined}
                    type="button"
                    data-selected={selected}
                    aria-label={`Hour ${format === "24h" ? pad(h) : h}`}
                    className={cn(wheelButtonClass, selected && selectedButtonClass)}
                    onClick={() =>
                      format === "24h" ? emit24(h, minute) : emit12(h, minute, parts.period)
                    }
                  >
                    {format === "24h" ? pad(h) : h}
                  </button>
                );
              })}
              <div className="h-[72px]" />
            </div>
            <span className="z-10 self-center text-muted-foreground">:</span>
            <div
              role="listbox"
              aria-label="Minute wheel"
              className={wheelClass}
              onScroll={(e) => commitScrolledMinute(e.currentTarget.scrollTop)}
            >
              <div className="h-[72px]" />
              {minutes.map((min) => (
                <button
                  key={min}
                  ref={min === minute ? selectedMinuteRef : undefined}
                  type="button"
                  data-selected={min === minute}
                  aria-label={`Minute ${pad(min)}`}
                  className={cn(wheelButtonClass, min === minute && selectedButtonClass)}
                  onClick={() =>
                    format === "24h"
                      ? emit24(h24 || 0, min)
                      : emit12(parts.hour12, min, parts.period)
                  }
                >
                  {pad(min)}
                </button>
              ))}
              <div className="h-[72px]" />
            </div>
          </div>
          {format === "12h" && (
            <div className="mt-3 flex gap-1 rounded-md bg-muted p-1">
              {(["AM", "PM"] as const).map((period) => {
                const active = period === parts.period;
                return (
                  <button
                    key={period}
                    type="button"
                    aria-pressed={active}
                    className={cn(
                      "flex-1 rounded-[5px] py-1.5 font-mono-num text-sm",
                      active
                        ? "bg-primary font-medium text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => emit12(parts.hour12, parts.minute, period)}
                  >
                    {period}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
