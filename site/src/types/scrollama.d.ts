// scrollama ships no types and there is no @types/scrollama package.
// Minimal typing for the subset of the API this app uses.
declare module "scrollama" {
  export interface ScrollamaStepResponse<D = unknown> {
    element: Element;
    index: number;
    direction: "up" | "down";
    data: D;
  }

  export interface ScrollamaOffsetResponse<D = unknown> extends ScrollamaStepResponse<D> {
    progress: number;
  }

  export interface ScrollamaSetupOptions {
    step: string | Element[] | NodeListOf<Element>;
    offset?: number;
    progress?: boolean;
    threshold?: number;
    debug?: boolean;
  }

  export interface ScrollamaInstance {
    setup(options: ScrollamaSetupOptions): ScrollamaInstance;
    onStepEnter(callback: (response: ScrollamaStepResponse) => void): ScrollamaInstance;
    onStepExit(callback: (response: ScrollamaStepResponse) => void): ScrollamaInstance;
    onStepProgress(callback: (response: ScrollamaOffsetResponse) => void): ScrollamaInstance;
    resize(): ScrollamaInstance;
    destroy(): void;
  }

  export default function scrollama(): ScrollamaInstance;
}
