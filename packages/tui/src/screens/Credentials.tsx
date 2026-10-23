import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import type { Credentials, ControlPlaneClient } from "@control-plane-eck/shared";
import { Header } from "../components/Header.js";
import { KeyHints } from "../components/KeyHints.js";
import { ApiErrorView } from "../components/ApiErrorView.js";
import { getApiBaseUrl } from "../lib/client.js";
import { describeApiError, type ApiErrorInfo } from "../lib/errors.js";

interface CredentialsScreenProps {
  client: ControlPlaneClient;
  onBack: () => void;
}

export function CredentialsScreen({ client, onBack }: CredentialsScreenProps): React.JSX.Element {
  const baseUrl = getApiBaseUrl();
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  const fetchCredentials = (): void => {
    client
      .getCredentials()
      .then((next) => {
        setCreds(next);
        setError(null);
      })
      .catch((err: unknown) => setError(describeApiError(err, baseUrl)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCredentials();
    // Fetched once on entry; [r] below refetches explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (input === "r") {
      setLoading(true);
      fetchCredentials();
    }
    if (input === "s") setRevealed((prev) => !prev);
  });

  return (
    <Box flexDirection="column">
      <Header
        title="Credentials"
        subtitle="Rendered in this terminal only. Not logged, not written to any file."
      />
      {loading && !creds ? (
        <Text>
          <Spinner type="dots" /> Fetching credentials...
        </Text>
      ) : error && !creds ? (
        <ApiErrorView title={error.title} detail={error.detail} />
      ) : creds ? (
        <Box flexDirection="column">
          <Text>
            Username: <Text bold color="cyan">{creds.username}</Text>
          </Text>
          <Text>
            Password:{" "}
            <Text bold color="cyan">
              {revealed ? creds.password : "*".repeat(creds.password.length)}
            </Text>
            <Text dimColor>  [s] {revealed ? "hide" : "show"}</Text>
          </Text>
          <Box
            marginTop={1}
            flexDirection="column"
            borderStyle="round"
            borderColor="gray"
            paddingX={1}
          >
            <Text dimColor>curl snippet</Text>
            <Text>{creds.curlSnippet}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="yellow">
              This stays in this process's memory for the life of this run. Nothing on this
              screen is written to disk by the TUI.
            </Text>
          </Box>
        </Box>
      ) : null}
      <KeyHints hints={["[esc] back", "[r] refresh", "[s] show/hide password"]} />
    </Box>
  );
}
