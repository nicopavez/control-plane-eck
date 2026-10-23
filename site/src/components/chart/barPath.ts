/**
 * A horizontal bar growing left-to-right from a fixed baseline: square at the
 * baseline (left), 4px rounded corners at the data end (right), per the
 * dataviz skill's mark spec. Degrades to a plain rect path when the bar is
 * too short for the radius.
 */
export function horizontalBarPath(x: number, y: number, width: number, height: number, radius = 4): string {
  const r = Math.min(radius, height / 2, Math.max(width, 0));
  if (width <= 0) return "";
  if (r <= 0.5) {
    return `M${x},${y} h${width} v${height} h${-width} Z`;
  }
  return [
    `M${x},${y}`,
    `h${width - r}`,
    `a${r},${r} 0 0 1 ${r},${r}`,
    `v${height - 2 * r}`,
    `a${r},${r} 0 0 1 ${-r},${r}`,
    `h${-(width - r)}`,
    "Z",
  ].join(" ");
}
