"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AUTO, type Model } from "./models";

/**
 * The model catalogue, and which of it the user wants to see.
 *
 * The list is fetched (see `/api/models`); this is the client's half — holding
 * it, and holding the answer to "which models are switched on".
 *
 * The **enabled** ids are stored, not the disabled ones — the opposite of the
 * obvious choice, and deliberate. OpenRouter publishes ~458 answerable models, so
 * "everything on" is not a usable default: the composer's picker becomes a
 * directory rather than a choice. Storing the enabled set makes the default a
 * one-item shortlist (Auto), and the picker stays a shortlist that grows as
 * somebody curates it in Settings.
 *
 * The cost is that a model released tomorrow arrives switched off. That is the
 * right trade here: it shows up in Settings, where the whole catalogue is listed
 * with a toggle, rather than silently becoming one of 458 options in a dropdown.
 */

const ENABLED_KEY = "pawzz.models.enabled.v1";
const CATALOGUE_URL = "/api/models";

type CatalogueState = {
  models: Model[];
  /** False until the fetch settles, so a first paint is not an empty picker. */
  loading: boolean;
  /** Set when the fetch failed. The list is then empty rather than wrong. */
  error: string | null;
  enabled: Model[];
  isEnabled: (id: string) => boolean;
  setEnabled: (id: string, on: boolean) => void;
  /** Switches every model on. */
  enableAll: () => void;
  /** Back to just Auto — the state a new user starts in. */
  autoOnly: () => void;
  enabledCount: number;
  /**
   * Replaces a model by id, returning the object when it is still known.
   *
   * The composer's picker stores a model id, not a model. On a later render the
   * catalogue may not have arrived yet, and handing a caller `undefined` where it
   * asked for a `Model` would push that null check into every consumer.
   */
  resolve: (id: string) => Model;
};

const ModelCatalogueContext = createContext<CatalogueState | null>(null);

/**
 * The enabled ids, or `null` when the user has never chosen.
 *
 * `null` is distinct from `[]` and is the important case: no stored choice means
 * the shortlist has not been curated yet, so it starts as Auto alone. An empty
 * array would mean "the user switched everything off", which is not the same
 * thing and is a state the UI must not silently treat as the default.
 */
function readEnabled(): string[] | null {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    // Blocked or corrupt storage. Treated as uncurated rather than as "off",
    // because a wrong default that hides every model is much harder to notice
    // than a wrong default that shows a few.
    return null;
  }
}

export function ModelCatalogueProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabledIds, setEnabledIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    setEnabledIds(new Set(readEnabled() ?? [AUTO.id]));
  }, []);

  // An abort controller so a remount mid-flight does not set state on a dead
  // component, and so navigating away actually stops the transfer.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    // Marked void: the IIFE handles its own errors and its result is never
    // needed, so there is nothing for a caller to await.
    void (async () => {
      try {
        const response = await fetch(CATALOGUE_URL, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        const payload: unknown = await response.json();
        const list = (payload as { models?: unknown }).models;
        if (!Array.isArray(list)) throw new Error("bad shape");

        const parsed: Model[] = list.filter(
          (entry): entry is Model =>
            typeof entry === "object" &&
            entry !== null &&
            typeof (entry as { id?: unknown }).id === "string",
        );
        if (!parsed.length) throw new Error("empty catalogue");

        if (active) {
          setModels(parsed);
          setError(null);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        if (active) {
          setError(
            cause instanceof Error && cause.message === "bad shape"
              ? "The model catalogue came back in an unexpected shape."
              : "Could not load models. Check your connection.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  /**
   * Writes the shortlist.
   *
   * Auto is always added back rather than trusted to be present. It is a routing
   * mode, not a row in the list, and the composer must never be left with nothing
   * to fall back on — so a storage value that has lost it is repaired here instead
   * of being allowed to produce an empty picker.
   */
  const commit = useCallback((next: Set<string>) => {
    const withAuto = new Set(next);
    withAuto.add(AUTO.id);
    setEnabledIds(withAuto);
    try {
      localStorage.setItem(ENABLED_KEY, JSON.stringify([...withAuto]));
    } catch {
      // The choice applies for the session even if it cannot be remembered.
    }
  }, []);

  const setEnabled = useCallback(
    (id: string, on: boolean) => {
      if (id === AUTO.id) return;
      setEnabledIds((current) => {
        const next = new Set(current ?? [AUTO.id]);
        if (on) next.add(id);
        else next.delete(id);
        // Added to the set, not appended to the array. Appending left a second
        // "openrouter/auto" in storage every time, which is harmless to a Set and
        // visible in devtools as a bug in a preference nobody asked to inspect.
        next.add(AUTO.id);
        try {
          localStorage.setItem(ENABLED_KEY, JSON.stringify([...next]));
        } catch {
          // The choice applies for the session even if it cannot be remembered.
        }
        return next;
      });
    },
    [],
  );

  const enableAll = useCallback(() => {
    commit(new Set(models.map((model) => model.id)));
  }, [commit, models]);

  const autoOnly = useCallback(() => {
    commit(new Set());
  }, [commit]);

  const value = useMemo<CatalogueState>(() => {
    // Before hydration the set is null, which reads as "nothing enabled yet" and
    // leaves the picker showing only Auto. That is the correct first paint: the
    // default state, rather than an empty box that reads as a failure.
    const isOn = (id: string) => (enabledIds?.has(id) ?? id === AUTO.id);

    return {
      models,
      loading,
      error,
      enabled: models.filter((model) => isOn(model.id)),
      isEnabled: isOn,
      setEnabled,
      enableAll,
      autoOnly,
      enabledCount: models.filter((model) => isOn(model.id)).length,
      resolve: (id) => models.find((model) => model.id === id) ?? AUTO,
    };
  }, [models, loading, error, enabledIds, setEnabled, enableAll, autoOnly]);

  return (
    <ModelCatalogueContext.Provider value={value}>
      {children}
    </ModelCatalogueContext.Provider>
  );
}

export function useModelCatalogue(): CatalogueState {
  const value = useContext(ModelCatalogueContext);
  if (!value) {
    throw new Error(
      "useModelCatalogue must be used inside ModelCatalogueProvider",
    );
  }
  return value;
}
