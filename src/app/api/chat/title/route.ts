import { generateText } from "ai";

import { env } from "../../../../env";
import { AUTO } from "../../../../lib/models";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Names a conversation.
 *
 * The user's first prompt is a poor title on its own: it is however long they
 * happened to type, it is whatever question they were holding at the time
 * ("hi", "fix this"), and it is written as an instruction rather than as a
 * description of the thread. A history full of those cannot be scanned, which is
 * the only reason a history exists.
 *
 * So the model is asked for the title instead. Kept to a separate, cheap call
 * rather than folded into the reply: the answer is needed as soon as the first
 * prompt is sent, and waiting for a several-hundred-word essay to finish before
 * the thread is named would leave it untitled for most of its life.
 *
 * The same key discipline as the chat route — read only here, on the server, and
 * never returned to the browser.
 */
export async function POST(request: Request) {
  let prompt = "";
  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null) {
      const candidate = (body as { prompt?: unknown }).prompt;
      // Bounded here rather than trusting the caller's length, because this text
      // goes into a model prompt and the endpoint is reachable by anyone who can
      // reach the app.
      if (typeof candidate === "string") prompt = candidate.slice(0, 2000);
    }
  } catch {
    return fail(400, "Malformed request body.");
  }

  if (!prompt.trim()) return fail(400, "Nothing to name.");

  try {
    const openrouter = createOpenAI({
      apiKey: env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });

    // Tried twice, because the failure this guards against is a coin flip rather
    // than a fault: Auto may hand the call to a reasoning model that spends the
    // whole budget thinking and returns nothing. One retry is the difference
    // between a thread that is occasionally named and one that is always named.
    let raw = "";
    for (let attempt = 0; attempt < 2 && !raw.trim(); attempt++) {
      const result = await generateText({
        // `AUTO` rather than a named model. Naming needs no reasoning budget, so
        // a router picking something cheap is better than a hardcoded choice —
        // and a hardcoded id is a thing that rots. The previous version pinned a
        // specific `meta-llama/…` model, which broke the moment that model was
        // withdrawn upstream and could not be exercised by the app's own picker.
        // This is the same fallback the chat route already uses for an unknown
        // model id, so there is one place that decides what to do when a model
        // is unavailable.
        model: openrouter(AUTO.id),
        system:
          "You name things. Given a message that opened a conversation, reply with " +
          "a title of at most six words for that conversation. Describe the subject, " +
          "not the message: what someone would call this thread later. No quotes, no " +
          "trailing punctuation, no preamble, no explanation. Reply with the title and " +
          "nothing else.",
        prompt,
        // 1 024, not the ~20 the title actually needs.
        //
        // The ceiling has to cover the model's *thinking* as well as its answer,
        // because Auto routes to whatever OpenRouter thinks is cheapest for the
        // job and that set includes reasoning models. A reasoning model spends its
        // output budget on reasoning first, so a 24-token cap left nothing for the
        // title at all: `text` came back empty and every thread kept its fallback
        // name. It only ever worked because the earlier hardcoded model happened to
        // be a non-reasoning one.
        //
        // 256 was the next attempt and still lost the race often enough that
        // threads went unnamed: the route answered 502, the caller treated a
        // non-2xx as "no name", and nothing tried again. 1 024 covers reasoning
        // plus the title with room to spare, and it is still inside the chat
        // route's 2 048 pre-authorisation — so a naming call cannot turn into the
        // 402 that a 64k default ceiling would.
        //
        // `maxOutputTokens`, not `maxTokens`: the SDK renamed it in v5.
        maxOutputTokens: 1024,
      });
      raw = result.text;
    }

    const title = tidy(raw);
    if (!title) return fail(502, "The model did not return a title.");

    return Response.json({ title });
  } catch {
    // The caller falls back to the first line of the prompt, so a failure here
    // costs a slightly worse title and nothing else.
    return fail(502, "Could not name the conversation.");
  }
}

/** Strips whatever the model wrapped the title in, and bounds its length. */
function tidy(raw: string): string {
  const line = raw
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0);
  if (!line) return "";
  return line
    .replace(/^["'`\s]+|["'`\s.]+$/g, "")
    .replace(/^(title|name)\s*[:\-]\s*/i, "")
    .slice(0, 80)
    .trim();
}

function fail(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
