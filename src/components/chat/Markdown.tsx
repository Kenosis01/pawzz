"use client";

import {
  Children,
  isValidElement,
  memo,
  useState,
  type ReactNode,
} from "react";

import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { CheckIcon, CopyIcon } from "../icons/Icons";
import styles from "./Markdown.module.css";

/**
 * Renders an assistant reply as Markdown (spec §35).
 *
 * Replies are Markdown, and rendering them as plain text is why `*emphasis*`
 * showed up with its asterisks and fenced code arrived as a wall of backticks.
 * A model that is asked for code will produce a fence, and a transcript that
 * cannot read a fence cannot show code.
 *
 * The plugin set is what a "professional" answer actually needs, not decoration:
 *
 *   - GFM for tables, strikethrough, task lists and autolinks. Models use
 *     tables constantly for comparisons and a table rendered as pipe characters
 *     is unreadable.
 *   - `remark-math` + `rehype-katex` for `$…$` and `$$…$$`. A maths answer
 *     without this is a wall of `\\frac` and `\\sqrt`.
 *   - `rehype-highlight` for fenced code, so a snippet is colourised by language
 *     instead of being a grey box.
 *
 * Rendered at every stage of a stream, not just at the end. An earlier version
 * showed plain text while the reply was arriving and switched to Markdown when
 * it closed, to avoid showing a half-parsed document — an unclosed fence renders
 * as a row of backticks. That is a real problem, and hiding the structure behind
 * a stream is a worse answer than showing a structure that is still settling:
 * the reply reads as the same document throughout, and the reader watches it
 * being written rather than watching a wall of plain text get replaced.
 *
 * Memoised on the source text: the transcript re-renders on every streamed
 * token, and re-running the whole remark/rehype pipeline per token is the most
 * expensive thing on the page.
 */
export const MarkdownBody = memo(function MarkdownBody({
  text,
  streaming,
}: {
  text: string;
  /** True while the reply is still arriving. Enables the reveal animation. */
  streaming?: boolean;
}) {
  return (
    <div className={styles.body} data-streaming={streaming ? "true" : undefined}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true }]]}
        // Fenced code becomes a block with a language label and a copy control.
        // Raw HTML is off by default and stays off: the transcript renders model
        // output, and allowing it would be an injection surface for no benefit.
        components={components}
      >
        {text}
      </Markdown>
    </div>
  );
});

/**
 * Block overrides.
 *
 * Only the handful that need markup the renderer cannot produce on its own.
 * Everything else is styled in CSS, so a change to how a list or a table looks
 * does not mean coming back here.
 */
/**
 * A fenced code block: a frame, a language label, and a copy control.
 *
 * Declared standalone and referenced from the override map rather than inlined
 * into it. Inlined, TypeScript takes `children` contextually from the renderer's
 * own (untyped) component signature and it becomes `any`, which then has to be
 * cast back to something usable — with a cast, the guard is only as good as the
 * assertion. As its own function the props are stated once and checked.
 */
function CodeBlock({ children }: { children?: ReactNode }) {
  // `rehype-highlight` puts the language on the `<code>` element as a class, so
  // it is read from there rather than re-derived from the source.
  //
  // `Children.toArray` rather than `Array.isArray(children) ? children[0] : …`:
  // the latter narrows a `ReactNode` to `any[]`, so the element read back out is
  // `any` and the guard below becomes a cast rather than a check.
  const [child] = Children.toArray(children);
  const language = isValidElement<{ className?: string }>(child)
    ? (/language-([\w+#-]+)/.exec(child.props.className ?? "")?.[1] ?? "")
    : "";

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeBar}>
        <span className={styles.codeLang}>{language || "text"}</span>
        <CopyCode />
      </div>
      <pre>{children}</pre>
    </div>
  );
}

/**
 * A table, in a frame that can be rounded.
 *
 * The frame is the whole reason this component exists. A table whose own cells
 * carry a background cannot be given rounded corners: `border-collapse: collapse`
 * has no box to round, and a header row painted `--surface-subtle` runs square
 * right into the edge of the reply. Putting the table inside a bordered,
 * `overflow: hidden` wrapper moves the rounding to a box that does have one, and
 * the horizontal scroll moves with it — which is where it belongs, since the
 * scroll is about the table's width and not the text's.
 */
function Table({ children }: { children?: ReactNode }) {
  return (
    <div className={styles.tableFrame}>
      <table>{children}</table>
    </div>
  );
}

const components = { pre: CodeBlock, table: Table };

/**
 * Copy for one code block.
 *
 * Reads its own block by walking to the nearest `.codeBlock` ancestor rather
 * than being handed the text, so the handler does not have to be threaded
 * through the `pre` override and stays correct however the markup nests.
 *
 * Deliberately lowercase and un-styled: a block label is chrome, and the message
 * action row already has a proper copy button for the whole reply.
 */
function CopyCode() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={styles.copy}
      onClick={(event) => {
        const block = event.currentTarget.closest(`.${styles.codeBlock}`);
        const code = block?.querySelector("code") ?? block;
        const text = code?.textContent ?? "";
        if (!text) return;
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        });
      }}
      // Icon plus a label that is only for assistive tech. The word "copy" was
      // here first and it read as a text link floating in the gutter, which is
      // not what a control in a code bar looks like; the state after the click
      // is carried by the tick rather than by the word changing to "copied".
      aria-label="Copy code"
      title="Copy code"
    >
      {copied ? (
        <CheckIcon size={14} className={styles.copyDone} />
      ) : (
        <CopyIcon size={14} />
      )}
    </button>
  );
}
