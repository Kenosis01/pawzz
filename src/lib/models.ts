/**
 * Model catalogue (PRD §14, §51).
 *
 * The list of models is *not* written here. It is fetched from OpenRouter, so a
 * model that ships tomorrow appears tomorrow without a deploy, and one that is
 * withdrawn disappears rather than 404ing at the moment someone picks it. This
 * module owns only the two things that are genuinely ours: the shape, and Auto.
 *
 * A previous version hardcoded five models with their provider ids. That went
 * stale quietly — the composer would offer a model the catalogue no longer had,
 * and the fix required remembering to edit a TypeScript array.
 */

export type Modality = "text" | "vision";

export type Model = {
  /**
   * The provider's own identifier, used verbatim as the API model. There is no
   * separate internal id: the reason for splitting them was to avoid a hardcoded
   * mapping table, and once the catalogue is fetched there is nothing to map.
   */
  id: string;
  name: string;
  /** The vendor, taken from the id prefix — `meta-llama/x` → `Meta`. */
  provider: string;
  contextLength: number;
  /**
   * US dollars per million tokens. `0` means the provider lists it as free.
   *
   * Scaled at the fetch boundary from OpenRouter's per-token figure, so a $3/Mtok
   * model reads as `3` here rather than as `0.000003` — see `pricePerMtok`.
   */
  priceIn: number;
  priceOut: number;
  /** Accepts images, so it can be sent the attachments in a message. */
  modality: Modality;
  /** The provider advertises `reasoning_effort`, so it thinks before answering. */
  reasoning: boolean;
};

/**
 * Auto's explanation (PRD §14). A constant rather than a field on `Model`,
 * because it is the only row in the app with one — every other model's blurb is
 * provider marketing prose that no surface renders, and carrying 458 of them
 * over the wire was 44% of the catalogue's size.
 */
export const AUTO_DESCRIPTION =
  "Automatically chooses the best available free model for the task.";

/**
 * Auto is a routing mode, not a model, and is the one entry we do not fetch.
 *
 * It routes within the free tier and nothing else: `openrouter/free` is OpenRouter's
 * free-only router, and the catalogue it draws from is filtered to `:free` ids.
 *
 * It is pinned here, always first, and cannot be disabled — a model picker with
 * nothing in it is not a state worth supporting, and this exists precisely so
 * that state is never reached.
 *
 * This was `openrouter/auto`, which routes across the whole catalogue including
 * paid models. A router that can pick a paid model makes every other guarantee
 * about cost in this app untrue, and the balance is the last thing to find out
 * about.
 */
export const AUTO: Model = {
  id: "openrouter/free",
  name: "Auto",
  provider: "OpenRouter",
  contextLength: 0,
  priceIn: 0,
  priceOut: 0,
  modality: "text",
  reasoning: false,
};

/** Ids the app will never let a client aim the key at, whatever it sends. */
export function isAuto(id: string): boolean {
  return id === AUTO.id;
}

/**
 * Is this a model the app is willing to spend nothing on?
 *
 * Keyed on OpenRouter's `:free` suffix rather than on a price of zero, and the
 * distinction matters. `toModel` reports a price of `0` for three different
 * things: genuinely free, not stated, and the string `"-1"` that OpenRouter uses
 * for "varies". Reading cost off the price would therefore let any model that
 * declined to publish a price through a filter meant to keep spending at zero —
 * which is the one thing this filter exists to guarantee.
 *
 * The suffix is a naming convention OpenRouter applies to a free variant of a
 * model, and it is the only signal that says free without inferring it.
 */
export function isFreeModel(id: string): boolean {
  return id.endsWith(":free");
}
