import { catalogueForDisplay } from "./catalogue";

/**
 * The model catalogue, fetched from OpenRouter (PRD §14).
 *
 * Proxied through the app rather than called from the browser, for three reasons
 * that all point the same way:
 *
 *   - the catalogue is ~20 kB of JSON and changes on the order of daily, so it is
 *     cached hard on the server rather than refetched by every open tab;
 *   - it keeps the app's only third-party dependency on the server, matching the
 *     rule the chat route follows with the key;
 *   - and it is the same cached copy the chat route validates against, so a model
 *     offered here is a model accepted there.
 *
 * No API key is sent. OpenRouter publishes the catalogue to anyone, and spending
 * a credential to read a public list would be spending it for nothing.
 */
export async function GET() {
  try {
    const { models, fetchedAt } = await catalogueForDisplay();

    return Response.json(
      { models, fetchedAt },
      {
        headers: {
          // Shared caches may hold this briefly. A stale catalogue is harmless for
          // far longer than a stale transcript would be.
          "Cache-Control": "public, max-age=0, s-maxage=300",
        },
      },
    );
  } catch {
    // 503 rather than a 200 with an empty list: the client distinguishes "could
    // not load" from "there are no models", and shows the difference.
    return new Response("Could not load the model catalogue.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
