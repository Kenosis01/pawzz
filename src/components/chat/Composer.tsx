"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { cn } from "../../lib/cn";
import { useModelPreference } from "../../lib/model-preference";
import { useIncognito } from "../../lib/incognito";
import { placeholderFor } from "../../lib/placeholder";
import type { Model } from "../../lib/models";
import { AttachmentTray } from "./composer/AttachmentTray";
import { ModelPicker } from "./composer/ModelPicker";
import { PlusMenu } from "./composer/PlusMenu";
import { SendSlot } from "./composer/SendSlot";
import {
  filesFromClipboard,
  fromFile,
  makeId,
  probeDrag,
  readClipboardImages,
  shouldCardifyPaste,
  toThumb,
  type Attachment,
  type DragReadout,
} from "./composer/attachments";
import styles from "./Composer.module.css";

const MIN_HEIGHT_REM = 2;
const MAX_HEIGHT_REM = 24;

export type { Attachment };

export type ComposerProps = {
  onSend?: (prompt: string, modelId: string, attachments: Attachment[]) => void;
  /**
   * Whether this thread already has a message in it.
   *
   * Drives both the box's size and the placeholder: an untouched chat gets the
   * full box, because the prompt is the only thing on screen and has the room.
   * Once there is a transcript the box steps back to one line so the
   * conversation keeps the screen.
   */
  hasMessages?: boolean;
  /** True while a reply is arriving. The trailing control becomes Stop. */
  streaming?: boolean;
  /**
   * Aborts the in-flight reply.
   *
   * The control lives inside the box rather than in the transcript because the
   * box is the one thing on screen that is not moving while the reply streams —
   * the transcript is. A stop button up in the transcript is a target the eye
   * has to leave the answer to find, and it scrolls away. Here it is always in
   * the same place, under the thumb, the whole time.
   */
  onStop?: () => void;
  /**
   * Puts text into the box for the user to edit, and focuses it.
   *
   * For "edit the prompt that got this answer", which is an *editing* affordance
   * and not a resend. The id is not decoration: it is what makes a second click
   * work. Keyed on the text alone, clicking Edit prompt, clearing the box and
   * clicking it again would set the same value as before and the effect would not
   * re-run — so the second click would do nothing at all.
   *
   * Nothing is sent. The user still has to press Enter, which is the difference
   * between putting a question back in front of them and asking it again.
   */
  prefill?: { text: string; id: number };
};

/**
 * The prompt box (PRD §12). One line at rest, growing with the content up to
 * 24rem and scrolling past it. The controls sit in the reserved gutters either
 * side of the field so text never runs underneath them.
 *
 * The box itself is the state and the measurements; the four controls around it
 * are in ./composer, and the file-level logic for attachments is in
 * ./composer/attachments.
 */
export function Composer({
  onSend,
  hasMessages = false,
  streaming = false,
  onStop,
  prefill,
}: ComposerProps) {
  // Read here rather than passed in: the dotted outline and the greeting both
  // depend on it, and two props carrying one flag is one too many.
  const { on: incognito } = useIncognito();
  const [prompt, setPrompt] = useState("");
  const { model, setModelId, effort, setEffort, thinking, setThinking } =
    useModelPreference();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [drag, setDrag] = useState<DragReadout | null>(null);

  const filesId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const catalogRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);

  const canSend = prompt.trim().length > 0 || attachments.length > 0;

  // Returns how many were attached, so callers can report a miss.
  const addFiles = useCallback((files: File[] | FileList | null): number => {
    const list = Array.from(files ?? []);
    if (!list.length) return 0;
    const added = list.map(fromFile);
    setAttachments((current) => [...current, ...added]);

    // Rasterise off the critical path: the tile appears immediately from the
    // blob URL and gains its durable thumbnail a moment later.
    for (const [index, file] of list.entries()) {
      void toThumb(file).then((thumb) => {
        if (!thumb) return;
        setAttachments((current) =>
          current.map((a) => (a.id === added[index]?.id ? { ...a, thumb } : a)),
        );
      });
    }

    return list.length;
  }, []);

  // Keyed on the id, not the text, so the same prompt asked for twice is two
  // events. Keyed on the object, which React compares by reference, so it is the
  // primitive that decides.
  const prefillId = prefill?.id;
  useEffect(() => {
    if (prefillId === undefined || !prefill) return;
    setPrompt(prefill.text);
    // Focus so the user can start typing immediately, and at the end of the text
    // rather than the start — they are editing a sentence, not reading it.
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [prefillId, prefill]);

  // Grow with the content, capped so the field scrolls past 24rem. The trail
  // gutter is released once the text wraps, so a long prompt gets the width.
  //
  // Two things have to be suppressed for the measurement to mean anything, and
  // both are easy to miss because the box still *looks* correct afterwards:
  //
  //   - `min-height`, which participates in `scrollHeight`. It is 3.5rem in the
  //     full box, so measuring without clearing it returns the floor instead of
  //     the content and bakes 56px in as an inline height.
  //   - the `min-height` *transition*, which is 360ms. Setting an inline
  //     min-height still animates, so reading `scrollHeight` in the same tick
  //     measures the value on its way down from 56px — the cleared floor has not
  //     arrived yet. This is the one that makes the clear look like a no-op.
  //
  // With the floor really gone, the collapsed box measures 2rem instead of 3.5rem
  // and the single-row `[+] [field] [mic]` layout reads as one row.
  //
  // `hasMessages` is a dependency because the floor changes with it: a prompt
  // typed on the empty state has to be re-measured once the box collapses.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const root =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

    const floor = el.style.minHeight;
    const motion = el.style.transition;
    el.style.transition = "none";
    el.style.height = "auto";
    el.style.minHeight = "0px";
    const next = Math.min(el.scrollHeight, MAX_HEIGHT_REM * root);
    el.style.minHeight = floor;
    el.style.height = `${Math.max(next, MIN_HEIGHT_REM * root)}px`;
    el.style.overflowY = el.scrollHeight > next ? "auto" : "hidden";
    el.style.transition = motion;
  }, [prompt, hasMessages]);

  // How far the model picker has to rise to clear the card.
  //
  // Once there is a conversation the picker lives in the chin *below* the
  // composer and opens upward — straight through the box. Overlapping is not
  // just untidy: the panel's bottom edge and its divider land on the card's
  // border, so menu and prompt read as one broken object.
  //
  // Measured from the anchor to the top of the card rather than as the card's
  // height. The two are not the same number: the chin sits below the fieldset
  // with its own margin, so the distance also has to cover that gap. Measuring
  // the card alone left the panel overlapping by exactly the chin's margin.
  useLayoutEffect(() => {
    const card = fieldsetRef.current;
    const anchor = catalogRef.current;
    if (!card) return;

    const report = () => {
      // No anchor yet means the picker is inside the card, where it already
      // clears it, so there is nothing to add.
      const anchorTop = anchor?.getBoundingClientRect().top;
      if (anchorTop === undefined) {
        setCardHeight(0);
        return;
      }
      setCardHeight(Math.max(0, anchorTop - card.getBoundingClientRect().top));
    };

    report();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(report);
    observer.observe(card);
    return () => observer.disconnect();
  }, [hasMessages]);

  // Object URLs are a manual resource; release them when the card goes away.
  useEffect(
    () => () =>
      attachments.forEach((a) => a.preview && URL.revokeObjectURL(a.preview)),
    [attachments],
  );

  // Files dropped anywhere in the window are accepted.
  //
  // This lives on `window`, not the composer, for two reasons: the box is a
  // small target, and an unhandled drop makes the webview navigate to the
  // dropped file, replacing the app with a picture of it.
  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setDrag(probeDrag(event.dataTransfer));
    };

    const onDragLeave = (event: DragEvent) => {
      // relatedTarget is null only when the pointer leaves the window itself.
      if (event.relatedTarget === null) setDrag(null);
    };

    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      const found = probeDrag(event.dataTransfer);
      const added = addFiles(event.dataTransfer?.files ?? null);

      if (added > 0) {
        setDrag(null);
        return;
      }

      console.warn("[pawzz] drop captured no files — the engine offered:", {
        types: found.types,
        files: found.fromFiles,
        items: found.fromItems,
      });
      setDrag({ ...found, dropped: true });
      window.setTimeout(() => setDrag(null), 2200);
    };

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Image and file pastes are handled at the document level, not on the
  // textarea: a paste only reaches the field while it holds focus.
  useEffect(() => {
    const onDocumentPaste = (event: globalThis.ClipboardEvent) => {
      const data = event.clipboardData;
      if (!data) return;

      const files = filesFromClipboard(data);
      if (files.length) {
        event.preventDefault();
        addFiles(files);
        return;
      }

      const types = Array.from(data.types ?? []);
      if (!types.some((type) => type.startsWith("image/"))) return;

      event.preventDefault();
      void readClipboardImages().then((found) => {
        if (found.length) addFiles(found);
      });
    };

    document.addEventListener("paste", onDocumentPaste);
    return () => document.removeEventListener("paste", onDocumentPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!catalogOpen && !plusOpen && !effortOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !catalogRef.current?.contains(target) &&
        !plusRef.current?.contains(target)
      ) {
        setCatalogOpen(false);
        setPlusOpen(false);
        setEffortOpen(false);
      }
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCatalogOpen(false);
      setPlusOpen(false);
      setEffortOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [catalogOpen, plusOpen, effortOpen]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => {
      const target = current.find((a) => a.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return current.filter((a) => a.id !== id);
    });
  }, []);

  const send = useCallback(() => {
    if (!canSend) return;
    // Nothing is sendable while a reply is streaming — the stop button owns this
    // slot, and admitting a second prompt into a chat that is mid-stream is what
    // duplicates messages: the SDK appends the new prompt alongside the reply it
    // is still writing, and React then sees two children with one key. The text
    // is deliberately left in the field, so the prompt is not thrown away, it
    // just waits for the reply to finish.
    if (streaming) return;
    onSend?.(
      prompt.trim(),
      model.id,
      attachments.map((a) => ({
        id: a.id,
        kind: a.kind,
        name: a.name,
        text: a.text,
        thumb: a.thumb,
        size: a.size,
      })),
    );
    setPrompt("");
    setAttachments([]);
  }, [attachments, canSend, model.id, onSend, prompt, streaming]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      send();
    }
  };

  // Only text is handled here. Files are owned by the document listener, and
  // handling them in both places would attach every image twice.
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (!shouldCardifyPaste(text)) return;
    event.preventDefault();
    setAttachments((current) => [
      ...current,
      { id: makeId(), kind: "text", name: "Pasted text", text },
    ]);
  };

  const onPickModel = useCallback(
    (next: Model) => {
      setModelId(next.id);
      setCatalogOpen(false);
    },
    [setModelId],
  );

  return (
    <div className={styles.wrap} data-docked={hasMessages}>
      <div className={styles.inner}>
        <fieldset
          ref={fieldsetRef}
          data-collapsed={hasMessages}
          data-incognito={incognito}
          className={cn(styles.composer, drag && styles.composerArmed)}
          onClick={(event) => {
            if (
              (event.target as HTMLElement).closest("button, a, label, input")
            )
              return;
            textareaRef.current?.focus();
          }}
        >
          <input
            id={filesId}
            type="file"
            multiple
            className={styles.fileInput}
            tabIndex={-1}
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />

          <AttachmentTray
            attachments={attachments}
            onRemove={removeAttachment}
          />

          {/* Always mounted: a mounted-then-animated backdrop-filter pops
              instead of easing, so the state is a transition, not a mount. */}
          <span
            className={styles.dropVeil}
            data-active={drag ? "true" : "false"}
            aria-hidden="true"
          >
            <span className={styles.dropLabel}>Drop here</span>
          </span>

          <div className={styles.fieldWrap}>
            <textarea
              ref={textareaRef}
              className={styles.field}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder={placeholderFor({
                hasMessages,
                attachmentCount: attachments.length,
              })}
              rows={1}
              aria-label="Write your prompt"
            />
          </div>

          <div className={styles.toolbarLeft}>
            <PlusMenu
              open={plusOpen}
              onToggle={() => setPlusOpen((open) => !open)}
              filesInputId={filesId}
              anchorRef={plusRef}
            />
          </div>

          <div className={styles.toolbarRight}>
            {/* New chat: the box is the full one and its controls row has room
                for the picker, which is where the desktop app kept it. After
                the first message the box is a single line, there is no room,
                and the picker moves to the row below. */}
            {hasMessages ? null : (
              <ModelPicker
                model={model}
                open={catalogOpen}
                onToggle={() => setCatalogOpen((value: boolean) => !value)}
                onPick={onPickModel}
                effort={effort}
                onEffort={setEffort}
                effortOpen={effortOpen}
                onEffortOpen={() => setEffortOpen((value: boolean) => !value)}
                thinking={thinking}
                onThinking={setThinking}
                anchorRef={catalogRef}
                clearBy={0}
              />
            )}

            <SendSlot
              canSend={canSend}
              streaming={streaming}
              onSend={send}
              onStop={onStop}
            />
          </div>
        </fieldset>

        {/* Once there is a conversation. This is where the picker lives after
            the first message — a model name in a one-line prompt would take the
            width the prompt needs — and the disclaimer belongs to an answer,
            not to an untouched prompt. */}
        {hasMessages ? (
          <div className={styles.chin}>
            <p className={styles.disclaimer}>
              Pawzz can make mistakes.
              <span className={styles.disclaimerMore}>
                {" "}
                Please double-check responses.
              </span>
            </p>

            <ModelPicker
              model={model}
              open={catalogOpen}
              onToggle={() => setCatalogOpen((value: boolean) => !value)}
              onPick={onPickModel}
              effort={effort}
              onEffort={setEffort}
              effortOpen={effortOpen}
              onEffortOpen={() => setEffortOpen((value: boolean) => !value)}
              thinking={thinking}
              onThinking={setThinking}
              anchorRef={catalogRef}
              clearBy={cardHeight}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* Re-exported from here rather than left to callers to know the new path: this
   module is what the rest of the app already imported from, and a file move
   should not be a breaking change to every consumer. */
export { PASTE_CARD_CHARS, shouldCardifyPaste } from "./composer/attachments";
