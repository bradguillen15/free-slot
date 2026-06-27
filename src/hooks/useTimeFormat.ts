import { useProfile } from "@/lib/dataStore";
import type { TimeFormat } from "@/lib/time";

export function useTimeFormat(): TimeFormat {
  const { data: profile } = useProfile();
  return profile?.time_format === "12h" ? "12h" : "24h";
}
