import React from "react";
import { Box, Text } from "ink";

interface ApiErrorViewProps {
  title: string;
  detail: string;
}

/** The unreachable-API / request-failed state. Never a hang, never a raw stack trace. */
export function ApiErrorView({ title, detail }: ApiErrorViewProps): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
      <Text bold color="red">
        {title}
      </Text>
      <Text>{detail}</Text>
    </Box>
  );
}
