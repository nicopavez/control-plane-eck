import React from "react";
import { Box, Text } from "ink";

interface KeyHintsProps {
  hints: string[];
}

/** The keybinding bar every screen shows at the bottom, e.g. "[esc] back  [enter] select". */
export function KeyHints({ hints }: KeyHintsProps): React.JSX.Element {
  return (
    <Box marginTop={1}>
      <Text dimColor>{hints.join("   ")}</Text>
    </Box>
  );
}
