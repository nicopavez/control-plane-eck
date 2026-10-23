export function formatSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(totalSeconds < 10 ? 1 : 0)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercentFaster(kubectlSeconds: number, tuiSeconds: number): string {
  if (kubectlSeconds <= 0) return "n/a";
  const ratio = (1 - tuiSeconds / kubectlSeconds) * 100;
  return `${Math.round(ratio)}% faster`;
}
