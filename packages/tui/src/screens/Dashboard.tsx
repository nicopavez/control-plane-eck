import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import type { ClusterStatus, ControlPlaneClient } from "@control-plane-eck/shared";
import { Header } from "../components/Header.js";
import { KeyHints } from "../components/KeyHints.js";
import { HealthBadge } from "../components/HealthBadge.js";
import { ApiErrorView } from "../components/ApiErrorView.js";
import { ConditionList } from "../components/ConditionList.js";
import { useInterval } from "../lib/useInterval.js";
import { getApiBaseUrl } from "../lib/client.js";
import { describeApiError, type ApiErrorInfo } from "../lib/errors.js";

const REFRESH_MS = 4000;

interface DashboardProps {
  client: ControlPlaneClient;
  onBack: () => void;
}

export function Dashboard({ client, onBack }: DashboardProps): React.JSX.Element {
  const baseUrl = getApiBaseUrl();
  const [status, setStatus] = useState<ClusterStatus | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(() => {
    client
      .getStatus()
      .then((next) => {
        setStatus(next);
        setError(null);
        setLastUpdated(new Date());
      })
      .catch((err: unknown) => setError(describeApiError(err, baseUrl)))
      .finally(() => setLoading(false));
  }, [client, baseUrl]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refreshes only while this screen is mounted; App.tsx unmounts it on
  // navigation, which runs this effect's cleanup and clears the interval.
  useInterval(refresh, REFRESH_MS);

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column">
      <Header title="Dashboard" subtitle="Cluster health, phase and node sets" />
      {loading ? (
        <Text>
          <Spinner type="dots" /> Loading status...
        </Text>
      ) : error && !status ? (
        <ApiErrorView title={error.title} detail={error.detail} />
      ) : status ? (
        <Box flexDirection="column">
          <Box>
            <Text>Health: </Text>
            <HealthBadge health={status.health} />
            <Text>
              {"   "}Phase: {status.phase}
              {"   "}Version: {status.version}
            </Text>
          </Box>
          <Text dimColor>
            {status.namespace}/{status.name} - {status.availableNodes} node(s) available
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text bold>Node sets</Text>
            {status.nodeSets.map((nodeSet) => {
              const healthy = nodeSet.readyCount >= nodeSet.desiredCount;
              return (
                <Text key={nodeSet.name}>
                  {nodeSet.name.padEnd(16)} ready {nodeSet.readyCount}/{nodeSet.desiredCount}{" "}
                  roles: {nodeSet.roles.join(", ") || "none"}{"  "}
                  <Text color={healthy ? "green" : "yellow"}>{healthy ? "OK" : "SCALING"}</Text>
                </Text>
              );
            })}
          </Box>
          <ConditionList conditions={status.conditions} />
          {error ? (
            <Box marginTop={1}>
              <Text color="yellow">Last refresh failed: {error.detail}</Text>
            </Box>
          ) : null}
          <Box marginTop={1}>
            <Text dimColor>
              {lastUpdated ? `updated ${lastUpdated.toLocaleTimeString()}` : ""} - refreshing
              every {REFRESH_MS / 1000}s
            </Text>
          </Box>
        </Box>
      ) : null}
      <KeyHints hints={["[esc] back", "auto-refresh on"]} />
    </Box>
  );
}
