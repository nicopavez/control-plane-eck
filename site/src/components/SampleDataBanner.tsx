import { usingSampleData } from "@/lib/data";

/**
 * Impossible-to-miss strip shown whenever any of the charted JSON files is
 * still a `sample: true` fixture (see site/data/README.md). Never dismissable
 * and never styled to blend in: a presenter must not be able to mistake
 * sample numbers for a real captured run.
 */
export function SampleDataBanner() {
  if (!usingSampleData) return null;
  return (
    <div className="sample-banner" role="status">
      <strong>Showing sample data.</strong> Replace <code>site/data/*.json</code> with real
      captured metrics after Task 1. Nothing below is a real finding yet.
    </div>
  );
}
