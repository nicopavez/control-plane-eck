export interface LegendEntry {
  label: string;
  colorVar: string;
}

/** Required whenever a chart shows 2+ series — identity must never rely on color alone. */
export function Legend({ entries }: { entries: LegendEntry[] }) {
  if (entries.length < 2) return null;
  return (
    <ul className="chart-legend">
      {entries.map((entry) => (
        <li key={entry.label}>
          <span className="chart-legend-swatch" style={{ background: `var(${entry.colorVar})` }} />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}
