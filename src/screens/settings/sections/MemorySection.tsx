"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MarkdownEditor } from "../../../components/chat/MarkdownEditor";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "../../../components/icons/Icons";
import styles from "./MemorySection.module.css";

/**
 * Memory — a markdown document the user owns, and nothing else.
 *
 * This page is a *writing surface*, not a settings panel. The editor is the
 * page: no card, no border, no box the text sits inside, no heading above it
 * explaining what it is for. Everything else on it can be reached from the
 * text itself, which is what makes it a document rather than a form.
 *
 * That means the "learn from your chats" capture row is gone. It was a second
 * way to write to the same file — an input box, a button, and a dated line —
 * sitting directly beneath a textarea that does the same job with more room.
 * Two ways to write one document is one too many, and the input always won the
 * fight for attention while being the worse of the two.
 *
 * Saving is automatic and debounced, which is the only honest version of a
 * document you can type into: an explicit Save button on a page that is
 * entirely a text field asks the user to protect something the page is already
 * protecting. The state chip in the corner says whether it has landed.
 *
 * Storage is `pawzz.memory.md`, plain text. Every read and write is wrapped —
 * blocked storage degrades to "this session works, the file is not remembered",
 * never an error.
 *
 * This is a markdown *source* editor. Notion's is a rich-text editor where the
 * formatting is invisible; this one shows the `#` and the `-` and the `**`,
 * because that is the file Pawzz actually stores and the user actually owns.
 * Building the WYSIWYG layer on top of it would mean a second representation
 * that has to be reconciled back to markdown on every keystroke, and the thing
 * being edited here is meant to be the real thing.
 */

const STORAGE_KEY = "pawzz.memory.md";

/** How long after the last keystroke the write is debounced by. */
const SAVE_DEBOUNCE_MS = 600;

/**
 * The prompt handed to whatever other provider the user already trusts.
 *
 * Written as an instruction to a model rather than a form, because step 1 is
 * "copy this into a chat with your other AI provider" — so it has to be a
 * prompt that produces a clean markdown document when pasted into one.
 * Preserving the user's words verbatim is stated up front because a paraphrased
 * instruction is a memory Pawzz will then act on the wrong version of.
 */
const EXPORT_PROMPT = `Export all of my stored memories and any context you've learned about me from past conversations. Preserve my words verbatim where possible, especially for instructions and preferences.

## Categories (output in this order):

1. **Instructions**: Rules I've explicitly asked you to follow going forward — tone, format, style, "always do X", "never do Y", and corrections to your behavior.

2. **Identity**: Name, age, location, education, family, relationships, languages, and personal interests.

3. **Career**: Current and past roles, companies, and general skill areas.

4. **Projects**: Projects I meaningfully built or committed to. Ideally ONE entry per project. Include what it does, current status, and any key decisions.

5. **Preferences**: Opinions, tastes, and working-style preferences that apply broadly.

## Format:

Use section headers for each category. Within each category, list one entry per line, sorted by oldest date first. Format each line as:

[YYYY-MM-DD] - Entry content here.

If no date is known, use [unknown] instead.

## Output:
- Wrap the entire export in a single code block for easy copying.
- After the code block, state whether this is the complete set or if more remain.`;

/**
 * The collapsed one-line summary of the export prompt.
 *
 * Hand-written rather than sliced out of EXPORT_PROMPT, so it stays a readable
 * sentence instead of ending mid-word at whatever character the box happens to
 * fit, and so editing the prompt does not silently change what the collapsed
 * row claims the prompt says.
 */
const PROMPT_PREVIEW =
  "Export all of my stored memories and any context you've learned about me from past conversations…";

function countEntries(markdown: string): number {
  const trimmed = markdown.trim();
  if (!trimmed) return 0;
  return trimmed.split("\n").filter((line) => line.trim().length > 0).length;
}

export function MemorySection() {
  const [saved, setSaved] = useState("");
  const [draft, setDraft] = useState("");
  // null until the storage read resolves, so the page never paints a frame of
  // an empty document over a real one and then swaps it out.
  const [hydrated, setHydrated] = useState(false);
  const [writeState, setWriteState] = useState<"idle" | "saving" | "saved">("idle");

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [copied, setCopied] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  /* Bumped to tell the editor "this is a different document, rebuild from
     scratch". It is a counter rather than the markdown itself: using the text
     as the key would remount the editor on every import-sized change and
     compare a few hundred characters to do it. */
  const [documentKey, setDocumentKey] = useState(0);

  const saveTimer = useRef<number | undefined>(undefined);
  const savedRef = useRef("");

  useEffect(() => {
    let stored = "";
    try {
      stored = localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      // Storage unavailable — an empty document that lives for this session.
    }
    savedRef.current = stored;
    setSaved(stored);
    setDraft(stored);
    setHydrated(true);
  }, []);

  // The write. Every path that changes the document goes through this, so there
  // is exactly one place that knows how a document reaches storage.
  const persist = useCallback((next: string) => {
    savedRef.current = next;
    setSaved(next);
    setDraft(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembered across a reload; the session still works.
    }
  }, []);

  // Debounced autosave. The ref is the source of truth for the last saved text
  // so a keystroke landing during a pending write is not compared against stale
  // state and scheduled twice.
  const scheduleSave = useCallback(
    (next: string) => {
      setWriteState("saving");
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        persist(next);
        setWriteState("saved");
      }, SAVE_DEBOUNCE_MS);
    },
    [persist],
  );

  // A pending write is flushed on unmount, so navigating away mid-edit — or
  // closing the dialog inside the debounce window — cannot lose the last thing
  // that was typed.
  useEffect(() => {
    return () => {
      window.clearTimeout(saveTimer.current);
      const pending = savedRef.current;
      try {
        localStorage.setItem(STORAGE_KEY, pending);
      } catch {
        // Ignore.
      }
    };
  }, []);

  const dirty = draft !== saved;
  const entries = countEntries(draft);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(EXPORT_PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable.
    }
  };

  /** Import appends to the document. It never replaces it. */
  const addImport = () => {
    const text = importText.trim();
    if (!text) return;
    const merged = draft.trim() ? `${draft.trim()}\n\n${text}` : text;
    // Cancels any queued autosave first: the debounced write is holding an
    // older draft, and letting it land after this one would drop the import.
    window.clearTimeout(saveTimer.current);
    persist(merged);
    // The editor cannot take a new document as a prop, so the merge has to
    // rebuild it. Without this the imported text would be in storage and on
    // screen would still be the document as it was before the import.
    setDocumentKey((key) => key + 1);
    setWriteState("saved");
    setImportText("");
    setImportOpen(false);
  };

  return (
    <div className={styles.page}>
      {/* The only chrome on the page: what the document is, and whether it has
          been written. Both are quiet, and both sit above the text rather than
          in a bar of their own. */}
      <div className={styles.crumbs}>
        <span className={styles.crumbLabel}>Memory</span>
        <span className={styles.crumbMeta}>
          {entries === 1 ? "1 entry" : `${entries} entries`}
          {dirty && hydrated ? (
            <span className={styles.crumbDot} aria-live="polite">
              {writeState === "saving" ? "Saving…" : "Unsaved"}
            </span>
          ) : null}
        </span>
      </div>

      {/* The page. Full height, no container, no border — the text is the
          surface, and the measure is set by the column rather than by a box. */}
      <div className={styles.doc}>
        {/* Mounted only once storage has resolved. A live editor seeded with
            "" and then handed the real document is how a Notion page flashes
            empty, and remounting a ProseMirror document on a prop change
            throws the caret away anyway.

            The key is the document's identity, not its contents: an import
            rewrites the file in one go, and the editor has no way to take a new
            document as a prop. Changing the key is the honest way to say "this
            is a different document" — it destroys the editor and builds a new
            one from the merged text. Keystrokes do not change the key, so
            typing never remounts anything. */}
        {hydrated ? (
          <MarkdownEditor
            key={documentKey}
            defaultValue={saved}
            className={styles.editor}
            onChange={(markdown) => {
              setDraft(markdown);
              scheduleSave(markdown);
            }}
          />
        ) : null}
      </div>

      {/* Import lives here, at the bottom right of the page, rather than in a
          settings row above the document. It is the one action that is not
          writing, so it does not belong in the writing flow — but it is an
          action *on this document*, so it belongs on this page. */}
      <button
        type="button"
        className={styles.importFab}
        onClick={() => setImportOpen(true)}
      >
        Import
      </button>

      {importOpen ? (
        <div
          className={styles.scrim}
          onMouseDown={() => setImportOpen(false)}
          role="presentation"
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pawzz-import-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.dialogHead}>
              <h3 className={styles.dialogTitle} id="pawzz-import-title">
                Import memory to Pawzz
              </h3>
              <button
                type="button"
                className={styles.dialogClose}
                onClick={() => setImportOpen(false)}
                aria-label="Close import"
              >
                <XIcon size={16} />
              </button>
            </div>

            <ol className={styles.steps}>
              <li className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <div className={styles.stepBody}>
                  <p className={styles.stepLabel}>
                    Copy this prompt into a chat with your other AI provider
                  </p>
                  <div className={styles.promptBox}>
                    {/* The prompt is ~30 lines of markdown. Shown open it is the
                        tallest thing in the dialog and pushes the paste step —
                        the actual point — below the fold. So it is collapsed to
                        a preview and expands in place on click. */}
                    {promptOpen ? (
                      <div className={styles.promptBody} id="pawzz-export-prompt">
                        <pre className={styles.promptText}>{EXPORT_PROMPT}</pre>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.promptToggle}
                        onClick={() => setPromptOpen(true)}
                        aria-expanded={false}
                        aria-controls="pawzz-export-prompt"
                      >
                        <span className={styles.promptPreview}>
                          {PROMPT_PREVIEW}
                        </span>
                        <ChevronDownIcon
                          size={15}
                          className={styles.promptChevron}
                        />
                      </button>
                    )}
                    <div className={styles.promptActions}>
                      {promptOpen ? (
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => setPromptOpen(false)}
                        >
                          <ChevronUpIcon size={15} />
                          Show less
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={copyPrompt}
                      >
                        {copied ? "Copied" : "Copy prompt"}
                      </button>
                    </div>
                  </div>
                </div>
              </li>

              <li className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <div className={styles.stepBody}>
                  <label
                    className={styles.stepLabel}
                    htmlFor="pawzz-import-text"
                  >
                    Paste the results below to add to Pawzz&rsquo;s memory
                  </label>
                  <textarea
                    id="pawzz-import-text"
                    className={styles.pasteArea}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste your memory details here"
                    rows={8}
                    aria-label="Paste imported memory"
                  />
                </div>
              </li>
            </ol>

            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setImportOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primary}
                onClick={addImport}
                disabled={!importText.trim()}
              >
                Add to memory
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}