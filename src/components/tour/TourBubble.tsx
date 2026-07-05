import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { TourStep } from "./tourSteps";

const BUBBLE_WIDTH = 320;
const GAP = 12;
const ANCHOR_POLL_MS = 100;
const ANCHOR_TIMEOUT_MS = 3000;

type AnchorState =
  | { kind: "waiting" }
  | { kind: "anchored"; rect: DOMRect }
  | { kind: "centered" };

/**
 * Coach-mark bubble positioned near its `[data-tour=...]` anchor, with a dimmed
 * backdrop and a highlight ring. Waits for the anchor to mount after route
 * changes; falls back to a centered bubble if it never appears.
 */
export function TourBubble({
  step,
  stepIndex,
  totalSteps,
  isLast,
  onNext,
  onSkip,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<AnchorState>({ kind: "waiting" });

  useLayoutEffect(() => {
    setAnchor({ kind: "waiting" });
    let cancelled = false;
    const started = Date.now();

    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${step.anchorId}"]`);
      if (el) {
        setAnchor({ kind: "anchored", rect: el.getBoundingClientRect() });
        return;
      }
      if (Date.now() - started > ANCHOR_TIMEOUT_MS) {
        setAnchor({ kind: "centered" });
        return;
      }
      window.setTimeout(measure, ANCHOR_POLL_MS);
    };
    measure();

    const onViewportChange = () => {
      const el = document.querySelector(`[data-tour="${step.anchorId}"]`);
      if (!el || cancelled) return;
      const rect = el.getBoundingClientRect();
      setAnchor((prev) => {
        if (
          prev.kind === "anchored" &&
          prev.rect.top === rect.top && prev.rect.left === rect.left &&
          prev.rect.width === rect.width && prev.rect.height === rect.height
        ) {
          return prev;
        }
        return { kind: "anchored", rect };
      });
    };
    // Layout keeps shifting after route changes (data loads, banners mount), so
    // re-measure on a timer as well — a stale rect can leave the bubble covering
    // its own anchor.
    const remeasure = window.setInterval(onViewportChange, 250);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      cancelled = true;
      window.clearInterval(remeasure);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [step.anchorId]);

  if (anchor.kind === "waiting") return null;

  const bubbleStyle: React.CSSProperties = { width: `min(${BUBBLE_WIDTH}px, calc(100vw - 24px))` };
  if (anchor.kind === "anchored") {
    const { rect } = anchor;
    const placeBelow = rect.bottom + 200 < window.innerHeight;
    if (placeBelow) {
      bubbleStyle.top = rect.bottom + GAP;
    } else {
      bubbleStyle.bottom = window.innerHeight - rect.top + GAP;
    }
    const left = Math.min(Math.max(rect.left, 12), window.innerWidth - BUBBLE_WIDTH - 12);
    bubbleStyle.left = Math.max(left, 12);
  } else {
    bubbleStyle.top = "50%";
    bubbleStyle.left = "50%";
    bubbleStyle.transform = "translate(-50%, -50%)";
  }

  return createPortal(
    // pointer-events-none keeps the page (and the highlighted anchor) clickable;
    // only the bubble itself captures input. z-40 stays below Radix dialogs
    // (z-50) so confirmation dialogs opened mid-tour are never obscured.
    <div className="fixed inset-0 z-40 pointer-events-none" data-testid="tour-overlay">
      <div className="absolute inset-0 bg-background/50" aria-hidden />
      {anchor.kind === "anchored" && (
        <div
          className="absolute rounded-lg ring-2 ring-primary shadow-glow pointer-events-none"
          style={{
            top: anchor.rect.top - 4,
            left: anchor.rect.left - 4,
            width: anchor.rect.width + 8,
            height: anchor.rect.height + 8,
          }}
          aria-hidden
        />
      )}
      <div
        role="dialog"
        aria-label={t(step.titleKey)}
        data-testid={`tour-bubble-${step.id}`}
        className="fixed pointer-events-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-lg p-4 space-y-3"
        style={bubbleStyle}
      >
        <div className="text-xs text-muted-foreground">
          {t("tour.stepCounter", { current: stepIndex + 1, total: totalSteps })}
        </div>
        <div className="font-display text-base font-semibold">{t(step.titleKey)}</div>
        <p className="text-sm text-muted-foreground">{t(step.bodyKey)}</p>
        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={onSkip} data-testid="tour-skip" className="text-muted-foreground">
            {t("tour.skip")}
          </Button>
          <Button
            size="sm"
            onClick={onNext}
            data-testid="tour-next"
            className="gradient-primary text-primary-foreground hover:opacity-90"
          >
            {isLast ? t("tour.done") : t("tour.next")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
