/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const config = {
  // There is a stray bun.lock in the home directory, which Next finds while
  // walking up and then treats as the workspace root — which widens the file
  // trace and slows every build. Pin it to this project.
  outputFileTracingRoot: projectRoot,
};

export default config;
