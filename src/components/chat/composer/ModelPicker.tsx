"use client";

import { useState } from "react";

import Link from "next/link";

import { cn } from "../../../lib/cn";
import {
  EFFORTS,
  type EffortId,
} from "../../../lib/model-preference";
import { useModelCatalogue } from "../../../lib/model-catalogue-context";
import { AUTO, AUTO_DESCRIPTION, type Model } from "../../../lib/models";
import { CheckIcon, ChevronRightIcon } from "../../icons/Icons";
import styles from "../Composer.module.css";

/**
 * The model picker.
 *
 * Lives in the row beneath the box rather than inside it. A model name inside a
 * one-line prompt would take the width the prompt needs, and the box changes
 * height once a message is sent — a control that moved at that moment would be
 * disorienting. Anchoring it to one row below keeps it fixed.
 */
export function ModelPicker({
  model,
  open,
  onToggle,
  onPick,
  effort,
  onEffort,
  effortOpen,
  onEffortOpen,
  thinking,
  onThinking,
  anchorRef,
  clearBy,
}: {
  model: Model;
  open: boolean;
  onToggle: () => void;
  onPick: (model: Model) => void;
  effort: EffortId;
  onEffort: (effort: EffortId) => void;
  effortOpen: boolean;
  onEffortOpen: () => void;
  thinking: boolean;
  onThinking: (on: boolean) => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Extra height the panel must clear before it reaches the top of the screen —
   * the composer's card, when the picker sits below it. Zero when the picker is
   * inside the card and already clears it.
   */
  clearBy?: number;
}) {
  const effortLabel =
    EFFORTS.find((option) => option.id === effort)?.label ?? "Medium";

  const { enabled, enabledCount, loading } = useModelCatalogue();
  const [query, setQuery] = useState("");

  // Filtered rather than paged: the enabled set is small by design, and a search
  // box that silently stopped at 60 rows would look like the list was shorter
  // than it is.
  const needle = query.trim().toLowerCase();
  const rows = needle
    ? enabled.filter(
        (option) =>
          option.name.toLowerCase().includes(needle) ||
          option.id.toLowerCase().includes(needle) ||
          option.provider.toLowerCase().includes(needle),
      )
    : enabled;

  return (
    <div
      className={styles.modelAnchor}
      ref={anchorRef}
      data-effort-open={effortOpen}
      // Published as a custom property so the panel can offset itself without a
      // wrapper, and so the value shows up in devtools next to the element it
      // moves. Typed as a loose record because React's CSSProperties has no
      // index signature for custom properties.
      style={
        clearBy
          ? ({ "--panel-clear": `${clearBy}px` } as React.CSSProperties)
          : undefined
      }
    >
      <button
        type="button"
        className={cn(styles.modelButton, open && styles.modelButtonOpen)}
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-icon-trigger
      >
        <span className={styles.modelName}>{model.name}</span>
        <span className={styles.modelEffort}>{effortLabel}</span>
        <ChevronRightIcon size={14} className={styles.modelChevron} />
      </button>

      {/* Flies out to the left of the catalogue: the ladder is a choice about
          how to answer, which is a different question from which model answers,
          so it gets its own panel rather than more rows in the same list. */}
      {effortOpen ? (
        <div className={styles.effortPanel} role="group" aria-label="Effort">
          <p className={styles.effortNote}>
            Higher effort means more thorough responses, but takes longer and
            uses your limits faster.
          </p>

          <div
            className={styles.effortList}
            role="radiogroup"
            aria-label="Effort level"
          >
            {EFFORTS.map((option) => {
              const selected = option.id === effort;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    styles.effortRow,
                    selected && styles.effortRowActive,
                  )}
                  onClick={() => {
                    onEffort(option.id);
                    onEffortOpen();
                  }}
                >
                  <span className={styles.effortLabel}>
                    {option.label}
                    {"badge" in option && option.badge ? (
                      <span className={styles.effortBadge}>{option.badge}</span>
                    ) : null}
                  </span>

                  {selected ? (
                    <CheckIcon size={16} className={styles.check} />
                  ) : null}
                </button>
              );
            })}
          </div>

          <span className={styles.divider} aria-hidden="true" />

          {/* A real checkbox behind a styled track, so it keeps its keyboard and
              screen-reader behaviour for free. */}
          <label className={styles.thinkingRow}>
            <span className={styles.thinkingText}>
              <span className={styles.thinkingTitle}>Thinking</span>
              <span className={styles.thinkingHint}>
                Can think for more complex tasks
              </span>
            </span>
            <input
              type="checkbox"
              className={styles.srOnly}
              checked={thinking}
              onChange={(event) => onThinking(event.target.checked)}
            />
            <span
              className={styles.switch}
              data-on={thinking}
              aria-hidden="true"
            >
              <span className={styles.switchKnob} />
            </span>
          </label>
        </div>
      ) : null}

      {open ? (
        <div className={styles.catalog} role="listbox" aria-label="Model">
          {/* Search, because the catalogue is a few hundred models and the
              enabled set is only curated if the list is filterable. Spec §33
              asks for exactly this. */}
          <input
            type="search"
            className={styles.catalogSearch}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search models"
            aria-label="Search models"
            autoFocus
          />

          <div className={styles.catalogRows}>
            {loading ? (
              <p className={styles.catalogEmpty}>Loading models…</p>
            ) : rows.length ? (
              rows.map((option) => {
                const active = option.id === model.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      styles.modelRow,
                      active && styles.modelRowActive,
                    )}
                    onClick={() => {
                      onPick(option);
                      setQuery("");
                    }}
                  >
                    <span className={styles.modelText}>
                      <span className={styles.modelNameRow}>{option.name}</span>
                      <span className={styles.modelDescription}>
                        {option.id === AUTO.id
                          ? AUTO_DESCRIPTION
                          : `${option.provider} · ${formatContext(option.contextLength)}`}
                      </span>
                    </span>

                    {active ? (
                      <CheckIcon size={16} className={styles.check} />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className={styles.catalogEmpty}>No models match “{query}”.</p>
            )}
          </div>

          {/* Only when Auto is the whole shortlist. A dropdown listing one row
              reads as broken, so it says why it is short and where to change
              it — otherwise the user assumes the catalogue is empty. */}
          {rows.length === 1 && rows[0]?.id === AUTO.id ? (
            <p className={styles.footnote}>
              Auto is switched on by itself. Add the models you want from{" "}
              <Link href="/settings/models" className={styles.link}>
                Settings → Models
              </Link>
              .
            </p>
          ) : null}

          <span className={styles.divider} aria-hidden="true" />

          <button
            type="button"
            className={styles.trailingRow}
            onClick={onEffortOpen}
            aria-expanded={effortOpen}
            aria-haspopup="listbox"
          >
            Effort
            <span className={styles.trailingValue}>
              {effortLabel}
              <ChevronRightIcon size={14} />
            </span>
          </button>

          <Link href="/settings/models" className={styles.trailingRow}>
            All models
            <span className={styles.trailingValue}>
              {enabledCount}
              <ChevronRightIcon size={14} />
            </span>
          </Link>

          <span className={styles.divider} aria-hidden="true" />

          <p className={styles.footnote}>
            Auto routes every task to the best model available to you.{" "}
            <span className={styles.link}>Learn more</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Context length in the largest unit that still reads as a number. */
function formatContext(tokens: number): string {
  if (!tokens) return "context unknown";
  if (tokens >= 1_000_000) return `${Math.round(tokens / 100_000) / 10}M context`;
  return `${Math.round(tokens / 1000)}k context`;
}
