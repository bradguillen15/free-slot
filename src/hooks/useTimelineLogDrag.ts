import { useRef, useState, type RefObject } from "react";

export const TIMELINE_DRAG_CANCEL_PX = 4;

export function useTimelineLogDrag({
  enabled,
  allowBarDrag,
  captureTargetRef,
  onComplete,
  onTap,
}: {
  enabled: boolean;
  allowBarDrag: boolean;
  captureTargetRef: RefObject<HTMLElement | null>;
  onComplete: (e: React.PointerEvent, start: { x: number; y: number }) => void;
  onTap?: () => void;
}) {
  const captureRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    moved: boolean;
    fromBar: boolean;
  } | null>(null);
  const [offset, setOffset] = useState({ dx: 0, dy: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const startDrag = (fromBar: boolean) => (e: React.PointerEvent) => {
    if (!enabled) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false, fromBar };
    const target = captureTargetRef.current ?? (e.currentTarget as HTMLElement);
    captureRef.current = target;
    try { target.setPointerCapture(e.pointerId); } catch { /* jsdom */ }
    setIsDragging(true);
    setOffset({ dx: 0, dy: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > TIMELINE_DRAG_CANCEL_PX || Math.abs(dy) > TIMELINE_DRAG_CANCEL_PX) {
      dragRef.current.moved = true;
    }
    setOffset({ dx, dy });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragRef.current) {
      setOffset({ dx: 0, dy: 0 });
      return;
    }
    const { moved, startX, startY, fromBar } = dragRef.current;
    dragRef.current = null;
    setIsDragging(false);
    setOffset({ dx: 0, dy: 0 });
    try { captureRef.current?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    captureRef.current = null;

    if (!moved) {
      if (fromBar && allowBarDrag) onTap?.();
      return;
    }
    onComplete(e, { x: startX, y: startY });
  };

  return {
    offset,
    isDragging,
    startHandleDrag: startDrag(false),
    barPointerDown: allowBarDrag ? startDrag(true) : undefined,
    onPointerMove: enabled ? onPointerMove : undefined,
    onPointerUp: enabled ? endDrag : undefined,
    onPointerCancel: enabled ? endDrag : undefined,
  };
}
