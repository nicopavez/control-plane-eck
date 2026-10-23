import { isPlaceholder, type MarketContextStat } from "@/lib/data";

export function StatTile({ item, emphasis = "lg" }: { item: MarketContextStat; emphasis?: "lg" | "sm" }) {
  const placeholder = isPlaceholder(item.stat);
  return (
    <div className={`stat-tile stat-tile-${emphasis}${placeholder ? " stat-tile-placeholder" : ""}`}>
      <p className="stat-value">{item.stat}</p>
      <p className="stat-label">{item.label}</p>
      {placeholder ? (
        <p className="stat-source stat-source-placeholder">Not yet sourced. Awaiting a real figure.</p>
      ) : item.source ? (
        <p className="stat-source">
          {item.sourceUrl ? (
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              {item.source}
            </a>
          ) : (
            item.source
          )}
        </p>
      ) : null}
    </div>
  );
}
