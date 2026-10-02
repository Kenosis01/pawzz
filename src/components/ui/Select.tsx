"use client";

import { useEffect, useId, useRef, useState } from "react";

import { cn } from "../../lib/cn";
import { CheckIcon, ChevronDownIcon } from "../icons/Icons";
import styles from "./Select.module.css";

export type SelectOption = { value: string; label: string };

/**
 * A dropdown that looks like the app rather than like the operating system.
 *
 * The native `<select>` popup is drawn by the platform and cannot be styled:
 * in the dark theme it opens as a white list with the system's blue highlight
 * — the one control in the product that does not belong to it. Everything
 * here (trigger, list, active row, check) is built from the same tokens as
 * the app's other popovers (`ProfileMenu`, `ChatRowMenu`), because a popup is
 * a popup whether it came from a button or from a field.
 *
 * Keyboard follows the listbox pattern: the list takes focus when it opens,
 * arrows move the active row (mirrored into `aria-activedescendant`), Enter
 * and Space choose, Escape closes back onto the trigger, Tab releases focus,
 * and typing jumps between options by label the way the native control did —
 * which matters here, because the model list is hundreds of rows long.
 */
export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [active, setActive] = useState(selectedIndex);

  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typeBuffer = useRef({ text: "", at: 0 });
  const listId = useId();

  const selected = options[selectedIndex];
  const label = selected?.label ?? value;

  // Re-seat the active row on the current value each time the list opens, so
  // reopening after a change starts at what is chosen rather than where the
  // last keyboard session stopped.
  useEffect(() => {
    if (open) setActive(selectedIndex);
  }, [open, selectedIndex]);

  // Focus the list on open so arrows land on options without a Tab first.
  useEffect(() => {
    if (open) list.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Keep the active row inside the list's own scrollport — the model list is
  // hundreds of rows and the default can be anywhere in it.
  useEffect(() => {
    if (!open) return;
    list.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const choose = (option: SelectOption | undefined) => {
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  };

  const onListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Tab") {
      // Release rather than trap: the menu is transient, and swallowing Tab
      // would leave focus on a control the user has just left behind.
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (
      event.key.length === 1 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      // Type-ahead, reset after a pause — the native select's one genuinely
      // useful behaviour, and the reason a long model list stays navigable.
      const now = Date.now();
      const buffer =
        now - typeBuffer.current.at < 600
          ? typeBuffer.current.text + event.key
          : event.key;
      typeBuffer.current = { text: buffer, at: now };
      const needle = buffer.toLowerCase();
      const match = options.findIndex((option) =>
        option.label.toLowerCase().startsWith(needle),
      );
      if (match >= 0) {
        event.preventDefault();
        setActive(match);
      }
    }
  };

  return (
    <div className={styles.root} ref={root}>
      <button
        type="button"
        ref={trigger}
        className={cn(styles.trigger, className)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={styles.value}>{label}</span>
        <ChevronDownIcon
          size={14}
          className={cn(styles.chevron, open && styles.chevronOpen)}
        />
      </button>

      {open ? (
        <div
          className={styles.list}
          role="listbox"
          id={listId}
          aria-label={ariaLabel}
          aria-activedescendant={`${listId}-${active}`}
          tabIndex={-1}
          ref={list}
          onKeyDown={onListKeyDown}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              data-active={index === active}
              className={styles.option}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(option)}
            >
              <span className={styles.optionLabel} title={option.label}>
                {option.label}
              </span>
              {option.value === value ? (
                <CheckIcon size={13} className={styles.check} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
