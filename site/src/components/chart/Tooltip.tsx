"use client";

import { useState, type ReactNode } from "react";

export interface TooltipTarget {
  id: string;
  content: ReactNode;
}

/**
 * Per-mark hover tooltip. The target element (a bar, a dot) passes its own
 * onMouseEnter/onFocus handlers calling `show(id)`; this component only
 * tracks which id is active and renders that one tooltip body. Keyboard
 * focus triggers it the same way hover does, so it is not mouse-only.
 */
export function useTooltip() {
  const [activeId, setActiveId] = useState<string | null>(null);
  return {
    activeId,
    show: (id: string) => setActiveId(id),
    hide: () => setActiveId(null),
  };
}

export function TooltipBubble({ children }: { children: ReactNode }) {
  return (
    <div className="chart-tooltip" role="tooltip">
      {children}
    </div>
  );
}
