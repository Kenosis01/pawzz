"use client";

import { useEffect, useRef } from "react";
import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import { InputRule, inputRules } from "@milkdown/kit/prose/inputrules";
import {
  type EditorState,
  type Plugin,
  Selection,
  type Transaction,
} from "@milkdown/kit/prose/state";

import { cn } from "../../lib/cn";

/**
 * `[ ]` → a task list item, typed.
 *
 * Milkdown ships a rule for this and it is the reason a todo list was still
 * unreachable from an empty line: the GFM rule matches `/^\[(?<checked>\s|x)\]\s$/`
 * and then walks *up* from the caret looking for a `list_item` to flag. No list
 * item — because the user has not typed `- ` yet — so it returns null and the
 * three characters sit there as text. The list-item node schema is what carries
 * the checkbox (a `checked` attribute on `list_item`, not a mark), and the only
 * other way to get one is to already be inside a list.
 *
 * So the trigger is the token, not the list. `[]`, `[ ]` and `[x]` at the start
 * of a block become a checkbox on the closing `]`, which is the keystroke the
 * user has just finished; a trailing space is also accepted so the full
 * `[ ] ` form still works when the `]` arrives through an IME.
 *
 * Two cases, one handler. Inside a list item the item already exists and only
 * its `checked` attribute has to be set, which is the case `- []` hits.
 * Anywhere else the token has to build the list itself — and only a plain
 * paragraph line qualifies, because a `[ ]` that opens a heading is a heading.
 */
const TASK_TOKEN_RULE = /^\[([ xX]?)\]([ ]?)$/;

function taskTokenToListItem(
  state: EditorState,
  match: RegExpMatchArray,
  start: number,
  end: number,
): Transaction | null {
  const $start = state.doc.resolve(start);
  // The token only counts at the very start of its block. `[ ]` mid-sentence is
  // prose, and eating it would be the editor deciding what the user meant.
  if ($start.parentOffset !== 0) return null;

  const listItemType = state.schema.nodes.list_item;
  const bulletListType = state.schema.nodes.bullet_list;
  const paragraphType = state.schema.nodes.paragraph;
  if (!listItemType || !bulletListType || !paragraphType) return null;

  const checked = /[xX]/.test(match[1] ?? "");

  // The list item the caret is already inside, if there is one.
  let depth = 0;
  let node = $start.node(depth);
  while (node && node.type.name !== "list_item") {
    depth--;
    node = $start.node(depth);
  }

  // The matched text was never inserted — an input rule that returns true stops
  // the insertion — so deleting it also drops the trigger keystroke.
  const tr = state.tr.delete(start, end);

  if (node) {
    // The token states the box rather than toggling it, so it still means the
    // same thing on the second item of a list the user is halfway through
    // typing: `[x] shipped` ticks it, `[ ] shipped` does not.
    tr.setNodeMarkup($start.before(depth), undefined, {
      ...node.attrs,
      checked,
    });
    return tr;
  }

  const $pos = tr.doc.resolve(start);
  if ($pos.parent.type !== paragraphType) return null;

  // Whatever was typed after the caret rides along into the new item.
  const rest = $pos.parent.content.cut($pos.parentOffset);
  const item = listItemType.create(
    { checked },
    paragraphType.create(null, rest.childCount ? rest : null),
  );
  const at = $pos.before($pos.depth);
  tr.replaceRangeWith(
    at,
    $pos.after($pos.depth),
    bulletListType.create(null, item),
  );
  // Replacing the whole paragraph took the caret with it; put it back inside
  // the new item so the next keystroke goes into the checkbox the user is
  // standing next to.
  tr.setSelection(Selection.near(tr.doc.resolve(at + 1)));
  return tr;
}

/**
 * The rule above, as a plugin for the live view.
 *
 * Crepe builds its editor itself and exposes no seam for adding plugins to it:
 * `crepe.editor.use()` registers the factory but Milkdown only runs a
 * plugin's handler during `create()`, which has already happened by the time
 * there is a view to add it to — and `inputRulesCtx` is read once, when the
 * state is built, so a rule added there afterwards would never be consulted.
 * Reconfiguring the view's state with the extra plugin is the supported
 * ProseMirror operation for exactly this, and it keeps the existing rules
 * (`- `, `# `, `- [ ] ` inside a list) exactly as they were.
 */
function taskTokenPlugin(): Plugin {
  return inputRules({
    // `inCode` is left at its default, which is the rule refusing to fire
    // inside a code block: a `[ ]` in a snippet is a snippet.
    rules: [new InputRule(TASK_TOKEN_RULE, taskTokenToListItem)],
  });
}

/* Crepe's layout stylesheets, imported here and not from the page's CSS module.

   An `@import` inside a `*.module.css` is resolved by the CSS Modules
   transform, and every bare class in the imported file gets hashed along with
   ours: `.milkdown .milkdown-list-item-block > .list-item` came out as
   `.milkdown__7qLQ2 .milkdown-list-item-block__PUW2m > .list-item__xed5X`,
   which matches nothing — the live element carries a bare `milkdown` and a
   bare `list-item`. So the row layout never arrived, and every task rendered
   as a plain bullet with its checkbox stacked above the text. Imported from a
   plain module instead, it arrives verbatim and stays global. */
import "@milkdown/crepe/theme/frame.css";
import "@milkdown/crepe/theme/common/prosemirror.css";
import "@milkdown/crepe/theme/common/list-item.css";

/**
 * The list icons, drawn here rather than inherited from Crepe's defaults.
 *
 * They cannot live in the stylesheet because Crepe renders them as inline SVG
 * markup through a `renderLabel` callback — there is no element for a CSS rule
 * to attach to, and no `accent-color` either, since it is not an `<input>`.
 * Inheriting `currentColor` is what lets these follow the palette in both
 * themes: the label sits in Pawzz's text colour, so the bullet and the tick
 * read correctly in light and dark without a second set of icons.
 *
 * The unchecked box is a rounded square outline; the checked one is a filled
 * square with a tick knocked out of it. Both are drawn on a 24-unit grid with
 * the same 2px stroke Crepe uses, so they sit at the same visual weight as the
 * text they sit beside.
 */
const BULLET_ICON = /* html */ `
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4" fill="currentColor" />
  </svg>
`;

const UNCHECKED_ICON = /* html */ `
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="4.5" y="4.5" width="15" height="15" rx="4"
      stroke="currentColor" stroke-width="1.8" />
  </svg>
`;

const CHECKED_ICON = /* html */ `
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="4.5" y="4.5" width="15" height="15" rx="4"
      fill="currentColor" />
    <path d="M8.5 12.2l2.4 2.4 4.8-4.9" stroke="var(--surface)" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" />
  </svg>
`;

/**
 * Everything between the document and the file it is stored in.
 *
 * ProseMirror inserts U+00A0 after an inline mark closes, so that typing on
 * after `**bold**` lands you after the mark instead of inside it. Correct for
 * an editor, wrong to persist: it wrote `Some **bold** text.` to
 * `pawzz.memory.md`, a file the user owns and may paste elsewhere.
 *
 * Crepe serializes an empty paragraph as `<br />`, so every blank line left
 * behind between two blocks was written out as literal HTML. Anchored to a line
 * of its own, which keeps a `<br />` that the user actually made — a soft line
 * break inside a paragraph is real markdown and has to survive.
 *
 * Collapsing the runs of blank lines those removals leave behind is
 * rendering-neutral: in markdown, `\n\n` is already a paragraph break and a
 * third newline adds nothing.
 */
function toStoredMarkdown(markdown: string): string {
  return markdown
    .replace(/\u00a0/g, " ")
    .replace(/^<br \/>$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * A markdown document that formats itself while you type it.
 *
 * `## ` becomes a heading as soon as the space lands, `**bold**` becomes bold as
 * the closing `**` is typed, and `[]` at the start of a line becomes a checkbox
 * — as does `- [ ] ` inside a list, which is the spelling the file keeps. You
 * never see the syntax and then watch it change; the text just becomes the
 * thing it was describing. That is the whole difference between this and a
 * textarea with a preview beside it.
 *
 * ## Why a library and not a contentEditable
 *
 * The obvious cheaper version is a `contentEditable` div plus a markdown
 * parser that rewrites the block you are standing in. It looks like it works
 * and then eats your caret: `contentEditable` gives no DOM range that survives
 * re-rendering the node it is inside, so the moment a block is reformatted the
 * cursor jumps to the start of the document. Recovering from that reliably
 * means reimplementing the parts of ProseMirror that already exist and are
 * maintained. The dependency is worth it.
 *
 * ## Serialization
 *
 * Milkdown owns the document; markdown is how we persist it and how the rest of
 * the app reads it. `markdownUpdated` fires on every document change, so the
 * caller debounces the write rather than this component guessing at a cadence.
 * That is the opposite way round from a text editor, where the component
 * debounces and the storage is dumb — here `MemorySection` already owns the
 * save timer and the write-state, and a second debounce inside this component
 * would just make the visible state disagree with what has been written.
 *
 * `defaultValue` is read once, when the editor is constructed. Changing the
 * stored document underneath a live editor (a cross-tab edit, an import landing)
 * would need an explicit transaction to replace the document rather than a prop
 * change, so that is deliberately not attempted here — see `MemorySection`,
 * which reads storage before mounting this and remounts it by `key` when an
 * import rewrites the document wholesale.
 */
export function MarkdownEditor({
  defaultValue,
  onChange,
  className,
}: {
  defaultValue: string;
  onChange: (markdown: string) => void;
  className?: string;
}) {
  // Held in a ref so the editor — built once — always calls the current
  // callback without being torn down and rebuilt. A closure over `onChange`
  // directly would capture the first render's prop and go stale forever.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = host.current;
    if (!root) return;

    const crepe = new Crepe({
      root,
      defaultValue,
      features: {
        // Everything below is a control the page does not want. Crepe ships a
        // full Notion-like chrome by default — a floating toolbar, a slash
        // menu, image and LaTeX blocks. On a page that is meant to be a
        // document with a measure and nothing else, that chrome is the thing
        // most in the way, so it is switched off rather than restyled.
        [CrepeFeature.Toolbar]: false,
        [CrepeFeature.BlockEdit]: false,
        [CrepeFeature.ImageBlock]: false,
        [CrepeFeature.Latex]: false,
        [CrepeFeature.TopBar]: false,
        // The link chip with its edit and delete icons. Not merely unwanted
        // chrome — it was mounted in the page's flow at all, which is what put
        // a chain icon, a pencil and a bin under every paragraph. A link is
        // still a link here: typing one is enough to make it one.
        [CrepeFeature.LinkTooltip]: false,
        [CrepeFeature.AI]: false,
        [CrepeFeature.CodeMirror]: false,
        [CrepeFeature.Table]: false,
        // No placeholder. The page is a document with a label above it and
        // nothing else, and a prompt inside the writing area is a second thing
        // asking for attention in the place the user's own writing goes.
        [CrepeFeature.Placeholder]: false,
        // ListItem is what draws the checkbox, and it is the one feature that
        // has to stay on: it is the control the whole page exists for.
      },
      featureConfigs: {
        // Crepe's default checkbox is an SVG it draws in a neutral grey. These
        // are the same control in Pawzz's palette: a hairline square when
        // empty, a filled terracotta square with a white tick when done. Given
        // as strings because that is the shape `renderLabel` expects, and the
        // only way to recolour the control — it is an SVG, not an `<input>`, so
        // there is no `accent-color` or `::after` to reach from CSS.
        [CrepeFeature.ListItem]: {
          bulletIcon: BULLET_ICON,
          checkBoxCheckedIcon: CHECKED_ICON,
          checkBoxUncheckedIcon: UNCHECKED_ICON,
        },
      },
    });

    // `on` runs as soon as the editor is ready, which is async. The listener
    // registration therefore has to happen inside the builder rather than on a
    // later tick, or the first document change would be missed.
    crepe.on((api) => {
      api.markdownUpdated((_ctx, markdown, prev) => {
        if (markdown === prev) return;
        // Normalized here, at the one boundary where a document leaves the
        // editor, rather than in the caller — so no consumer of this component
        // can forget to.
        onChangeRef.current(toStoredMarkdown(markdown));
      });
    });

    // Async, so the task rule below can be added to a view that exists. A
    // `destroy()` that lands first — React unmounting mid-create — must not be
    // followed by an injection into a destroyed editor.
    let alive = true;
    void crepe.create().then(() => {
      if (!alive) return;
      const view = crepe.editor.action((ctx) => ctx.get(editorViewCtx));
      const plugin = taskTokenPlugin();
      view.updateState(
        view.state.reconfigure({ plugins: [...view.state.plugins, plugin] }),
      );
    });

    return () => {
      alive = false;
      void crepe.destroy();
    };
    // Built once. Re-running this would destroy the document and the caret with
    // it, so `defaultValue` is intentionally not a dependency — see the note on
    // hydration above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} className={cn(className)} />;
}
