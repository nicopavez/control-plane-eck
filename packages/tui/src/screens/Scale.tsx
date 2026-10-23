import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import type { ClusterStatus, ControlPlaneClient, NodeSetStatus } from "@control-plane-eck/shared";
import { Header } from "../components/Header.js";
import { KeyHints } from "../components/KeyHints.js";
import { ApiErrorView } from "../components/ApiErrorView.js";
import { getApiBaseUrl } from "../lib/client.js";
import { describeApiError, type ApiErrorInfo } from "../lib/errors.js";

type Step =
  | "loading"
  | "load-error"
  | "select-nodeset"
  | "enter-count"
  | "confirm"
  | "submitting"
  | "submit-error"
  | "done";

interface ScaleScreenProps {
  client: ControlPlaneClient;
  onBack: () => void;
}

export function ScaleScreen({ client, onBack }: ScaleScreenProps): React.JSX.Element | null {
  const baseUrl = getApiBaseUrl();
  const [step, setStep] = useState<Step>("loading");
  const [status, setStatus] = useState<ClusterStatus | null>(null);
  const [resultStatus, setResultStatus] = useState<ClusterStatus | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [selected, setSelected] = useState<NodeSetStatus | null>(null);
  const [countInput, setCountInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    client
      .getStatus()
      .then((next) => {
        setStatus(next);
        setStep("select-nodeset");
      })
      .catch((err: unknown) => {
        setError(describeApiError(err, baseUrl));
        setStep("load-error");
      });
    // Runs once on entry; the client and base URL don't change mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInput((_input, key) => {
    if (key.escape && step !== "submitting") onBack();
  });

  if (step === "loading") {
    return (
      <Box flexDirection="column">
        <Header title="Scale" />
        <Text>
          <Spinner type="dots" /> Loading node sets...
        </Text>
      </Box>
    );
  }

  if (step === "load-error" && error) {
    return (
      <Box flexDirection="column">
        <Header title="Scale" />
        <ApiErrorView title={error.title} detail={error.detail} />
        <KeyHints hints={["[esc] back"]} />
      </Box>
    );
  }

  if (step === "select-nodeset" && status) {
    return (
      <Box flexDirection="column">
        <Header title="Scale" subtitle="Pick a node set to resize" />
        <SelectInput
          items={status.nodeSets.map((nodeSet) => ({
            label: `${nodeSet.name.padEnd(16)} desired ${nodeSet.desiredCount}  ready ${nodeSet.readyCount}  roles ${nodeSet.roles.join("/")}`,
            value: nodeSet.name,
          }))}
          onSelect={(item) => {
            const nodeSet = status.nodeSets.find((candidate) => candidate.name === item.value);
            if (!nodeSet) return;
            setSelected(nodeSet);
            setCountInput(String(nodeSet.desiredCount));
            setValidationError(null);
            setStep("enter-count");
          }}
        />
        <KeyHints hints={["[up/down] move", "[enter] select", "[esc] back"]} />
      </Box>
    );
  }

  if (step === "enter-count" && selected) {
    return (
      <Box flexDirection="column">
        <Header title="Scale" subtitle={`${selected.name} - current desired: ${selected.desiredCount}`} />
        <Box>
          <Text>New desired count: </Text>
          <TextInput
            value={countInput}
            onChange={(value) => {
              setCountInput(value);
              setValidationError(null);
            }}
            onSubmit={(value) => {
              const parsed = Number(value.trim());
              if (value.trim() === "" || !Number.isInteger(parsed) || parsed < 1) {
                setValidationError("Enter a whole number, 1 or greater.");
                return;
              }
              setStep("confirm");
            }}
          />
        </Box>
        {validationError ? <Text color="red">{validationError}</Text> : null}
        <KeyHints hints={["[enter] continue", "[esc] back"]} />
      </Box>
    );
  }

  if (step === "confirm" && selected) {
    const target = Number(countInput.trim());
    const growing = target > selected.desiredCount;
    return (
      <Box flexDirection="column">
        <Header title="Scale - confirm" />
        <Text>
          Scale <Text bold color="cyan">{selected.name}</Text> from{" "}
          <Text bold>{selected.desiredCount}</Text> to{" "}
          <Text bold color={growing ? "green" : "yellow"}>{target}</Text>?
        </Text>
        <SelectInput
          items={[
            { label: "Cancel", value: "cancel" as const },
            { label: `Confirm: scale to ${target}`, value: "confirm" as const },
          ]}
          onSelect={(item) => {
            if (item.value === "cancel") {
              setStep("enter-count");
              return;
            }
            setStep("submitting");
            client
              .scaleNodeSet({ nodeSet: selected.name, count: target })
              .then((next) => {
                setResultStatus(next);
                setStep("done");
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
        <Header title="Scale" />
        <Text>
          <Spinner type="dots" /> Submitting scale request...
        </Text>
      </Box>
    );
  }

  if (step === "submit-error" && error) {
    return (
      <Box flexDirection="column">
        <Header title="Scale - failed" />
        <ApiErrorView title={error.title} detail={error.detail} />
        <KeyHints hints={["[esc] back"]} />
      </Box>
    );
  }

  if (step === "done" && resultStatus && selected) {
    const nodeSet = resultStatus.nodeSets.find((candidate) => candidate.name === selected.name);
    return (
      <Box flexDirection="column">
        <Header title="Scale - submitted" />
        <Text color="green">Scale request accepted.</Text>
        {nodeSet ? (
          <Text>
            {nodeSet.name}: desired {nodeSet.desiredCount}, ready {nodeSet.readyCount} (ECK rolls
            nodes out gradually; check Dashboard for live progress)
          </Text>
        ) : null}
        <KeyHints hints={["[esc] back to menu"]} />
      </Box>
    );
  }

  return null;
}
