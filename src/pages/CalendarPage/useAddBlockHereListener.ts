import { useEffect } from "react";

/**
 * Listens for the `add-block-here` custom event dispatched by the day-timeline context menu
 * and invokes `onAddBlock` with the chosen start minute. CalendarPage-specific glue.
 */
export function useAddBlockHereListener(onAddBlock: (startMin: number) => void) {
  useEffect(() => {
    const handler = (e: Event) => {
      const { startMin } = (e as CustomEvent<{ startMin: number }>).detail;
      onAddBlock(startMin);
    };
    document.addEventListener("add-block-here", handler);
    return () => document.removeEventListener("add-block-here", handler);
  }, [onAddBlock]);
}
