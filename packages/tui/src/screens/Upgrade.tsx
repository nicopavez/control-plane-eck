import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import type { ControlPlaneClient, UpgradeProgress } from "@control-plane-eck/shared";
import { Header } from "../components/Header.js";
import { KeyHints } from "../components/KeyHints.js";
import { ApiErrorView } from "../components/ApiErrorView.js";
import { ConditionList } from "../components/ConditionList.js";
import { useInterval } from "../lib/useInterval.js";
import { getApiBaseUrl } from "../lib/client.js";
import { describeApiError, type ApiErrorInfo } from "../lib/errors.js";
import { formatDuration } from "../lib/format.js";

const POLL_MS = 2000;

type Step = "enter-version" | "confirm" | "submitting" | "submit-error" | "watching";

interface UpgradeScreenProps {
  client: ControlPlaneClient;
  onBack: () => void;
}

export function UpgradeScreen({ client, onBack }: UpgradeScreenProps): React.JSX.Element | null {
  const baseUrl = getApiBaseUrl();
  const [step, setStep] = useState<Step>("enter-version");
  const [version, setVersion] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UpgradeProgress | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [watchError, setWatchError] = useState<ApiErrorInfo | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  useInput((_input, key) => {
    if (key.escape && step !== "submitting") onBack();
  });

  const isWatchingUnfinished = step === "watching" && progress !== null && !progress.done;

  useInterval(
    () => {
      if (startedAt !== null) setElapsedMs(Date.now() - startedAt);
      client
        .getUpgradeProgress()
        .then((next) => {
          setProgress(next);
          setWatchError(null);
        })
        .catch((err: unknown) => setWatchError(describeApiError(err, baseUrl)));
    },
    isWatchingUnfinished ? POLL_MS : null,
  );

  if (step === "enter-version") {
    return (
      <Box flexDirection="column">
        <Header title="Upgrade" subtitle="Roll the cluster to a new Elasticsearch version" />
        <Box>
          <Text>Target version: </Text>
          <TextInput
            value={version}
            onChange={(value) => {
              setVersion(value);
              setValidationError(null);
            }}
            onSubmit={(value) => {
              if (value.trim() === "") {
                setValidationError("Enter a version, e.g. 8.15.3");
                return;
              }
              setStep("confirm");
            }}
            placeholder="8.15.3"
          />
        </Box>
        {validationError ? <Text color="red">{validationError}</Text> : null}
        <KeyHints hints={["[enter] continue", "[esc] back"]} />
      </Box>
    );
  }

  if (step === "confirm") {
    const target = version.trim();
    return (
      <Box flexDirection="column">
        <Header title="Upgrade - confirm" />
        <Text>
          Upgrade the cluster to <Text bold color="cyan">{target}</Text>?
        </Text>
        <Text dimColor>ECK rolls nodes one at a time. This can take several minutes.</Text>
        <SelectInput
          items={[
            { label: "Cancel", value: "cancel" as const },
            { label: `Confirm: upgrade to ${target}`, value: "confirm" as const },
          ]}
          onSelect={(item) => {
            if (item.value === "cancel") {
              setStep("enter-version");
              return;
            }
            setStep("submitting");
            client
              .upgrade({ version: target })
              .then((next) => {
                setProgress(next);
                setStartedAt(Date.now());
                setElapsedMs(0);
                setStep("watching");
              })
              .catch((err: unknown) => {
                setError(describeApiError(err, baseUrl));
                setStep("submit-error");
              });
          }}
        />
        <KeyHints hints={["[enter] select", "[esc] back"]} />
      </Box>
    );
  }

  if (step === "submitting") {
    return (
      <Box flexDirection="column">
        <Header title="Upgrade" />
        <Text>
          <Spinner type="dots" /> Submitting upgrade request...
        </Text>
      </Box>
    );
  }

  if (step === "submit-error" && error) {
    return (
      <Box flexDirection="column">
        <Header title="Upgrade - failed" />
        <ApiErrorView title={error.title} detail={error.detail} />
        <KeyHints hints={["[esc] back"]} />
      </Box>
    );
  }

  if (step === "watching" && progress) {
    const elapsed = formatDuration(elapsedMs);
    return (
      <Box flexDirection="column">
        <Header title="Upgrade - in progress" />
        <Box>
          {progress.done ? (
            <Text bold color="green">
              Done
            </Text>
          ) : (
            <Text color="yellow">
              <Spinner type="dots" /> {progress.phase}
            </Text>
          )}
        </Box>
        <Text>
          {progress.currentVersion} {"->"} {progress.desiredVersion}
        </Text>
        <Text dimColor>
          elapsed {elapsed} - watching every {POLL_MS / 1000}s
        </Text>
        <ConditionList conditions={progress.conditions} />
        {watchError ? (
          <Box marginTop={1}>
            <Text color="yellow">Last poll failed: {watchError.detail}</Text>
          </Box>
        ) : null}
        <KeyHints
          hints={[
            progress.done
              ? "[esc] back to menu"
              : "[esc] stop watching (upgrade keeps running in the cluster)",
          ]}
        />
      </Box>
    );
  }

  return null;
}
