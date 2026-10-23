import React, { useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import type { ControlPlaneClient } from "@control-plane-eck/shared";
import { Header } from "./components/Header.js";
import { KeyHints } from "./components/KeyHints.js";
import { Dashboard } from "./screens/Dashboard.js";
import { CredentialsScreen } from "./screens/Credentials.js";
import { ScaleScreen } from "./screens/Scale.js";
import { UpgradeScreen } from "./screens/Upgrade.js";
import { IndicesScreen } from "./screens/Indices.js";
import { getApiBaseUrl } from "./lib/client.js";

type ScreenId = "menu" | "dashboard" | "credentials" | "scale" | "upgrade" | "indices";

interface MenuEntry {
  label: string;
  description: string;
  value: ScreenId;
}

const MENU_ENTRIES: MenuEntry[] = [
  { label: "Dashboard", description: "cluster health, phase, node sets", value: "dashboard" },
  { label: "Credentials", description: "elastic user, password, curl snippet", value: "credentials" },
  { label: "Scale", description: "change a node set's replica count", value: "scale" },
  { label: "Upgrade", description: "roll the cluster to a new ES version", value: "upgrade" },
  { label: "Indices", description: "list, create, delete indices", value: "indices" },
];

interface AppProps {
  client: ControlPlaneClient;
}

export function App({ client }: AppProps): React.JSX.Element {
  const [screen, setScreen] = useState<ScreenId>("menu");
  const { exit } = useApp();
  const goHome = (): void => setScreen("menu");

  useInput(
    (input) => {
      if (input === "q") exit();
    },
    { isActive: screen === "menu" },
  );

  if (screen === "dashboard") return <Dashboard client={client} onBack={goHome} />;
  if (screen === "credentials") return <CredentialsScreen client={client} onBack={goHome} />;
  if (screen === "scale") return <ScaleScreen client={client} onBack={goHome} />;
  if (screen === "upgrade") return <UpgradeScreen client={client} onBack={goHome} />;
  if (screen === "indices") return <IndicesScreen client={client} onBack={goHome} />;

  return (
    <Box flexDirection="column">
      <Header
        title="ECK Control Plane"
        subtitle="Local Elasticsearch on minikube, managed without YAML or kubectl"
      />
      <SelectInput
        items={MENU_ENTRIES.map((entry) => ({
          label: `${entry.label.padEnd(12)} ${entry.description}`,
          value: entry.value,
        }))}
        onSelect={(item) => setScreen(item.value)}
      />
      <Box marginTop={1}>
        <Text dimColor>API target: {getApiBaseUrl()}</Text>
      </Box>
      <KeyHints hints={["[up/down] move", "[enter] select", "[q] quit"]} />
    </Box>
  );
}
