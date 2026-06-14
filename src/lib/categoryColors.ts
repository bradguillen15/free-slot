/** Color palette cycled for labels created on the fly. */
const CREATE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#84cc16", "#ef4444", "#14b8a6"];

export function nextCreateColor(existingCount: number): string {
  return CREATE_COLORS[existingCount % CREATE_COLORS.length];
}
