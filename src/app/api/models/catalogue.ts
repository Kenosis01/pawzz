import { unstable_cache } from "next/cache";

import {
  normaliseCatalog,
  type OpenRouterModel,
} from "../../../lib/model-catalogue";
import { AUTO, isAuto, isFreeModel } from "../../../lib/models";

/**
 * The one place the server talks to OpenRouter's model list.
 *
 * Both the catalogue route and the chat route read through here, so they can
 * never disagree: a model the settings tab offers is a model the chat route will
 * accept, and both see the same snapshot. Two independent fetches would let those
 * drift for the length of a cache window — long enough for a user to pick a
 * model and be told it does not exist.
 *
 * Server-only by construction: this module is imported from route handlers and
 * uses `cache` from React, so it must never be pulled into a client bundle.
 */

const UPSTREAM = "https://openrouter.ai/api/v1/models";

/**
 * An hour. Long enough that a busy tab is not re-fetching, short enough that a
 * withdrawn model is gone by the next morning rather than at the next deploy —
 * which was the argument for fetching a catalogue instead of hardcoding one.
 */
const REVALIDATE_SECONDS = 3600;

type Catalogue = {
  models: ReturnType<typeof normaliseCatalog>;
  fetchedAt: number;
};

/**
 * `unstable_cache` persists the result across requests and revalidates on the
 * window above. `next.revalidate` alone would only dedupe within a single render
 * pass, which is not the same thing and would not survive a second visitor.
 */
/**
 * Bump when the *shape* of the normalised output changes, or when the filter
 * applied to it does. v4 added the free-only filter, so a v3 cache entry would
 * otherwise keep serving paid models for the rest of the hour after a deploy.
 *
 * `unstable_cache` is keyed by the name passed to it, not by the code that fills
 * it. So a field added or removed here is invisible to the cache, and the next
 * deploy happily serves the previous shape for the rest of the hour — which
 * shows up as a row rendering `undefined` rather than as a build error. Putting
 * the version in the key makes a shape change invalidate the cache by
 * construction.
 */
const CATALOGUE_VERSION = "v4";

export const readCatalogue = unstable_cache(
  async (): Promise<Catalogue> => {
    const response = await fetch(UPSTREAM, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter returned ${response.status}`);
    }

    const payload: unknown = await response.json();
    const raw = readModels(payload);
    const models = normaliseCatalog(raw);

    // An empty catalogue is not a valid state: it would render a picker with
    // nothing in it, and make the chat route refuse every model. Treated as an
    // upstream failure so clients keep whatever they already had.
    if (!models.length) throw new Error("OpenRouter returned no usable models");

    return { models, fetchedAt: Date.now() };
  },
  ["openrouter-model-catalogue", CATALOGUE_VERSION],
  { revalidate: REVALIDATE_SECONDS },
);

/**
 * Is this an id we will actually run, and for free?
 *
 * The chat route's allowlist. It is the same filtered list the picker shows, so
 * the two cannot drift: a model the settings tab offers is a model the chat route
 * will accept, and a paid one is in neither.
 */
export async function isKnownModel(id: string): Promise<boolean> {
  if (isAuto(id)) return true;
  try {
    const { models } = await readCatalogue();
    return models.some((model) => model.id === id);
  } catch {
    // The catalogue is unreachable. Refusing every model would take chat down
    // entirely over a metadata fetch, so this degrades to a shape check — but the
    // shape check has to include the free suffix, not just `vendor/model`.
    //
    // The earlier version accepted any well-formed id, which quietly undid the
    // whole point of the filter: a client asking for `openai/gpt-4o` on a request
    // that happened to arrive while the catalogue was being refetched would be
    // forwarded, and would be paid for. The one path where we have not seen the
    // list is not the path to be generous on.
    return isAuto(id) || (looksLikeFreeModelId(id) && isFreeModel(id));
  }
}

/**
 * A last-resort shape check, used only when the catalogue could not be fetched.
 *
 * OpenRouter ids are always `vendor/model`, and the vendor is a lowercase slug.
 * Without this, an unreachable catalogue would forward whatever string arrived.
 */
function looksLikeFreeModelId(id: string): boolean {
  return /^[\w.-]+\/[\w.:-]+$/.test(id) && id.length <= 120;
}

/** The catalogue for the settings tab and the picker: Auto first, then the rest. */
export async function catalogueForDisplay() {
  const { models, fetchedAt } = await readCatalogue();
  return { models: [AUTO, ...models], fetchedAt };
}

function readModels(payload: unknown): OpenRouterModel[] {
  if (typeof payload !== "object" || payload === null) return [];
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data.filter(
    (entry): entry is OpenRouterModel =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { id?: unknown }).id === "string",
  );
}
