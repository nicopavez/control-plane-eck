import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import chalk from "chalk";
import type { ControlPlaneClient, IndexSummary } from "@control-plane-eck/shared";
import { Header } from "../components/Header.js";
import { KeyHints } from "../components/KeyHints.js";
import { ApiErrorView } from "../components/ApiErrorView.js";
import { getApiBaseUrl } from "../lib/client.js";
import { describeApiError, type ApiErrorInfo } from "../lib/errors.js";
import { formatBytes } from "../lib/format.js";

const INDEX_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

type Step =
  | "loading"
  | "load-error"
  | "list"
  | "create-name"
  | "create-shards"
  | "create-replicas"
  | "create-confirm"
  | "create-submitting"
  | "create-error"
  | "delete-confirm"
  | "delete-submitting"
  | "delete-error";

interface IndicesScreenProps {
  client: ControlPlaneClient;
  onBack: () => void;
}

interface Draft {
  name: string;
  shardsInput: string;
  replicasInput: string;
}

const EMPTY_DRAFT: Draft = { name: "", shardsInput: "", replicasInput: "" };

function healthDot(health: IndexSummary["health"]): string {
  if (health === "green") return chalk.green("●");
  if (health === "yellow") return chalk.yellow("●");
  return chalk.red("●");
}

/** Parses an optional numeric field: blank means "not set", so the request omits it. */
function parseOptionalCount(input: string): { ok: true; value: number | undefined } | { ok: false } {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: true, value: undefined };
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) return { ok: false };
  return { ok: true, value: parsed };
}

export function IndicesScreen({ client, onBack }: IndicesScreenProps): React.JSX.Element | null {
  const baseUrl = getApiBaseUrl();
  const [step, setStep] = useState<Step>("loading");
  const [indices, setIndices] = useState<IndexSummary[] | null>(null);
  const [error, setError] = useState<ApiErrorInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [validationError, setValidationError] = useState<string | null>(null);

  const load = (): void => {
    client
      .listIndices()
      .then((next) => {
        setIndices(next);
        setHighlighted(next[0]?.name ?? null);
        setError(null);
        setStep("list");
      })
      .catch((err: unknown) => {
        setError(describeApiError(err, baseUrl));
        setStep("load-error");
      });
  };

  useEffect(() => {
    load();
    // Runs once on entry; [r] below refetches explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = step === "create-submitting" || step === "delete-submitting";

  useInput((input, key) => {
    if (key.escape && !busy) {
      onBack();
      return;
    }
    if (step !== "list") return;
    if (input === "c") {
      setDraft(EMPTY_DRAFT);
      setValidationError(null);
      setStep("create-name");
    } else if (input === "d" && highlighted) {
      setDeleteTarget(highlighted);
      setStep("delete-confirm");
    } else if (input === "r") {
      setMessage(null);
      load();
    }
  });

  if (step === "loading") {
    return (
      <Box flexDirection="column">
        <Header title="Indices" />
        <Text>
          <Spinner type="dots" /> Loading indices...
        </Text>
      </Box>
    );
  }

  if (step === "load-error" && error) {
    return (
      <Box flexDirection="column">
        <Header title="Indices" />
        <ApiErrorView title={error.title} detail={error.detail} />
        <KeyHints hints={["[esc] back"]} />
      </Box>
    );
  }

  if (step === "list" && indices) {
    return (
      <Box flexDirection="column">
        <Header
          title="Indices"
          subtitle={`${indices.length} index${indices.length === 1 ? "" : "es"}`}
        />
        {message ? <Text color="green">{message}</Text> : null}
        {indices.length === 0 ? (
          <Text dimColor>No indices yet. Press [c] to create one.</Text>
        ) : (
          <SelectInput
            items={indices.map((index) => ({
              label: `${healthDot(index.health)} ${index.name.padEnd(24)} docs ${String(index.docsCount).padStart(8)}   ${formatBytes(index.storeSizeBytes).padStart(10)}   ${index.shards}x${index.replicas}`,
              value: index.name,
            }))}
            onHighlight={(item) => setHighlighted(item.value)}
            onSelect={(item) => {
              setDeleteTarget(item.value);
              setStep("delete-confirm");
            }}
          />
        )}
        <KeyHints hints={["[up/down] move", "[c] create", "[d/enter] delete selected", "[r] refresh", "[esc] back"]} />
      </Box>
    );
  }

  if (step === "create-name") {
    const trimmed = draft.name.trim();
    const nameValid = trimmed.length > 0 && INDEX_NAME_PATTERN.test(trimmed);
    return (
      <Box flexDirection="column">
        <Header title="Create index" subtitle="Lowercase letters, numbers, . _ -. Must not start empty." />
        <Box>
          <Text>Name: </Text>
          <TextInput
            value={draft.name}
            onChange={(value) => {
              setDraft((prev) => ({ ...prev, name: value }));
              setValidationError(null);
            }}
            onSubmit={() => {
              if (!nameValid) {
                setValidationError("Use lowercase letters, numbers, '.', '_' or '-', starting with one of those.");
                return;
              }
              setStep("create-shards");
            }}
          />
        </Box>
        {validationError ? <Text color="red">{validationError}</Text> : null}
        <KeyHints hints={["[enter] continue", "[esc] back"]} />
      </Box>
    );
  }

  if (step === "create-shards") {
    return (
      <Box flexDirection="column">
        <Header title="Create index" subtitle={`${draft.name.trim()} - shards (blank for default)`} />
        <Box>
          <Text>Shards: </Text>
          <TextInput
            value={draft.shardsInput}
            onChange={(value) => {
              setDraft((prev) => ({ ...prev, shardsInput: value }));
              setValidationError(null);
            }}
            onSubmit={() => {
              const parsed = parseOptionalCount(draft.shardsInput);
              if (!parsed.ok || parsed.value === 0) {
                setValidationError("Leave blank for the default, or enter a whole number of 1 or more.");
                return;
              }
              setStep("create-replicas");
            }}
            placeholder="1"
          />
        </Box>
        {validationError ? <Text color="red">{validationError}</Text> : null}
        <KeyHints hints={["[enter] continue", "[esc] back"]} />
      </Box>
    );
  }

  if (step === "create-replicas") {
    return (
      <Box flexDirection="column">
        <Header title="Create index" subtitle={`${draft.name.trim()} - replicas (blank for default)`} />
        <Box>
          <Text>Replicas: </Text>
          <TextInput
            value={draft.replicasInput}
            onChange={(value) => {
              setDraft((prev) => ({ ...prev, replicasInput: value }));
              setValidationError(null);
            }}
            onSubmit={() => {
              const parsed = parseOptionalCount(draft.replicasInput);
              if (!parsed.ok) {
                setValidationError("Leave blank for the default, or enter a whole number of 0 or more.");
                return;
              }
              setStep("create-confirm");
            }}
            placeholder="1"
          />
        </Box>
        {validationError ? <Text color="red">{validationError}</Text> : null}
        <KeyHints hints={["[enter] continue", "[esc] back"]} />
      </Box>
    );
  }

  if (step === "create-confirm") {
    const shards = parseOptionalCount(draft.shardsInput);
    const replicas = parseOptionalCount(draft.replicasInput);
    const shardsValue = shards.ok ? shards.value : undefined;
    const replicasValue = replicas.ok ? replicas.value : undefined;
    return (
      <Box flexDirection="column">
        <Header title="Create index - confirm" />
        <Text>
          Create <Text bold color="cyan">{draft.name.trim()}</Text> with shards{" "}
          <Text bold>{shardsValue ?? "default"}</Text> and replicas{" "}
          <Text bold>{replicasValue ?? "default"}</Text>?
        </Text>
        <SelectInput
          items={[
            { label: "Cancel", value: "cancel" as const },
            { label: "Confirm: create index", value: "confirm" as const },
          ]}
          onSelect={(item) => {
            if (item.value === "cancel") {
              setStep("create-name");
              return;
            }
            setStep("create-submitting");
            client
              .createIndex({ name: draft.name.trim(), shards: shardsValue, replicas: replicasValue })
              .then(() => {
                setMessage(`Created index "${draft.name.trim()}".`);
                load();
              })
              .catch((err: unknown) => {
                setError(describeApiError(err, baseUrl));
                setStep("create-error");
              });
          }}
        />
        <KeyHints hints={["[enter] select", "[esc] back"]} />
      </Box>
    );
  }

  if (step === "create-submitting") {
    return (
      <Box flexDirection="column">
        <Header title="Create index" />
        <Text>
          <Spinner type="dots" /> Creating index...
        </Text>
      </Box>
    );
  }

  if (step === "create-error" && error) {
    return (
      <Box flexDirection="column">
        <Header title="Create index - failed" />
        <ApiErrorView title={error.title} detail={error.detail} />
        <KeyHints hints={["[esc] back"]} />
      </Box>
    );
  }

  if (step === "delete-confirm" && deleteTarget) {
    return (
      <Box flexDirection="column">
        <Header title="Delete index" />
        <Text color="yellow">
          Delete <Text bold color="red">{deleteTarget}</Text>? This cannot be undone.
        </Text>
        <SelectInput
          items={[
            { label: "Cancel", value: "cancel" as const },
            { label: `Delete ${deleteTarget}`, value: "confirm" as const },
          ]}
          onSelect={(item) => {
            if (item.value === "cancel") {
              setStep("list");
              return;
            }
            setStep("delete-submitting");
            client
              .deleteIndex(deleteTarget)
              .then(() => {
                setMessage(`Deleted index "${deleteTarget}".`);
                load();
              })
              .catch((err: unknown) => {
                setError(describeApiError(err, baseUrl));
                setStep("delete-error");
              });
          }}
        />
        <KeyHints hints={["[enter] select", "[esc] back"]} />
      </Box>
    );
  }

  if (step === "delete-submitting") {
    return (
      <Box flexDirection="column">
        <Header title="Delete index" />
        <Text>
          <Spinner type="dots" /> Deleting index...
        </Text>
      </Box>
    );
  }

  if (step === "delete-error" && error) {
    return (
      <Box flexDirection="column">
        <Header title="Delete index - failed" />
        <ApiErrorView title={error.title} detail={error.detail} />
        <KeyHints hints={["[esc] back"]} />
      </Box>
    );
  }

  return null;
}
