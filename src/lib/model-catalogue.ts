/**
 * Turning OpenRouter's `/models` payload into our `Model` shape.
 *
 * Shared by the server route that fetches and the chat route that validates,
 * because a model the UI can offer but the route will not accept is a dead row,
 * and a model the route accepts but the UI never shows is a hidden one. Both
 * sides running the same function is what keeps the two honest.
 *
 * The wire format is large and mostly irrelevant: there are fields for voice
 * cloning and per-request limits that have nothing to do with answering a chat
 * message, and ~80 kB of provider marketing prose that no surface renders. Only
 * the handful of fields a row actually displays cross this boundary, which took
 * the catalogue from 183 kB to 101 kB.
 */

import { AUTO as AUTO_ROUTER, isFreeModel } from "./models";

/** The fields we read. Declared so a shape change is a type error, not `any`. */
export type OpenRouterModel = {
  id: string;
  name: string;
  context_length: number | null;
  architecture: {
    modality: string | null;
    input_modalities: string[] | null;
    output_modalities: string[] | null;
  } | null;
  pricing: {
    prompt: string | null;
    completion: string | null;
  } | null;
  supported_parameters: string[] | null;
};

/**
 * A model can answer a chat message only if text comes back out.
 *
 * This filters very little in practice — OpenRouter's catalogue is almost
 * entirely chat models, and the multimodal ones (text+image+video→text and so
 * on) are all legitimately promptable. It is here because the handful of rows
 * that are *not* — embeddings, image generators, rerankers — do exist, and
 * offering one as "pick this to answer your message" is a dead row rather than a
 * harmless extra.
 */
function canAnswerText(model: OpenRouterModel): boolean {
  const outputs = model.architecture?.output_modalities;
  return Array.isArray(outputs) && outputs.includes("text");
}

function acceptsImages(model: OpenRouterModel): boolean {
  const inputs = model.architecture?.input_modalities;
  return Array.isArray(inputs) && inputs.includes("image");
}

/**
 * `reasoning_effort` in the advertised parameters is the provider stating that
 * the model takes a thinking budget. More reliable than matching "r1" in a name,
 * which misfires on every model called something-Reasoning-v2 regardless of
 * whether it actually does it.
 */
function isReasoning(model: OpenRouterModel): boolean {
  return (model.supported_parameters ?? []).includes("reasoning_effort");
}

/**
 * `meta-llama/llama-4-scout` → `Meta`.
 *
 * Taken from the id rather than the display name because OpenRouter's names are
 * already prefixed inconsistently — some say "Meta:", some say "Meta Llama", and
 * some are the vendor's marketing name with no vendor in it. The id prefix is
 * the only part that is reliably the vendor.
 */
export function providerOf(id: string): string {
  const prefix = id.split("/")[0];
  if (!prefix) return "Other";

  // `deepseek`, `meta-llama`, `mistralai` → a readable vendor name.
  const known: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    "google-deepmind": "Google DeepMind",
    meta: "Meta",
    "meta-llama": "Meta",
    mistralai: "Mistral",
    deepseek: "DeepSeek",
    qwen: "Qwen",
    "x-ai": "xAI",
    cohere: "Cohere",
    nousresearch: "Nous",
    nvidia: "NVIDIA",
    ari: "Aria",
    "z-ai": "Z.ai",
  };
  return known[prefix] ?? titleCase(prefix);
}

function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => (word.length <= 2 ? word.toUpperCase() : word[0]?.toUpperCase() + word.slice(1)))
    .join(" ");
}

/**
 * Normalised to **dollars per million tokens**, which is the unit a person
 * compares models in.
 *
 * OpenRouter sends dollars *per token*, so a $3/Mtok model arrives as
 * `0.000003`. That value is the right answer to a different question: rendering
 * it with two decimal places shows `$0.00` for every paid model in the
 * catalogue, which reads as "free" and is worse than showing nothing. Scaling
 * once, here, means no consumer has to remember the conversion.
 */
const TOKENS_PER_MTOK = 1_000_000;

/** `undefined` for a price the provider did not state, rather than a fake 0. */
function pricePerMtok(raw: string | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  const value = Number(raw);
  // OpenRouter sends "-1" for "varies", which is not a price. Reported as 0 so
  // the row shows neither a negative number nor a misleading figure.
  return Number.isFinite(value) && value > 0 ? value * TOKENS_PER_MTOK : 0;
}

/** Descriptions are not carried at all — see `AUTO_DESCRIPTION` in `models.ts`. */
export function toModel(raw: OpenRouterModel) {
  return {
    id: raw.id,
    name: raw.name?.trim() || raw.id,
    provider: providerOf(raw.id),
    contextLength: raw.context_length ?? 0,
    priceIn: pricePerMtok(raw.pricing?.prompt),
    priceOut: pricePerMtok(raw.pricing?.completion),
    modality: acceptsImages(raw) ? ("vision" as const) : ("text" as const),
    reasoning: isReasoning(raw),
  };
}

/**
 * The answerable **free** models, in the order they should be listed.
 *
 * Two filters, and the second is the one that costs money if it is wrong.
 * `canAnswerText` drops embeddings and image generators; `isFreeModel` drops
 * everything with a price. The app is built to spend nothing on inference, and
 * the only place that can be enforced is here — a model the picker never offers
 * is a model the chat route's allowlist never accepts, so the guarantee is
 * structural rather than a matter of trusting the client.
 *
 * `openrouter/free` is filtered out along with `openrouter/auto`: both are
 * routers rather than rows, and the caller prepends the one the app defaults to.
 * Leaving it in would render the default twice.
 */
export function normaliseCatalog(models: OpenRouterModel[]) {
  return models
    .filter(canAnswerText)
    .filter((model) => isFreeModel(model.id))
    .map(toModel)
    .filter((model) => model.id !== AUTO_ROUTER.id && model.id !== "openrouter/auto")
    .sort((a, b) => a.name.localeCompare(b.name));
}
