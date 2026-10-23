"use client";

import { useEffect, useRef } from "react";
import scrollama from "scrollama";

export interface ScrollamaStepEvent {
  index: number;
  direction: "up" | "down";
}

export interface UseScrollamaOptions {
  /** CSS selector for this instance's steps, scoped to avoid colliding with other sections. */
  stepSelector: string;
  /** Fraction of the viewport height, from the top, that triggers a step. */
  offset?: number;
  onStepEnter: (event: ScrollamaStepEvent) => void;
  onStepExit?: (event: ScrollamaStepEvent) => void;
  /** Re-run setup when this changes, e.g. after the step count changes. */
  deps?: unknown[];
}

/**
 * Thin wrapper around scrollama's current IntersectionObserver-based API.
 * The pinned visual itself is positioned with CSS `position: sticky`; this
 * hook only tells the caller which step is active so it can update that
 * sticky panel's content. It never uses the deprecated onContainerEnter/Exit.
 */
export function useScrollama({
  stepSelector,
  offset = 0.5,
  onStepEnter,
  onStepExit,
  deps = [],
}: UseScrollamaOptions): void {
  const onStepEnterRef = useRef(onStepEnter);
  const onStepExitRef = useRef(onStepExit);

  // Keep the refs pointing at the latest callbacks without mutating them
  // during render: this effect has no dependency array, so it runs after
  // every render, right before the setup effect below reads them.
  useEffect(() => {
    onStepEnterRef.current = onStepEnter;
    onStepExitRef.current = onStepExit;
  });

  useEffect(() => {
    const steps = document.querySelectorAll(stepSelector);
    if (steps.length === 0) return;

    const scroller = scrollama();
    scroller
      .setup({ step: stepSelector, offset })
      .onStepEnter((response) => {
        onStepEnterRef.current({ index: response.index, direction: response.direction });
      })
      .onStepExit((response) => {
        onStepExitRef.current?.({ index: response.index, direction: response.direction });
      });

    const handleResize = () => scroller.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      scroller.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepSelector, offset, ...deps]);
}
