import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),

    /**
     * OpenRouter API key.
     *
     * Lives in the `server` block on purpose. `@t3-oss/env-nextjs` replaces this
     * object with an empty stub on the client and *throws* if a client bundle
     * tries to read a server key, so a stray `env.OPENROUTER_API_KEY` in a
     * component fails the build rather than shipping the secret to devtools.
     *
     * The key is only ever read by `src/app/api/chat/route.ts`, which runs on
     * the server. The browser talks to that route; it never sees the key.
     *
     * A failing format check at boot is deliberate. A malformed key would
     * otherwise surface as a confusing 401 from OpenRouter on the first message
     * instead of naming the variable that is wrong.
     */
    OPENROUTER_API_KEY: z
      .string()
      .min(1, "OPENROUTER_API_KEY is empty")
      .startsWith("sk-or-", "OPENROUTER_API_KEY does not look like an OpenRouter key"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
