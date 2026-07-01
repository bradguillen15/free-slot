import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
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
const ROW_HEIGHT = 40;
const WHEEL_HEIGHT = 200;
const WHEEL_PADDING = (WHEEL_HEIGHT - ROW_HEIGHT) / 2;
const WHEEL_CYCLES = 9;
const WHEEL_MIDDLE_CYCLE = Math.floor(WHEEL_CYCLES / 2);

const pad = (n: number) => String(n).padStart(2, "0");

function scrollWheelTo(el: HTMLElement | null, top: number, behavior: ScrollBehavior = "auto") {
  if (!el) return;
  if (typeof el.scrollTo === "function") {
    el.scrollTo({ top, behavior });
    return;
  }
  el.scrollTop = top;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

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

type WheelItem = {
  value: number;
  label: string;
  ariaLabel: string;
};

type WheelColumnProps = {
  items: WheelItem[];
  selectedValue: number;
  onSelect: (value: number) => void;
  listAriaLabel: string;
  open: boolean;
};

function useInfiniteWheel(
  items: WheelItem[],
  selectedValue: number,
  open: boolean,
  onSelect: (value: number) => void,
) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOpen = useRef(false);
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === selectedValue),
  );
  const selectedVirtualIndex = WHEEL_MIDDLE_CYCLE * items.length + selectedIndex;
  const virtualItems = Array.from({ length: WHEEL_CYCLES * items.length }, (_, index) => ({
    item: items[index % items.length],
    index,
  }));
  const [centerIndex, setCenterIndex] = useState(selectedVirtualIndex);

  useEffect(() => {
    if (open && !wasOpen.current) {
      const frame = requestAnimationFrame(() => {
        if (scrollerRef.current) {
          scrollerRef.current.scrollTop = selectedVirtualIndex * ROW_HEIGHT;
          setCenterIndex(selectedVirtualIndex);
        }
      });
      wasOpen.current = true;
      return () => cancelAnimationFrame(frame);
    }
    if (!open) wasOpen.current = false;
  }, [open, selectedVirtualIndex]);

  useEffect(() => {
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  const commitScroll = (scrollTop: number) => {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const rawIndex = Math.min(
        Math.max(Math.round(scrollTop / ROW_HEIGHT), 0),
        virtualItems.length - 1,
      );
      const itemIndex = positiveModulo(rawIndex, items.length);
      const nextIndex = WHEEL_MIDDLE_CYCLE * items.length + itemIndex;
      onSelect(items[itemIndex].value);
      scrollWheelTo(scrollerRef.current, nextIndex * ROW_HEIGHT);
      setCenterIndex(nextIndex);
    }, 120);
  };

  const handleScroll = (scrollTop: number) => {
    const index = Math.min(
      Math.max(Math.round(scrollTop / ROW_HEIGHT), 0),
      virtualItems.length - 1,
    );
    setCenterIndex(index);
    commitScroll(scrollTop);
  };

  const selectVirtualIndex = (index: number) => {
    const itemIndex = positiveModulo(index, items.length);
    const nextIndex = WHEEL_MIDDLE_CYCLE * items.length + itemIndex;
    onSelect(items[itemIndex].value);
    scrollWheelTo(scrollerRef.current, nextIndex * ROW_HEIGHT, "smooth");
    setCenterIndex(nextIndex);
  };

  return {
    centerIndex,
    handleScroll,
    scrollerRef,
    selectVirtualIndex,
    virtualItems,
  };
}

function WheelColumn({
  items,
  selectedValue,
  onSelect,
  listAriaLabel,
  open,
}: WheelColumnProps) {
  const { centerIndex, handleScroll, scrollerRef, selectVirtualIndex, virtualItems } =
    useInfiniteWheel(items, selectedValue, open, onSelect);

  return (
    <div className="relative min-w-0 flex-1">
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-10 -translate-y-1/2 rounded-lg border border-primary/40 bg-primary/20 shadow-[0_0_24px_-12px_hsl(var(--primary))]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-20 bg-gradient-to-b from-popover to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-popover to-transparent"
        aria-hidden
      />
      <div
        ref={scrollerRef}
        role="listbox"
        aria-label={listAriaLabel}
        className="relative z-[1] w-full snap-y snap-mandatory touch-pan-y overflow-y-auto overscroll-y-contain [&::-webkit-scrollbar]:hidden"
        style={{ height: WHEEL_HEIGHT, scrollbarWidth: "none" }}
        onScroll={(e) => handleScroll(e.currentTarget.scrollTop)}
      >
        <div style={{ height: WHEEL_PADDING }} />
        {virtualItems.map(({ item, index }) => {
          const distance = Math.abs(index - centerIndex);
          const isCenter = index === centerIndex;
          const isAccessibleCycle =
            Math.floor(index / items.length) === WHEEL_MIDDLE_CYCLE;
          return (
            <button
              key={`${item.value}-${index}`}
              type="button"
              data-selected={isCenter}
              aria-label={item.ariaLabel}
              aria-hidden={!isAccessibleCycle}
              tabIndex={isAccessibleCycle ? 0 : -1}
              className={cn(
                "flex w-full snap-center items-center justify-center font-mono-num transition-[opacity,transform,color] duration-150",
                distance === 0 && "text-base font-semibold text-foreground",
                distance === 1 && "text-sm text-muted-foreground opacity-65",
                distance >= 2 && "scale-95 text-sm text-muted-foreground opacity-35",
              )}
              style={{ height: ROW_HEIGHT }}
              onClick={() => selectVirtualIndex(index)}
            >
              {item.label}
            </button>
          );
        })}
        <div style={{ height: WHEEL_PADDING }} />
      </div>
    </div>
  );
}

type PeriodToggleProps = {
  period: "AM" | "PM";
  onSelect: (period: "AM" | "PM") => void;
  className?: string;
};

function PeriodToggle({ period, onSelect, className }: PeriodToggleProps) {
  return (
    <div className={cn("flex w-full gap-1 rounded-md border border-border bg-popover p-1", className)}>
      {(["AM", "PM"] as const).map((next) => {
        const active = next === period;
        return (
          <button
            key={next}
            type="button"
            aria-pressed={active}
            className={cn(
              "flex-1 rounded-[5px] py-2 font-mono-num text-sm transition-opacity sm:py-1.5",
              active
                ? "gradient-primary font-medium text-primary-foreground shadow-glow hover:opacity-90"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onSelect(next)}
          >
            {next}
          </button>
        );
      })}
    </div>
  );
}

type PickerWheelsProps = {
  format: TimeFormat;
  hour24: number;
  minute: number;
  parts: ReturnType<typeof to12HourParts>;
  minutes: number[];
  open: boolean;
  onHourSelect: (hour: number) => void;
  onMinuteSelect: (minute: number) => void;
  onPeriodSelect: (period: "AM" | "PM") => void;
};

function PickerWheels({
  format,
  hour24,
  minute,
  parts,
  minutes,
  open,
  onHourSelect,
  onMinuteSelect,
  onPeriodSelect,
}: PickerWheelsProps) {
  const hours = format === "24h" ? HOURS_24 : HOURS_12;
  const hourItems: WheelItem[] = hours.map((h) => ({
    value: h,
    label: format === "24h" ? pad(h) : String(h),
    ariaLabel: `Hour ${format === "24h" ? pad(h) : h}`,
  }));
  const minuteItems: WheelItem[] = minutes.map((m) => ({
    value: m,
    label: pad(m),
    ariaLabel: `Minute ${pad(m)}`,
  }));
  const selectedHour = format === "24h" ? hour24 || 0 : parts.hour12;

  return (
    <div className="w-full">
      <div className="relative flex items-stretch justify-center gap-1 px-1 sm:gap-2">
        <WheelColumn
          items={hourItems}
          selectedValue={selectedHour}
          onSelect={onHourSelect}
          listAriaLabel="Hour wheel"
          open={open}
        />
        <span className="z-10 self-center text-lg text-muted-foreground">:</span>
        <WheelColumn
          items={minuteItems}
          selectedValue={minute}
          onSelect={onMinuteSelect}
          listAriaLabel="Minute wheel"
          open={open}
        />
      </div>
      {format === "12h" && (
        <div className="mt-4 w-full">
          <PeriodToggle period={parts.period} onSelect={onPeriodSelect} />
        </div>
      )}
    </div>
  );
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
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => fmtFieldTime(value, format));
  const typing = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const [h24, m] = value.split(":").map(Number);
  const minute = m || 0;
  const parts = to12HourParts(value);
  const minutes = minuteOptions(minute);

  useEffect(() => {
    if (!typing.current) setDraft(fmtFieldTime(value, format));
  }, [value, format]);

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

  const closePicker = () => {
    typing.current = false;
    setDraft(fmtFieldTime(value, format));
    setOpen(false);
  };

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

  const onHourSelect = (hour: number) => {
    if (format === "24h") emit24(hour, minute);
    else emit12(hour, minute, parts.period);
  };

  const onMinuteSelect = (nextMinute: number) => {
    if (format === "24h") emit24(h24 || 0, nextMinute);
    else emit12(parts.hour12, nextMinute, parts.period);
  };

  const onPeriodSelect = (period: "AM" | "PM") => {
    emit12(parts.hour12, parts.minute, period);
  };

  const wheels = (
    <PickerWheels
      format={format}
      hour24={h24 || 0}
      minute={minute}
      parts={parts}
      minutes={minutes}
      open={open}
      onHourSelect={onHourSelect}
      onMinuteSelect={onMinuteSelect}
      onPeriodSelect={onPeriodSelect}
    />
  );

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full", className)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          closePicker();
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
        <div
          data-testid={isMobile ? "time-picker-mobile" : undefined}
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-2 w-full overflow-hidden border border-border bg-popover p-3 text-popover-foreground shadow-md",
            isMobile
              ? "flex h-[45dvh] max-h-[50dvh] flex-col justify-center rounded-2xl shadow-elevated"
              : "rounded-md",
          )}
        >
          {wheels}
        </div>
      )}
    </div>
  );
}
