"use client";

import { useEffect, useMemo, useState } from "react";

type TurnMatching = {
  scope?: "any" | "recent" | "current";
  evaluationStrategy?: "first_match" | "best_match" | "latest_match";
  recentTurnCount?: number;
};

type SubObjective = {
  description: string;
  isBlocking?: boolean;
  instructions?: string;
  satisfactionCriteria?: string[];
  maxTurnsForObjective?: number;
  turnMatching?: TurnMatching;
};

type CompositeObjective = {
  name?: string;
  description?: string;
  persona: string;
  userVariables?: Record<string, string>;
  subObjectives: SubObjective[];
};

// ✅ Default is now DELIBERATELY VAGUE
const defaultComposite: CompositeObjective = {
  name: "Telecom Support – Vague Extra Charge Question",
  description:
    "Very rough, underspecified objective: customer has noticed an extra charge and asks about it.",
  persona: "Postpaid telecom customer in Ireland",
  userVariables: {
    account_type: "postpaid",
    billing_cycle: "monthly",
    currency: "EUR",
  },
  subObjectives: [
    {
      description:
        'Check how the chatbot handles a vague billing question like "What is this extra charge?" when the customer gives almost no context.',
      isBlocking: true,
      maxTurnsForObjective: 8,
      turnMatching: {
        scope: "any",
        evaluationStrategy: "first_match",
      },
    },
  ],
};

const emptySubObjective = (): SubObjective => ({
  description: "",
  isBlocking: false,
  maxTurnsForObjective: 12,
  turnMatching: {
    scope: "any",
    evaluationStrategy: "first_match",
  },
});

// For pretty text rendering of the model result
type ObjectiveResult = {
  originalDescription?: string;
  primarySuggestion?: string;
  alternativeSuggestion?: string;
};

type ModelResult = {
  error?: string;
  objectives?: ObjectiveResult[];
  notes?: string;
  [key: string]: any;
};

export default function Page() {
  const [mode, setMode] = useState<"json" | "form">("form");
  const [outputMode, setOutputMode] = useState<"text" | "json">("text");

  // Source-of-truth state for form mode
  const [formState, setFormState] =
    useState<CompositeObjective>(defaultComposite);

  // JSON textarea state
  const [jsonText, setJsonText] = useState<string>(() =>
    JSON.stringify(defaultComposite, null, 2)
  );

  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const payloadToSubmit = useMemo<CompositeObjective>(() => {
    if (mode === "json") {
      try {
        return JSON.parse(jsonText);
      } catch {
        // invalid JSON – we'll let the API return a proper error
        return formState;
      }
    }
    return formState;
  }, [mode, jsonText, formState]);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToSubmit),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }

      setResult(data);
      // default to text mode when new result arrives
      setOutputMode("text");
    } catch (err: any) {
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function switchToJson() {
    setJsonText(JSON.stringify(formState, null, 2));
    setMode("json");
  }

  function switchToForm() {
    try {
      const obj = JSON.parse(jsonText);
      setFormState(obj);
    } catch {
      // ignore parse error, keep existing formState
    }
    setMode("form");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 16px",
        background: "#f5f5f7",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          background: "white",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>
            Objective Recommender
          </h1>
          <p style={{ color: "#555", maxWidth: 720 }}>
            Enter a Composite Objective either as raw JSON or via the structured
            form. Both modes produce the same JSON payload that is sent to the
            Bedrock Prompt Critic.
          </p>
        </header>

        {/* Mode Switch */}
        <div
          style={{
            display: "inline-flex",
            borderRadius: 999,
            border: "1px solid #ddd",
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          <button
            onClick={switchToJson}
            disabled={mode === "json"}
            style={{
              padding: "6px 14px",
              border: "none",
              background: mode === "json" ? "#111" : "transparent",
              color: mode === "json" ? "#fff" : "#333",
              cursor: mode === "json" ? "default" : "pointer",
              fontSize: 14,
            }}
          >
            JSON
          </button>
          <button
            onClick={switchToForm}
            disabled={mode === "form"}
            style={{
              padding: "6px 14px",
              border: "none",
              background: mode === "form" ? "#111" : "transparent",
              color: mode === "form" ? "#fff" : "#333",
              cursor: mode === "form" ? "default" : "pointer",
              fontSize: 14,
            }}
          >
            Form
          </button>
        </div>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 2fr",
            gap: 20,
          }}
        >
          <div>
            {mode === "json" ? (
              <div>
                <label
                  style={{
                    fontWeight: 600,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  CompositeObjective JSON
                </label>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={22}
                  style={{
                    width: "100%",
                    fontFamily: "monospace",
                    fontSize: 13,
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    resize: "vertical",
                  }}
                />
                <p
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#666",
                  }}
                >
                  Top-level shape:
                </p>
                <pre
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #eee",
                    background: "#fafafa",
                    overflowX: "auto",
                    marginTop: 4,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
{`{
  "name": "string (optional)",
  "description": "string (optional)",
  "persona": "string (required)",
  "userVariables": { "key": "value" },
  "subObjectives": [ /* see sub-objective schema below */ ]
}`}
                </pre>
                <p
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: "#666",
                  }}
                >
                  Each item in <code>subObjectives</code> should follow:
                </p>
                <pre
                  style={{
                    fontFamily: "monospace",
                    fontSize: 12,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #eee",
                    background: "#fafafa",
                    overflowX: "auto",
                    marginTop: 4,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
{`{
  "description": "string",           // Required: What should be achieved
  "isBlocking": boolean,             // Optional: If true, failure stops the test (default: false)
  "instructions": "string",          // Optional: Special instructions for evaluation
  "maxTurnsForObjective": number,    // Optional: Maximum turns for a sub objective (default: 12) 
  "turnMatching": {                  // Optional: Configure flexible turn-based objective matching
    "scope": "any | recent | current",              // Default: "any"
    "evaluationStrategy": "first_match | best_match | latest_match",  // Default: "first_match"
    "recentTurnCount": number        // Required when scope='recent'
  }
}`}
                </pre>
              </div>
            ) : (
              <FormEditor value={formState} onChange={setFormState} />
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: "none",
                  background: loading ? "#888" : "#111",
                  color: "#fff",
                  cursor: loading ? "wait" : "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {loading ? "Generating..." : "Generate Recommendation"}
              </button>

              <button
                type="button"
                onClick={() =>
                  console.log("Payload to submit:", payloadToSubmit)
                }
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: "1px solid #ccc",
                  background: "#fafafa",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Log payload to console
              </button>
            </div>

            {error && (
              <p
                style={{
                  color: "crimson",
                  marginTop: 10,
                  fontSize: 13,
                }}
              >
                {error}
              </p>
            )}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <h2 style={{ fontSize: 16 }}>Model Output</h2>

              {/* Output mode toggle: Text / JSON */}
              <div
                style={{
                  display: "inline-flex",
                  borderRadius: 999,
                  border: "1px solid #ddd",
                  overflow: "hidden",
                  fontSize: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => setOutputMode("text")}
                  disabled={outputMode === "text"}
                  style={{
                    padding: "4px 10px",
                    border: "none",
                    background:
                      outputMode === "text" ? "#111" : "transparent",
                    color: outputMode === "text" ? "#fff" : "#333",
                    cursor:
                      outputMode === "text" ? "default" : "pointer",
                  }}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setOutputMode("json")}
                  disabled={outputMode === "json"}
                  style={{
                    padding: "4px 10px",
                    border: "none",
                    background:
                      outputMode === "json" ? "#111" : "transparent",
                    color: outputMode === "json" ? "#fff" : "#333",
                    cursor:
                      outputMode === "json" ? "default" : "pointer",
                  }}
                >
                  JSON
                </button>
              </div>
            </div>

            {outputMode === "json" ? (
              <pre
                style={{
                  width: "100%",
                  height: 380,
                  fontFamily: "monospace",
                  fontSize: 13,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fafafa",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {result
                  ? JSON.stringify(result, null, 2)
                  : "No result yet."}
              </pre>
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 380,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "#fafafa",
                  overflow: "auto",
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                <TextResultView result={result} />
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function TextResultView({ result }: { result: unknown }) {
  if (!result) {
    return <p style={{ color: "#666" }}>No result yet.</p>;
  }

  const r = result as ModelResult;

  if (r.error) {
    return (
      <p style={{ color: "crimson" }}>
        Error from model: <strong>{r.error}</strong>
      </p>
    );
  }

  const objectives = Array.isArray(r.objectives) ? r.objectives : [];

  if (!objectives.length && !r.notes) {
    return (
      <div>
        <p style={{ color: "#666" }}>
          Model returned an unexpected structure. Switch to JSON view to
          inspect the raw response.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {objectives.map((obj, idx) => (
        <div
          key={idx}
          style={{
            padding: 8,
            borderRadius: 8,
            background: "#fff",
            border: "1px solid #e3e3e3",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4,
              color: "#333",
            }}
          >
            Objective {idx + 1}
          </div>
          {obj.originalDescription && (
            <p style={{ margin: 0, fontSize: 12, color: "#555" }}>
              <strong>Original:</strong> {obj.originalDescription}
            </p>
          )}
          {obj.primarySuggestion && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#111" }}>
              <strong>Primary suggestion:</strong>{" "}
              {obj.primarySuggestion}
            </p>
          )}
          {obj.alternativeSuggestion && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#333" }}>
              <strong>Alternative suggestion:</strong>{" "}
              {obj.alternativeSuggestion}
            </p>
          )}
        </div>
      ))}

      {r.notes && (
        <div
          style={{
            padding: 8,
            borderRadius: 8,
            background: "#fff",
            border: "1px solid #e3e3e3",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4,
              color: "#333",
            }}
          >
            Notes
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#333" }}>{r.notes}</p>
        </div>
      )}
    </div>
  );
}

function FormEditor({
  value,
  onChange,
}: {
  value: CompositeObjective;
  onChange: (v: CompositeObjective) => void;
}) {
  function set<K extends keyof CompositeObjective>(
    key: K,
    v: CompositeObjective[K]
  ) {
    onChange({ ...value, [key]: v });
  }

  function updateSub(i: number, patch: Partial<SubObjective>) {
    const next = value.subObjectives.map((s, idx) =>
      idx === i ? { ...s, ...patch } : s
    );
    set("subObjectives", next);
  }

  function addSub() {
    set("subObjectives", [...value.subObjectives, emptySubObjective()]);
  }

  function removeSub(i: number) {
    const next = value.subObjectives.filter((_, idx) => idx !== i);
    set("subObjectives", next.length ? next : [emptySubObjective()]);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <h2 style={{ fontSize: 16 }}>Composite Objective (Form)</h2>

      <label>
        <span style={{ fontSize: 13 }}>Name (optional)</span>
        <input
          value={value.name ?? ""}
          onChange={(e) => set("name", e.target.value)}
          style={{
            width: "100%",
            padding: 6,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />
      </label>

      <label>
        <span style={{ fontSize: 13 }}>Description (optional)</span>
        <input
          value={value.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          style={{
            width: "100%",
            padding: 6,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />
      </label>

      <label>
        <span style={{ fontSize: 13 }}>Persona (required)</span>
        <input
          value={value.persona}
          onChange={(e) => set("persona", e.target.value)}
          style={{
            width: "100%",
            padding: 6,
            borderRadius: 8,
            border: "1px solid #ddd",
          }}
        />
      </label>

      <UserVariablesEditor
        value={value.userVariables ?? {}}
        onChange={(uv) => set("userVariables", uv)}
      />

      <h3 style={{ fontSize: 14, marginTop: 6 }}>Sub-Objectives (min 1)</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {value.subObjectives.map((sub, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #e3e3e3",
              borderRadius: 10,
              padding: 10,
              background: "#fcfcfc",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <strong style={{ fontSize: 13 }}>Sub-objective {i + 1}</strong>
              <button
                type="button"
                onClick={() => removeSub(i)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#c00",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>

            <label>
              <span style={{ fontSize: 13 }}>Description (required)</span>
              <textarea
                value={sub.description}
                onChange={(e) =>
                  updateSub(i, { description: e.target.value })
                }
                rows={3}
                style={{
                  width: "100%",
                  padding: 6,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  fontFamily: "inherit",
                  fontSize: 13,
                }}
              />
            </label>

            <label
              style={{ display: "block", marginTop: 6, fontSize: 13 }}
            >
              <input
                type="checkbox"
                checked={!!sub.isBlocking}
                onChange={(e) =>
                  updateSub(i, { isBlocking: e.target.checked })
                }
                style={{ marginRight: 6 }}
              />
              isBlocking (default false)
            </label>

            <label>
              <span style={{ fontSize: 13 }}>Instructions (optional)</span>
              <input
                value={sub.instructions ?? ""}
                onChange={(e) =>
                  updateSub(i, { instructions: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: 6,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
            </label>

            <label>
              <span style={{ fontSize: 13 }}>Max turns (default 12)</span>
              <input
                type="number"
                value={sub.maxTurnsForObjective ?? 12}
                onChange={(e) =>
                  updateSub(i, {
                    maxTurnsForObjective: Number(e.target.value),
                  })
                }
                style={{
                  width: 140,
                  padding: 6,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                }}
              />
            </label>

            <TurnMatchingEditor
              value={sub.turnMatching}
              onChange={(tm) => updateSub(i, { turnMatching: tm })}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSub}
        style={{
          marginTop: 4,
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px dashed #bbb",
          background: "#fafafa",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        + Add sub-objective
      </button>
    </div>
  );
}

/**
 * UserVariablesEditor – UX-friendly version
 * - Internally uses rows with IDs so deleting doesn't fight typing
 * - Only syncs non-empty keys back to parent Record<string,string>
 */
type UserVarRow = { id: number; key: string; value: string };

function UserVariablesEditor({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const [rows, setRows] = useState<UserVarRow[]>([]);

  // Initialise / sync rows from parent value
  useEffect(() => {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      setRows([]);
      return;
    }
    const nextRows: UserVarRow[] = entries.map(([k, v], idx) => ({
      id: idx + 1,
      key: k,
      value: v,
    }));
    setRows(nextRows);
  }, [value]);

  function syncToParent(nextRows: UserVarRow[]) {
    const record: Record<string, string> = {};
    for (const r of nextRows) {
      if (r.key.trim()) {
        record[r.key.trim()] = r.value;
      }
    }
    onChange(record);
  }

  function handleKeyChange(id: number, newKey: string) {
    const nextRows = rows.map((r) =>
      r.id === id ? { ...r, key: newKey } : r
    );
    setRows(nextRows);
    syncToParent(nextRows);
  }

  function handleValueChange(id: number, newValue: string) {
    const nextRows = rows.map((r) =>
      r.id === id ? { ...r, value: newValue } : r
    );
    setRows(nextRows);
    syncToParent(nextRows);
  }

  function addRow() {
    const maxId = rows.reduce((m, r) => Math.max(m, r.id), 0);
    const newRow: UserVarRow = {
      id: maxId + 1,
      key: "",
      value: "",
    };
    const nextRows = [...rows, newRow];
    setRows(nextRows);
    // Empty key -> nothing to sync yet
  }

  function removeRow(id: number) {
    const nextRows = rows.filter((r) => r.id !== id);
    setRows(nextRows);
    syncToParent(nextRows);
  }

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 10,
        padding: 10,
        marginTop: 4,
      }}
    >
      <strong style={{ fontSize: 13 }}>User Variables (optional)</strong>

      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            display: "flex",
            gap: 6,
            marginTop: 8,
          }}
        >
          <input
            placeholder="key"
            value={row.key}
            onChange={(e) => handleKeyChange(row.id, e.target.value)}
            style={{
              padding: 5,
              borderRadius: 8,
              border: "1px solid #ddd",
              minWidth: 100,
            }}
          />
          <input
            placeholder="value"
            value={row.value}
            onChange={(e) => handleValueChange(row.id, e.target.value)}
            style={{
              padding: 5,
              borderRadius: 8,
              border: "1px solid #ddd",
              flex: 1,
            }}
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            style={{
              border: "none",
              background: "transparent",
              color: "#c00",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        </div>
      ))}

      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px dashed #bbb",
            background: "#fafafa",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          + Add variable
        </button>
      </div>
    </div>
  );
}

function TurnMatchingEditor({
  value,
  onChange,
}: {
  value?: TurnMatching;
  onChange: (v?: TurnMatching) => void;
}) {
  const tm: TurnMatching = value ?? {
    scope: "any",
    evaluationStrategy: "first_match",
  };

  return (
    <div
      style={{
        border: "1px dashed #ddd",
        borderRadius: 8,
        padding: 8,
        marginTop: 8,
      }}
    >
      <strong style={{ fontSize: 13 }}>Turn Matching (optional)</strong>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 6,
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontSize: 13 }}>
          scope
          <select
            value={tm.scope ?? "any"}
            onChange={(e) =>
              onChange({
                ...tm,
                scope: e.target.value as TurnMatching["scope"],
              })
            }
            style={{
              marginLeft: 6,
              padding: 4,
              borderRadius: 6,
              border: "1px solid #ddd",
            }}
          >
            <option value="any">any</option>
            <option value="recent">recent</option>
            <option value="current">current</option>
          </select>
        </label>

        <label style={{ fontSize: 13 }}>
          evaluationStrategy
          <select
            value={tm.evaluationStrategy ?? "first_match"}
            onChange={(e) =>
              onChange({
                ...tm,
                evaluationStrategy:
                  e.target.value as TurnMatching["evaluationStrategy"],
              })
            }
            style={{
              marginLeft: 6,
              padding: 4,
              borderRadius: 6,
              border: "1px solid #ddd",
            }}
          >
            <option value="first_match">first_match</option>
            <option value="best_match">best_match</option>
            <option value="latest_match">latest_match</option>
          </select>
        </label>

        {tm.scope === "recent" && (
          <label style={{ fontSize: 13 }}>
            recentTurnCount
            <input
              type="number"
              value={tm.recentTurnCount ?? 3}
              onChange={(e) =>
                onChange({
                  ...tm,
                  recentTurnCount: Number(e.target.value),
                })
              }
              style={{
                marginLeft: 6,
                padding: 4,
                borderRadius: 6,
                border: "1px solid #ddd",
                width: 80,
              }}
            />
          </label>
        )}
      </div>

      <div style={{ marginTop: 6 }}>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #ddd",
            background: "#fafafa",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Remove turnMatching
        </button>
      </div>
    </div>
  );
}
