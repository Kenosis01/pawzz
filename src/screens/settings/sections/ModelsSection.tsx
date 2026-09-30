"use client";

import { useMemo, useState } from "react";

import { SquishSwitch } from "../../../components/ui/SquishSwitch";
import { useModelCatalogue } from "../../../lib/model-catalogue-context";
import { useModelPreference } from "../../../lib/model-preference";
import { AUTO, AUTO_DESCRIPTION, type Model } from "../../../lib/models";
import styles from "../SettingsPage.module.css";

/**
 * Model preferences (PRD §38).
 *
 * Two jobs, deliberately separated:
 *
 *   - the default model, which is one choice out of the enabled set;
 *   - which models are enabled at all.
 *
 * The second is what makes the first usable. OpenRouter publishes a few hundred
 * chat models, and a picker listing all of them is a directory, not a choice — so
 * the enabled set is curated here, and the composer offers exactly what is
 * switched on.
 *
 * The list is fetched, not written down (see `lib/models.ts`). Auto is the one
 * exception: it is a routing mode rather than a model, is pinned first, and
 * cannot be switched off.
 */

/** Rows rendered before the list is windowed. */
const PAGE = 60;

export function ModelsSection() {
  const {
    models,
    loading,
    error,
    enabled,
    enabledCount,
    isEnabled,
    setEnabled,
    enableAll,
    autoOnly,
  } = useModelCatalogue();
  const { modelId, setModelId } = useModelPreference();

  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<string>("all");
  const [limit, setLimit] = useState(PAGE);

  const providers = useMemo(() => {
    const set = new Set<string>();
    for (const model of models) set.add(model.provider);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [models]);

  const matches = useMemo(
    () => filterModels(models, query, provider),
    [models, query, provider],
  );

  // The default can only be an enabled model. Switching a model off while it is
  // the default moves the default to Auto, rather than leaving the composer
  // pointing at something the picker no longer offers.
  const onToggle = (model: Model, on: boolean) => {
    setEnabled(model.id, on);
    if (!on && modelId === model.id) setModelId(AUTO.id);
  };

  const shown = matches.slice(0, limit);

  return (
    <div className={styles.page}>
      <section>
        <h2 className={styles.heading}>Default model</h2>
        <p className={styles.sub}>The model each new prompt starts on.</p>
        <p className={styles.note}>
          Auto is the default for a reason (PRD §3.4): most people should never
          have to think about which model answers. Pick a specific one if you
          want a consistent voice, or if you are comparing two on the same task.
        </p>

        {/* A select, not a radio list. The enabled set is whatever the user
            chose to leave on and defaults to all 458 models, so a list of rows
            would be 458 rows of scrolling standing between the reader and the
            switch they came for. A select is one line, and browsers filter it
            as you type. */}
        <div className={styles.defaultRow}>
          <select
            className={styles.select}
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            aria-label="Default model"
          >
            {enabled.map((model) => (
              <option key={model.id} value={model.id}>
                {model.id === AUTO.id
                  ? `${model.name} — ${AUTO_DESCRIPTION}`
                  : `${model.name} · ${model.provider}`}
              </option>
            ))}
          </select>
          {enabled.length === 0 ? (
            <p className={styles.rowHint}>
              Auto is the only model enabled. Switch more on below.
            </p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className={styles.heading}>Available models</h2>
        <p className={styles.sub}>
          {loading
            ? "Loading models…"
            : `${enabledCount} of ${models.length} switched on. The composer offers only these.`}
        </p>
        <p className={styles.note}>
          Every model OpenRouter publishes is listed here, each with a switch.
          What you switch on is the only thing the composer&apos;s dropdown
          shows, so it stays a shortlist instead of a directory of 458 entries.
          Start with Auto alone and add a few; a new model released upstream
          appears here switched off rather than landing in your dropdown.
        </p>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.filters}>
          <input
            type="search"
            className={styles.textInput}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search models or providers"
            aria-label="Search models"
          />

          <select
            className={styles.select}
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
            aria-label="Filter by provider"
          >
            <option value="all">All providers</option>
            {providers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className={styles.button}
            onClick={enableAll}
            disabled={enabledCount === models.length}
            title={
              enabledCount === models.length
                ? "Every model is already on"
                : undefined
            }
          >
            Switch all on
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={autoOnly}
            disabled={enabledCount === 1}
            title={enabledCount === 1 ? "Auto is the only one on" : undefined}
          >
            Auto only
          </button>
        </div>

        {!loading && models.length ? (
          <ul className={styles.modelList}>
            {shown.map((model) => {
              const on = isEnabled(model.id);
              return (
                <li key={model.id} className={styles.modelRow}>
                  <span className={styles.modelText}>
                    <span className={styles.modelName}>
                      {model.name}
                      {model.modality === "vision" ? (
                        <span className={styles.tag}>vision</span>
                      ) : null}
                      {model.reasoning ? (
                        <span className={styles.tag}>reasoning</span>
                      ) : null}
                    </span>
                    <span className={styles.modelHint}>
                      {model.provider} · {describe(model)}
                    </span>
                  </span>

                  <SquishSwitch
                    checked={on}
                    disabled={model.id === AUTO.id}
                    onChange={(next) => onToggle(model, next)}
                    ariaLabel={`${on ? "Disable" : "Enable"} ${model.name}`}
                  />
                </li>
              );
            })}

            {matches.length > shown.length ? (
              <li className={styles.modelMore}>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => setLimit((current) => current + PAGE * 4)}
                >
                  Show {Math.min(PAGE * 4, matches.length - shown.length)} more of{" "}
                  {matches.length - shown.length}
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}

        {matches.length === 0 && !loading && models.length ? (
          <p className={styles.empty}>No models match “{query}”.</p>
        ) : null}

        {loading ? <p className={styles.empty}>Loading models…</p> : null}
        {!loading && !error && models.length === 0 ? (
          <p className={styles.empty}>
            No models are available. Auto still works.
          </p>
        ) : null}
      </section>

      <section>
        <h2 className={styles.heading}>Effort</h2>
        <p className={styles.sub}>How thoroughly a model should answer.</p>
        <p className={styles.note}>
          Set from the composer&rsquo;s model menu, which flies the ladder out
          beside the catalogue. Higher effort is more thorough and slower, and
          spends your limits faster; Max is flagged because it costs several
          times the others. Thinking lets a model reason for longer on the hard
          cases only.
        </p>
      </section>
    </div>
  );
}

/** The one-line summary under a name: the facts a row has room for. */
function describe(model: Model): string {
  const bits: string[] = [];
  if (model.id === AUTO.id) return AUTO_DESCRIPTION;
  if (model.contextLength) {
    bits.push(`${Math.round(model.contextLength / 1000)}k context`);
  }
  if (model.priceIn === 0 && model.priceOut === 0) {
    bits.push("free");
  } else {
    bits.push(`$${model.priceIn.toFixed(2)}/$${model.priceOut.toFixed(2)} per Mtok`);
  }
  return bits.join(" · ");
}

/**
 * Filtering, split out because the search runs on every keystroke over a few
 * hundred rows and there is no reason for that work to re-render the switches.
 */
function filterModels(
  models: Model[],
  query: string,
  provider: string,
): Model[] {
  const needle = query.trim().toLowerCase();
  return models.filter((model) => {
    if (provider !== "all" && model.provider !== provider) return false;
    if (!needle) return true;
    return (
      model.name.toLowerCase().includes(needle) ||
      model.id.toLowerCase().includes(needle) ||
      model.provider.toLowerCase().includes(needle)
    );
  });
}
