"use client";

import { useCallback, useEffect, useState } from "react";

import { useModelCatalogue } from "./model-catalogue-context";
import { AUTO, type Model } from "./models";

const STORAGE_KEY = "pawzz.model";
const EFFORT_KEY = "pawzz.effort";
const THINKING_KEY = "pawzz.thinking";

/** Effort ladder, in the order the flyout lists them. */
export const EFFORTS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium", badge: "Default" },
  { id: "high", label: "High" },
  { id: "extra", label: "Extra" },
  { id: "max", label: "Max" },
] as const;

export type EffortId = (typeof EFFORTS)[number]["id"];

export const DEFAULT_EFFORT: EffortId = "medium";

function isEffort(value: string | null): value is EffortId {
  return EFFORTS.some((effort) => effort.id === value);
}

/**
 * The model the composer starts on, shared between the composer's picker and
 * Settings → Models.
 *
 * Holds an *id*, not a `Model`. The catalogue is fetched, so no `Model` exists
 * at first render, and persisting the object would save a name and a price that
 * are stale the moment the catalogue is refetched. The id is the stable part;
 * `model` is derived from it on the way out.
 *
 * Starts at Auto and hydrates in an effect rather than reading storage in a
 * `useState` initialiser, for the same reason as the theme: there is no storage
 * during a server render, and a first render that disagreed with the client's
 * would be a hydration mismatch on the composer.
 */
export function useModelPreference(): {
  /** The selected id, as stored. */
  modelId: string;
  /** The selected model, resolved against the catalogue. */
  model: Model;
  setModelId: (id: string) => void;
  effort: EffortId;
  setEffort: (effort: EffortId) => void;
  thinking: boolean;
  setThinking: (on: boolean) => void;
  /** False until storage has been read. */
  hydrated: boolean;
} {
  const { resolve } = useModelCatalogue();

  const [modelId, setModelIdState] = useState(AUTO.id);
  const [effort, setEffortState] = useState<EffortId>(DEFAULT_EFFORT);
  const [thinking, setThinkingState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setModelIdState(stored);

      const storedEffort = localStorage.getItem(EFFORT_KEY);
      if (isEffort(storedEffort)) setEffortState(storedEffort);

      setThinkingState(localStorage.getItem(THINKING_KEY) === "1");
    } catch {
      // Blocked storage: the defaults are fine answers.
    }
    setHydrated(true);
  }, []);

  const setModelId = useCallback((next: string) => {
    setModelIdState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice applies to this session even if it cannot be remembered.
    }
  }, []);

  const setEffort = useCallback((next: EffortId) => {
    setEffortState(next);
    try {
      localStorage.setItem(EFFORT_KEY, next);
    } catch {
      // Applies for the session even if it cannot be remembered.
    }
  }, []);

  const setThinking = useCallback((next: boolean) => {
    setThinkingState(next);
    try {
      localStorage.setItem(THINKING_KEY, next ? "1" : "0");
    } catch {
      // Same.
    }
  }, []);

  return {
    modelId,
    // Resolved through the catalogue so callers always get a real `Model`, even
    // before the fetch lands. An id the catalogue does not know — a withdrawn
    // model, or a stale stored preference — resolves to Auto rather than
    // undefined, which is also the right answer: it still works.
    model: resolve(modelId),
    setModelId,
    effort,
    setEffort,
    thinking,
    setThinking,
    hydrated,
  };
}
