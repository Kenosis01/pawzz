import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  isStepCount,
  smoothStream,
  streamText,
  type UIMessage,
} from "ai";

import { env } from "../../../env";
import { AUTO } from "../../../lib/models";
import {
  WIDGET_SYSTEM_PROMPT as SYSTEM_PROMPT,
  chatTools,
} from "../../../lib/widget-tools";
import { readCatalogue, isKnownModel } from "../models/catalogue";

/**
 * The chat endpoint: the only code in the app that talks to OpenRouter, and the
 * only code that reads `OPENROUTER_API_KEY`.
 *
 * The key stays on the server. The browser posts a transcript to this route and
 * reads a stream back; the key is never in the request, the response, or any
 * bundle the browser downloads — so there is nothing to find in devtools. That is
 * the whole reason this file exists as a route handler rather than a client-side
 * SDK call, and the reason the key is a server env var rather than a
 * `NEXT_PUBLIC_` one.
 *
 * The client is not trusted with anything it sends:
 *   - the model must be one OpenRouter actually publishes, checked against the
 *     same cached catalogue the UI lists, so a crafted request cannot aim the key
 *     at an arbitrary or expensive model. This is an allowlist, not a filter:
 *     an id we do not recognise is refused, not forwarded;
 *   - the transcript is re-validated by the SDK's own schema, and an empty or
 *     unparseable body is rejected before it costs a request.
 */
export async function POST(request: Request) {
  // Parsed as `unknown` and narrowed, never as the shape we want. `request.json()`
  // is `any`, and letting an `any` from the network reach this handler is how a
  // crafted body ends up being trusted as a model id or a message list.
  const body = await readBody(request);

  if (!body) return fail(400, "Malformed request body.");
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return fail(400, "No messages to answer.");
  }

  // Allowlist, not trust. Checked against the live catalogue so a model this app
  // has never heard of is refused rather than forwarded to a paid account.
  //
  // `AUTO` is the fallback rather than an error, so a stored preference for a
  // model that was withdrawn overnight still gets an answer instead of an error
  // — the user should never see a broken chat because a vendor retired a model.
  let modelId = AUTO.id;
  if (body.modelId && body.modelId !== AUTO.id) {
    const known = await isKnownModel(body.modelId);
    if (!known) {
      return fail(400, "That model is not available.");
    }
    modelId = body.modelId;
  }

  // Warming the cache here means the hot path is a cache read. A miss would still
  // be correct, just a second slower.
  void readCatalogue();

  const openrouter = createOpenAI({
    apiKey: env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const result = streamText({
    model: openrouter(modelId),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(body.messages),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    /**
     * The one tool the model has. It draws a visual and nothing else — the code
     * goes to the browser, which is the only party that can run it.
     */
    tools: chatTools,
    /**
     * More than one step, and the reason is the shape of a good answer rather
     * than the shape of the tool.
     *
     * A widget needs the sentence that introduces it before it, and the sentence
     * that draws a conclusion from it after. With a single step the model would
     * have to choose between the call and the prose, and every time it chose the
     * call the visual arrived with nothing around it. Six steps is generous
     * enough for a reply that legitimately holds three charts, and the limit is
     * still a limit: without one, a model that keeps calling the tool would loop
     * until it ran out of tokens.
     */
    stopWhen: isStepCount(MAX_TOOL_STEPS),
    /**
     * Pacing, here rather than in the browser.
     *
     * A fast model delivers a burst of tokens and then a pause, and read at face
     * value that is a slideshow: three lines appear, nothing moves, then twenty
     * more. Smoothing re-chunks the stream by *word* and spaces the words out, so
     * the text arrives at roughly reading speed no matter how the provider
     * happened to batch its tokens.
     *
     * It is a floor, not a metronome — a model already slower than this is left
     * alone, because the delay is per chunk and cannot make an answer arrive
     * earlier. That is the property that matters here: this can only remove
     * burstiness, never manufacture it.
     *
     * Done on the server because that is where the burst actually happens. A
     * client-only delay would be showing a lie about timing while the real stream
     * sat in a buffer.
     */
    experimental_transform: smoothStream({ delayInMs: STREAM_WORD_DELAY_MS, chunking: "word" }),
  });

  // Attribution headers. OpenRouter surfaces these on the model's page; they
  // carry no secrets and make the app attributable to whoever asks for it. The
  // referer is derived from the request rather than an env var, so it is correct
  // in preview deployments without anyone having to remember to set it.
  return result.toUIMessageStreamResponse({
    headers: {
      "X-Title": "Pawzz",
      "HTTP-Referer": new URL(request.url).origin,
    },
    onError: describeError,
  });
}

/**
 * A ceiling on the reply, in tokens.
 *
 * This used to be a money question, and it still reads like one, so the history
 * is worth keeping. OpenRouter pre-authorises a request against the account's
 * remaining balance, and several models default to an enormous ceiling:
 * `qwen3-max` asks for 65 536, `deepseek-r1` for 16 000. On a nearly empty
 * account a prompt that would have cost cents is refused up front with a 402,
 * because the *authorised* amount exceeds the *balance*. This cap was 2 048, then
 * 8 192 (which broke pre-authorisation outright — "you requested up to 8192
 * tokens, but can only afford 2553"), then 4 096, and every one of those numbers
 * was a compromise between widget size and what an account could be authorised
 * for.
 *
 * None of that applies any more. The app is free-models-only, a free model costs
 * nothing to authorise, and a 16 384 ceiling now goes through without a 402 —
 * verified against the live API, not assumed.
 *
 * So the ceiling is set by what a reply can usefully be, and 16 384 is that: a
 * widget is code, tool arguments are output tokens like any other text, and a
 * 2 048 cap produced charts truncated mid-attribute that rendered as empty
 * frames. The prompt still tells the model to keep one widget under about 120
 * lines, so this is headroom rather than an invitation to write an essay.
 *
 * `maxOutputTokens`, not `maxTokens`: the SDK renamed it in v5, and the old name
 * is not an error — it is silently dropped, leaving the model's own default in
 * force and making this line a no-op that looks like it works.
 */
const MAX_OUTPUT_TOKENS = 16384;

/**
 * How many model steps one reply may take.
 *
 * A step is one model call: its text, plus any tool it called. A reply that
 * introduces a chart, draws it and then comments on it is three, and the default
 * of one would truncate the model mid-thought the first time it reached for the
 * tool. Six leaves room for a reply holding several visuals while still refusing
 * to let a model that keeps calling the tool run until it exhausts its budget.
 */
const MAX_TOOL_STEPS = 6;

/**
 * Milliseconds between streamed words.
 *
 * ~12ms is about 80 words a second, which is at the top of comfortable reading
 * speed and well under what a fast model will emit. Slow enough to stop the
 * burst from being legible as a burst, fast enough that a long answer is not
 * padded out to a crawl.
 */
const STREAM_WORD_DELAY_MS = 12;

/**
 * Turns an upstream failure into something a person can act on.
 *
 * The SDK's default is the string "An error occurred." — true, useless. The two
 * failures this app actually hits are a 402 from an under-funded account and a
 * 401 from a rotated key, and both name their own remedy in the response body.
 * Passing that through is the difference between "something broke" and "add
 * credits at openrouter.ai".
 *
 * Provider responses are echoed rather than invented, but they are length-capped
 * and stripped of control characters, because this text is rendered in the
 * transcript: an upstream message is still input from the network.
 */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    const detail = error.message.trim();
    // APICallError carries the provider's own body in `message`; the generic
    // wrapper adds nothing a person can use.
    const text = detail && detail !== "An error occurred." ? detail : error.name;
    return sanitise(text);
  }
  return "The request failed.";
}

function sanitise(text: string): string {
  return text
    .slice(0, 400)
    // Control characters out: this is rendered in the transcript, and an upstream
    // error body is still untrusted network input.
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type ChatRequest = {
  messages: UIMessage[];
  modelId?: string;
};

/** Narrows the parsed body, or returns null if it is not the shape we serve. */
async function readBody(request: Request): Promise<ChatRequest | null> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;

  // The SDK validates the messages against its own schema on the way in, so this
  // only has to establish that there *is* a list to hand it.
  if (!Array.isArray(candidate.messages)) return null;

  return {
    messages: candidate.messages as UIMessage[],
    modelId:
      typeof candidate.modelId === "string" ? candidate.modelId : undefined,
  };
}

function fail(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
