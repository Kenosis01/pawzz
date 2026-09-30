"use client";

import { useRef, useState } from "react";

import styles from "./Sidebar.module.css";

/**
 * The rename target: a field that replaces the row while it is being edited.
 *
 * Enter saves and Escape cancels, and blurring saves too — a person who clicks
 * away has finished typing, and throwing the edit away because they did not
 * press Enter is the kind of small betrayal that makes people press Enter twice
 * forever after. `done` exists so that the unmount caused by a save does not
 * turn into a second save from the blur it triggers.
 */
export function RenameField({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);

  const save = () => {
    if (done.current) return;
    done.current = true;
    onSave(value);
  };
  const cancel = () => {
    if (done.current) return;
    done.current = true;
    onCancel();
  };

  return (
    <input
      className={styles.historyRename}
      value={value}
      maxLength={80}
      autoFocus
      aria-label="Conversation name"
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          save();
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancel();
        }
      }}
    />
  );
}
