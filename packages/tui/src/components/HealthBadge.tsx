import React from "react";
import { Text } from "ink";

// One color convention, reused everywhere: green = healthy/success,
// yellow = caution/in-progress, red = error/unhealthy, gray = unknown.
const HEALTH_COLORS: Record<string, string> = {
  green: "green",
  yellow: "yellow",
  red: "red",
  unknown: "gray",
};

interface HealthBadgeProps {
  health: string;
}

export function HealthBadge({ health }: HealthBadgeProps): React.JSX.Element {
  const color = HEALTH_COLORS[health] ?? "gray";
  return (
    <Text bold color={color}>
      {health.toUpperCase()}
    </Text>
  );
}
