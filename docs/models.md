# Models

Pawzz does not hardcode a model list. It fetches the catalogue from OpenRouter,
filters it to the free models that output text, and lets the user curate a
shortlist. This document covers the model shape, the fetch, the free-only
guarantee, and the picker.

## Files

| File | Role |
| --- | --- |
| `src/lib/models.ts` | the `Model` type, the `AUTO` entry, `isAuto`, `isFreeModel`, `AUTO_DESCRIPTION` |
| `src/lib/model-catalogue.ts` | `OpenRouterModel` wire type, `toModel`, `normaliseCatalog`, `providerOf`, `pricePerMtok` |
| `src/app/api/models/catalogue.ts` | the cached fetch (`readCatalogue`), `isKnownModel`, `catalogueForDisplay` |
| `src/app/api/models/route.ts` | `GET /api/models` |
| `src/lib/model-catalogue-context.tsx` | the client half: fetches the list, holds the enabled shortlist |
| `src/lib/model-preference.ts` | the default model id, effort level, thinking toggle |
| `src/components/chat/composer/ModelPicker.tsx` | the composer's picker |
| `src/screens/settings/sections/ModelsSection.tsx` | Settings → Models: the default, and the enable switches |

## The `Model` shape

```ts
type Modality = "text" | "vision";

type Model = {
  id: string;          // the provider's id, used verbatim as the API model
  name: string;
  provider: string;    // derived from the id prefix
  contextLength: number;
  priceIn: number;     // USD per million tokens; 0 means free
  priceOut: number;
  modality: Modality;  // "vision" iff the model accepts image input
  reasoning: boolean;  // advertises reasoning_effort
};
```

- There is **no internal id**. The provider's id is the API model, so there is
  nothing to map.
- Prices are **scaled to dollars per million tokens** at the fetch boundary
  (`pricePerMtok`). OpenRouter sends dollars per token, which renders as `$0.00`
  at two decimal places for every paid model.
- `provider` comes from the id prefix (`meta-llama/x` → `Meta`), not the display
  name, because OpenRouter's names are prefixed inconsistently. See `providerOf`.
- `reasoning` is read from `supported_parameters` containing `reasoning_effort`,
  which is more reliable than matching "r1" in a name.
- Descriptions are **not carried at all** — they were ~80 kB of provider marketing
  prose that no surface renders.

## Auto

`AUTO` is a **routing mode**, not a row in the catalogue:

```ts
{ id: "openrouter/free", name: "Auto", provider: "OpenRouter", … }
```

- It is `openrouter/free` — OpenRouter's **free-only** router. (It used to be
  `openrouter/auto`, which routes across the whole catalogue including paid
  models, making every other cost guarantee in the app untrue.)
- It is pinned first, always enabled, and cannot be switched off. A picker with
  nothing in it is not a state worth supporting.
- It never appears in `normaliseCatalog` output; `catalogueForDisplay` prepends
  it, so it cannot render twice.

## The free-only guarantee

`normaliseCatalog` applies, in order:

1. `canAnswerText` — the model's `output_modalities` includes `"text"`. This
   drops embeddings, image generators and rerankers, which would be dead rows.
2. `isFreeModel` — the id ends with `:free`.
3. drop `openrouter/free` and `openrouter/auto` (routers, not rows).
4. sort by name.

**Why the suffix and not the price.** `toModel` reports a price of `0` for three
different things: genuinely free, not stated, and OpenRouter's `"-1"` for
"varies". Reading cost off the price would let any model that declined to publish
a price through a filter whose whole job is to keep spending at zero. The `:free`
suffix is the only signal that says *free* without inferring it.

This is enforced in one place, and both the picker and the chat route read it, so
the guarantee is structural: a model the picker never offers is a model the
allowlist never accepts.

## The fetch

`readCatalogue` (`src/app/api/models/catalogue.ts`):

- fetches `https://openrouter.ai/api/v1/models`;
- is wrapped in `unstable_cache` with a **3 600 s** window (and the inner `fetch`
  also revalidates at 3 600 s), so one fetch serves every tab;
- throws if the response is not `ok` **or if the filtered list is empty** — an
  empty catalogue is treated as an upstream failure, not as a valid state, so
  clients keep the list they already had.

`CATALOGUE_VERSION` is part of the cache key. **Bump it** whenever you change the
normalised shape or the filter; `unstable_cache` is keyed by name, not by the
code that fills it, so without a bump the next deploy serves the previous shape
for the rest of the hour.

`catalogueForDisplay` returns `[AUTO, ...models]` plus `fetchedAt`.

## The allowlist on the chat route

`isKnownModel(id)` returns true for `openrouter/free` and for any id in the
cached list. If the catalogue is unreachable it degrades to a shape check
(`looksLikeFreeModelId` **and** `isFreeModel`) — not "accept everything", which
would undo the filter during a refetch, and not "refuse everything", which would
take chat down over a metadata fetch.

## Client state

`ModelCatalogueProvider` fetches `/api/models` once, stores the list in state,
and holds the **enabled** shortlist in `pawzz.models.enabled.v1`.

**Why the enabled set is stored, not the disabled set.** OpenRouter publishes
hundreds of answerable models, so "everything on" is not a usable default — the
picker becomes a directory rather than a choice. Storing the *enabled* set makes
the default a one-item shortlist (Auto alone) that grows as the user curates it.

The cost: a model released tomorrow arrives **switched off**. That is the right
trade — it shows up in Settings with a switch, rather than silently becoming one
more row in a dropdown.

`null` is distinct from `[]`: `null` means the user has never chosen (start with
Auto alone); `[]` would mean "the user switched everything off", which is not a
state the UI should silently treat as the default. Auto is always re-added on
write, so a shortlist that lost it is repaired rather than producing an empty
picker.

`resolve(id)` always returns a real `Model`, falling back to `AUTO` for an id the
catalogue does not know — which is the right answer for a withdrawn model or a
stale stored preference.

## Preference

`useModelPreference` stores an **id**, never a `Model` object: the catalogue is
fetched, so no `Model` exists at first render, and persisting one would save a
name and a price that go stale the moment the catalogue is refetched.

It also owns:

- **effort** — `low | medium | high | extra | max`, default `medium`
- **thinking** — a boolean

Both are stored but not yet sent to the API; see [Status](./status.md).

## UI surfaces

- **Composer picker** (`ModelPicker.tsx`) lists the *enabled* set, filterable,
  with a link to Settings. It flies an **effort** panel out to the side (a
  different question — how to answer — from which model answers).
- **Settings → Models** (`ModelsSection.tsx`) is where the shortlist is curated:
  search, provider filter, "Switch all on", "Auto only", and a `SquishSwitch`
  per row. Switching off the current default moves the default back to Auto.

## Adding a model provider

The app is written against OpenRouter's catalogue format and its `:free`
convention. A second provider would need:

1. a normaliser producing the same `Model` shape;
2. a definition of "free" for that provider (the `:free` suffix is
   OpenRouter-specific);
3. the allowlist and the picker to branch on provider — currently both assume one
   catalogue.