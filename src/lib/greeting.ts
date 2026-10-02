/**
 * The greeting (PRD §10). One line, shown only on the empty chat state.
 *
 * This used to be `hour < 12 ? morning : hour < 18 ? afternoon : evening` —
 * three static strings that anyone opening the app twice in one afternoon saw
 * twice, identical. A greeting that cannot change is furniture, not a welcome.
 *
 * So: a bank of lines per part of day, each one a question, a tip, or a small
 * observation about the hour. Picked at random, so two people opening Pawzz at
 * the same minute get different lines, and the same person on two visits is
 * unlikely to see the same one twice in a row.
 *
 * The late-night and early-morning banks are deliberately not "good evening"
 * again. At 01:00 the fact that you are still up is the most conversational
 * thing Pawzz can say, and it is the thing a static salutation cannot notice.
 */

const NAME_KEY = "pawzz.name";

export function getName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
}

export function setName(name: string): void {
  try {
    const trimmed = name.trim();
    if (trimmed) localStorage.setItem(NAME_KEY, trimmed);
    else localStorage.removeItem(NAME_KEY);
  } catch {
    // A blocked storage should never break onboarding.
  }
}

/** Which bank a given hour draws from. Boundaries are hour-of-day local. */
function part(hour: number): "night" | "morning" | "afternoon" | "evening" {
  // 00:00–04:59 and 23:00–23:59 both count as night: past midnight and just
  // before it are the same experience, and splitting them would leave both
  // banks too small to feel varied.
  if (hour < 5 || hour >= 23) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/**
 * The lines.
 *
 * Every one is short enough to hold a single line at the greeting's size on an
 * ordinary laptop window. They were two sentences each — "Almost the end of the
 * day. What should we finish?" is 45 characters — and 45 characters of Cormorant
 * at 40px is 700px of text, which wraps on anything under about 900px. The
 * greeting is a line above a prompt box, not a headline: if it wraps, it is
 * competing with the thing the user is about to type into.
 *
 * So one short sentence each, and the longest is 25 characters. Any future line
 * added here should be checked against that budget, not against how it reads
 * alone in the source.
 */
const LINES: Record<ReturnType<typeof part>, readonly string[]> = {
  night: [
    "Night owl.",
    "Still up?",
    "Late one.",
    "Quiet hours.",
    "Burning midnight oil.",
  ],
  morning: [
    "How are the things?",
    "Morning.",
    "Fresh start.",
    "What are we working on?",
    "A clean slate.",
  ],
  afternoon: [
    "How are the things?",
    "Afternoon.",
    "What are we working on?",
    "What’s next?",
    "Halfway there.",
  ],
  evening: [
    "Evening.",
    "How are the things?",
    "Winding down.",
    "What are we working on?",
    "What should we finish?",
  ],
};

/**
 * A greeting line for a moment in time.
 *
 * `name` is used only by the salutation forms. When the picked line has no
 * salutation in it the name is dropped rather than tacked on, because
 * "How are the things, Ada?" is a different — and much worse — sentence than
 * "How are the things?" It is also 22 characters against 19, and the character
 * budget is what keeps this on one line.
 */
export function greetFor(
  date: Date = new Date(),
  name: string | null = getName(),
): string {
  const bank = LINES[part(date.getHours())];
  const line = bank[Math.floor(Math.random() * bank.length)] ?? bank[0]!;

  // Only the handful of lines that are literally a salutation take a name.
  if (!name || !/^(Night owl|Still up|Late one|Quiet hours|Morning|Afternoon|Evening)\b/.test(line)) {
    return line;
  }
  return `${line.replace(/[,—].*$/, "")}, ${name}`;
}