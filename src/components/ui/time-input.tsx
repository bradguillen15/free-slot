import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fmtDisplayTime,
  from12HourParts,
  to12HourParts,
  type TimeFormat,
} from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);
const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type Props = {
  value: string;
  onChange: (hhmm: string) => void;
  format: TimeFormat;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
};

function minuteOptions(currentMinute: number): number[] {
  const base = new Set(MINUTES);
  if (!base.has(currentMinute)) base.add(currentMinute);
  return [...base].sort((a, b) => a - b);
}

export function TimeInput({
  value,
  onChange,
  format,
  disabled,
  className,
  "data-testid": dataTestId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [h24, m] = value.split(":").map(Number);
  const parts12 = to12HourParts(value);
  const minutes = useMemo(() => minuteOptions(m || 0), [m]);

  const emit24 = (hour24: number, minute: number) => {
    onChange(`${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  };

  const emit12 = (hour12: number, minute: number, period: "AM" | "PM") => {
    onChange(from12HourParts(hour12, minute, period));
  };

  const label = fmtDisplayTime(value, format);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={label}
          className={cn(
            "h-10 w-full justify-between font-mono-num font-normal",
            className,
          )}
        >
          <span>{label}</span>
          <Clock className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      {dataTestId && (
        <input
          type="text"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          data-testid={dataTestId}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) onChange(v);
          }}
        />
      )}
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex gap-2">
          <ScrollArea className="h-48 w-16">
            <div className="flex flex-col gap-0.5 p-1">
              {format === "24h"
                ? HOURS_24.map((h) => (
                    <Button
                      key={h}
                      type="button"
                      size="sm"
                      variant={h === h24 ? "default" : "ghost"}
                      className="h-8 font-mono-num"
                      aria-label={`Hour ${String(h).padStart(2, "0")}`}
                      onClick={() => emit24(h, m || 0)}
                    >
                      {String(h).padStart(2, "0")}
                    </Button>
                  ))
                : HOURS_12.map((h) => (
                    <Button
                      key={h}
                      type="button"
                      size="sm"
                      variant={h === parts12.hour12 ? "default" : "ghost"}
                      className="h-8 font-mono-num"
                      aria-label={`Hour ${h}`}
                      onClick={() => emit12(h, parts12.minute, parts12.period)}
                    >
                      {h}
                    </Button>
                  ))}
            </div>
          </ScrollArea>
          <ScrollArea className="h-48 w-16">
            <div className="flex flex-col gap-0.5 p-1">
              {minutes.map((min) => (
                <Button
                  key={min}
                  type="button"
                  size="sm"
                  variant={min === (m || 0) ? "default" : "ghost"}
                  className="h-8 font-mono-num"
                  aria-label={`Minute ${String(min).padStart(2, "0")}`}
                  onClick={() =>
                    format === "24h"
                      ? emit24(h24 || 0, min)
                      : emit12(parts12.hour12, min, parts12.period)
                  }
                >
                  {String(min).padStart(2, "0")}
                </Button>
              ))}
            </div>
          </ScrollArea>
          {format === "12h" && (
            <div className="flex flex-col gap-0.5 p-1">
              {(["AM", "PM"] as const).map((period) => (
                <Button
                  key={period}
                  type="button"
                  size="sm"
                  variant={period === parts12.period ? "default" : "ghost"}
                  className="h-8 w-12"
                  onClick={() => emit12(parts12.hour12, parts12.minute, period)}
                >
                  {period}
                </Button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
