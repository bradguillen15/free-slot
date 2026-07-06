import { toast } from "sonner";
import type { TFunction } from "i18next";

export function errorMessage(err: unknown, fallback = "unknown"): string {
  return err instanceof Error ? err.message : fallback;
}

/** Standard mutation-failure toast: the thrown message when available, a translated fallback otherwise. */
export function toastError(err: unknown, t: TFunction, fallbackKey = "common.somethingWrong"): void {
  toast.error(errorMessage(err, t(fallbackKey)));
}
