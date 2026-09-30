/**
 * The greeting (PRD §10). One line, one line of logic. It changes with the
 * time of day and nothing else — a rotating set of variants reads as noise
 * rather than warmth.
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

function salutation(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function greetFor(date: Date = new Date(), name: string | null = getName()): string {
  const hello = salutation(date.getHours());
  return name ? `${hello}, ${name}` : hello;
}
