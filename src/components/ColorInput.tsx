import { Input } from "@/components/ui/input";

type ColorInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name for the native color input */
  ariaLabel: string;
  placeholder?: string;
  className?: string;
};

/** Native color picker + hex text field — shared by label and schedule block dialogs. */
export function ColorInput({ value, onChange, ariaLabel, placeholder, className }: ColorInputProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 rounded cursor-pointer bg-transparent border border-border shrink-0"
        aria-label={ariaLabel}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 flex-1 font-mono text-xs"
        placeholder={placeholder}
      />
    </div>
  );
}
