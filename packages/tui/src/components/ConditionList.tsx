import React from "react";
import { Box, Text } from "ink";
import type { Condition } from "@control-plane-eck/shared";

const STATUS_COLORS: Record<string, string> = {
  True: "green",
  False: "red",
  Unknown: "yellow",
};

interface ConditionListProps {
  conditions: Condition[];
}

/** Shared by Dashboard and Upgrade: Kubernetes-style conditions, one per line. */
export function ConditionList({ conditions }: ConditionListProps): React.JSX.Element | null {
  if (conditions.length === 0) return null;
  return (
    <Box marginTop={1} flexDirection="column">
      <Text bold>Conditions</Text>
      {conditions.map((condition, index) => (
        <Text key={`${condition.type}-${index}`}>
          <Text color={STATUS_COLORS[condition.status] ?? "gray"}>
            {condition.status.padEnd(7)}
          </Text>{" "}
          {condition.type}
          {condition.message ? <Text dimColor>  ({condition.message})</Text> : null}
        </Text>
      ))}
    </Box>
  );
}
