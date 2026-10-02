"use client";

import { cn } from "../../lib/cn";

/**
 * The Pawzz bots (PRD §11, one step down from the mark).
 *
 * An agent used to be initials on a tinted circle, which made four identical
 * dots in four colours: the tint carried all of the identity, and a circle of
 * solid colour is the one shape that says "swatch" rather than "somebody". A
 * bot has a face, so the choice reads as a character instead of a colour code,
 * and at 22px the difference between an antenna and a visor is legible where
 * four shades of the same dot were not.
 *
 * Everything is drawn in `currentColor` and filled or stroked by proportion of
 * it — the head is a 14%-opacity fill under a full-strength outline, the eyes
 * are solid — so one set of paths serves every tint in the app's status
 * palette. Nothing here is a new hue, and nothing here is a filter or an
 * emoji font: a system emoji renders differently on every platform, so the
 * agent the user picked is not the agent their colleague sees.
 *
 * Four faces on a 24 grid, sharing one head size, one stroke weight and one
 * eye placement, so the set reads as one family. Motion: none. A mascot that
 * blinks is a mascot the user cannot get on with.
 */
export type BotFace = "antenna" | "visor" | "pods" | "crest";

/** Shared head outline: the same rounded rectangle on every face. */
const HEAD =
  "M8.6 6.6H15.4A4.8 4.8 0 0 1 20.2 11.4V15.8A4.8 4.8 0 0 1 15.4 20.6H8.6A4.8 4.8 0 0 1 3.8 15.8V11.4A4.8 4.8 0 0 1 8.6 6.6Z";

/** Shared eyes: two solid dots, 5.8 apart, centred in the head. The only
    face that does not use them is the crest, whose eyes are closed arcs. */
function Eyes() {
  return (
    <>
      <circle cx={9.1} cy={12.9} r={1.15} fill="currentColor" />
      <circle cx={14.9} cy={12.9} r={1.15} fill="currentColor" />
    </>
  );
}

/** Shared cheeks: the blush is what makes it cute rather than a schematic. */
function Blush() {
  return (
    <>
      <ellipse
        cx={6.9}
        cy={16.1}
        rx={1.3}
        ry={0.85}
        fill="currentColor"
        fillOpacity={0.34}
      />
      <ellipse
        cx={17.1}
        cy={16.1}
        rx={1.3}
        ry={0.85}
        fill="currentColor"
        fillOpacity={0.34}
      />
    </>
  );
}

/** Shared smile: one shallow arc, stroke only, round caps. */
function Smile({ d = "M10.3 16.9Q12 18.5 13.7 16.9" }: { d?: string }) {
  return (
    <path
      d={d}
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      fill="none"
    />
  );
}

export function BotMark({
  face,
  size = 24,
  className,
}: {
  face: BotFace;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={cn(className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <g strokeWidth={1.4} stroke="currentColor" strokeLinejoin="round">
        {face === "antenna" ? (
          <>
            <path d="M12 6.6V4.8" strokeLinecap="round" />
            <circle
              cx={12}
              cy={3.2}
              r={1.7}
              fill="currentColor"
              stroke="none"
            />
          </>
        ) : null}

        {face === "visor" ? (
          <>
            {/* Side pods, the one silhouette cue that has to sit outside the
                head to read at 22px. */}
            <rect
              x={1.9}
              y={10.6}
              width={2.6}
              height={5}
              rx={1.3}
              fillOpacity={0.14}
            />
            <rect
              x={19.5}
              y={10.6}
              width={2.6}
              height={5}
              rx={1.3}
              fillOpacity={0.14}
            />
          </>
        ) : null}

        {face === "pods" ? (
          <>
            <circle cx={3.6} cy={13.6} r={2.5} fillOpacity={0.14} />
            <circle cx={20.4} cy={13.6} r={2.5} fillOpacity={0.14} />
          </>
        ) : null}

        {face === "crest" ? (
          <path
            d="M8.9 6.7 12 2.9l3.1 3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        <path d={HEAD} fill="currentColor" fillOpacity={0.14} />

        {face === "visor" ? (
          <rect
            x={6.8}
            y={10.4}
            width={10.4}
            height={4.6}
            rx={2.3}
            fill="currentColor"
            fillOpacity={0.2}
          />
        ) : null}

        {face === "crest" ? (
          /* Happy-closed eyes: two arcs where the others have dots. */
          <>
            <path
              d="M8.3 13.2q0.95-1.6 1.9 0"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M13.8 13.2q0.95-1.6 1.9 0"
              strokeLinecap="round"
              fill="none"
            />
          </>
        ) : (
          <Eyes />
        )}

        {face === "visor" ? <Smile d="M10.6 17.2q1.4 1.5 2.8 0" /> : <Smile />}
        {/* The visor face keeps its cheeks inside the band, so it goes without
            them — two blush marks under a visor is a mark nobody can place. */}
        {face === "visor" ? null : <Blush />}
      </g>
    </svg>
  );
}
