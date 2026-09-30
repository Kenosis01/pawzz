"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";

import styles from "./SquishSwitch.module.css";

/**
 * A switch whose thumb squashes along its travel direction.
 *
 * Built on springs rather than a CSS transition because the effect is velocity,
 * not state: the thumb stretches in the direction it is moving and recovers as it
 * slows. A transition cannot know how fast the thumb is going, so it can only
 * animate between two fixed shapes — which is a scale, not a squish.
 *
 * Also draggable, because a switch that can only be clicked is a 44px target for
 * a binary choice. Dragging past the midpoint commits, which is the same rule
 * every native switch uses.
 *
 * Colours default to the project's tokens rather than the literals this was
 * authored with, so it follows the theme instead of fighting it.
 */
export function SquishSwitch({
  checked,
  defaultChecked = false,
  onChange,
  label,
  disabled = false,
  width = 44,
  height = 24,
  radius,
  speed = 50,
  stretch = 36,
  hoverScale = 1.035,
  colorDuration = 320,
  ariaLabel,
  className,
  id,
}: {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  width?: number;
  height?: number;
  radius?: number;
  speed?: number;
  stretch?: number;
  hoverScale?: number;
  colorDuration?: number;
  ariaLabel?: string;
  className?: string;
  id?: string;
}) {
  const reduce = useReducedMotion();
  const inset = Math.max(2, Math.round(height * 0.12));
  const thumb = height - inset * 2;
  const min = inset;
  const max = width - inset - thumb;
  const mid = (min + max) / 2;
  // `max` is a number; the cast only silences the index-undefined check.
  const trackRadius = radius ?? Math.min(height / 2, 999);
  const thumbRadius = Math.max(2, trackRadius - inset);

  const isControlled = checked !== undefined;
  const [inner, setInner] = useState(defaultChecked);
  const on = isControlled ? checked : inner;
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLSpanElement>(null);
  const grip = useRef<{
    id: number;
    grab: number | null;
    moved: boolean;
    startX: number;
    onAtPress: boolean;
    slop: number;
  } | null>(null);
  const onRef = useRef(on);
  onRef.current = on;
  // The pointer handlers and the click both fire for one interaction, so the
  // click is told whether the gesture already committed.
  const skipClick = useRef(false);
  const autoId = useId();
  const buttonId = id ?? autoId;

  const x = useMotionValue(on ? max : min);
  const flow = useSpring(useVelocity(x), { stiffness: 320, damping: 40, mass: 0.6 });
  const swell = useSpring(1, { stiffness: 520, damping: 34, mass: 0.6 });

  // Volume-preserving: the thumb stretches along travel and thins across it by the
  // same factor, so it never changes area and never looks like it is shrinking.
  const gain = reduce ? 0 : clamp(stretch, 0, 100) / 100;
  const stretchOf = (v: number) =>
    1 + Math.min(0.4, Math.abs(v) / 600) * gain;
  // Typed through the transform's own generics: the callback's parameter is
  // otherwise inferred as `unknown[]`, and noUncheckedIndexedAccess would widen
  // each element to `number | undefined` anyway.
  // Indexed rather than destructured. Under noUncheckedIndexedAccess a
  // destructured array element is `number | undefined` whatever the annotation
  // says, and the transform overloads then refuse the callback outright; the
  // defaults make the indexing total instead.
  const scaleX = useTransform([flow, swell], (values: number[]) => {
    const v = values[0] ?? 0;
    const h = values[1] ?? 1;
    return stretchOf(v) * h;
  });
  const scaleY = useTransform([flow, swell], (values: number[]) => {
    const v = values[0] ?? 0;
    const h = values[1] ?? 1;
    return h / stretchOf(v);
  });

  const commit = (next: boolean) => {
    if (next === onRef.current) return;
    onRef.current = next;
    if (!isControlled) setInner(next);
    onChange?.(next);
  };

  useEffect(() => {
    if (dragging) return undefined;
    const target = on ? max : min;
    if (reduce) {
      x.jump(target);
      return undefined;
    }
    const controls = animate(x, target, {
      type: "spring",
      stiffness: 170 - (50 - clamp(speed, 0, 100)) * 1.1,
      damping: 21.5,
      mass: 0.9,
      restDelta: 0.001,
      restSpeed: 0.01,
    });
    return () => controls.stop();
  }, [on, dragging, min, max, speed, reduce, x]);

  /** Pointer position in the track's own coordinates, scale-corrected. */
  const localX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const scale = rect.width / (el.offsetWidth || rect.width) || 1;
    return (clientX - rect.left) / scale;
  };

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || grip.current !== null || e.button !== 0) return;
    grip.current = {
      id: e.pointerId,
      grab: null,
      moved: false,
      startX: e.clientX,
      onAtPress: onRef.current,
      slop: e.pointerType === "touch" ? 8 : 4,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is an optimisation; the drag still works without it.
    }
    setDragging(true);
  };

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const g = grip.current;
    if (g?.id !== e.pointerId) return;
    const lx = localX(e.clientX);
    if (g.grab === null) {
      // First move records the offset, so the thumb does not jump to the cursor.
      g.grab = lx - x.get();
      return;
    }
    if (!g.moved && Math.abs(e.clientX - g.startX) > g.slop) g.moved = true;
    if (!g.moved) return;
    x.set(clamp(lx - g.grab, min, max));
    commit(lx - g.grab > mid);
  };

  const up = (
    e: { pointerId: number; currentTarget: HTMLButtonElement },
    cancelled: boolean,
  ) => {
    const g = grip.current;
    if (g?.id !== e.pointerId) return;
    grip.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Already released.
    }
    // A cancelled or never-dragged press returns to where it started, so a
    // pointer that turned out to be a scroll does not toggle anything.
    if (cancelled) commit(g.onAtPress);
    else if (!g.moved) commit(!onRef.current);

    skipClick.current = true;
    window.setTimeout(() => {
      skipClick.current = false;
    }, 0);
    setDragging(false);
  };

  const click = () => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    if (!disabled) commit(!onRef.current);
  };

  return (
    <span className={`${styles.root}${className ? ` ${className}` : ""}`}>
      <button
        id={buttonId}
        type="button"
        role="switch"
        aria-checked={on}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        className={styles.switch}
        data-on={on ? "" : undefined}
        data-held={dragging ? "" : undefined}
        style={
          {
            "--ss-w": `${width}px`,
            "--ss-h": `${height}px`,
            "--ss-inset": `${inset}px`,
            "--ss-thumb": `${thumb}px`,
            "--ss-r": `${trackRadius}px`,
            "--ss-thumb-r": `${thumbRadius}px`,
            // The off track is `--surface-elevated`, not `--surface-subtle`:
            // subtle is one step off the canvas, which in dark mode is #1b1a19 on
            // a #151515 page — a 6/255 difference. The pill then has no readable
            // shape, the thumb reads as a lone dot, and the control looks like an
            // unchecked checkbox rather than a switch that is off. Elevated keeps
            // the fill visible in both themes, which is the one thing the off
            // state has to do.
            "--ss-track": "var(--surface-elevated)",
            "--ss-track-on": "var(--accent)",
            "--ss-thumb-color": "var(--muted-foreground)",
            "--ss-thumb-on": "var(--accent-foreground)",
            "--ss-fade": `${colorDuration}ms`,
          } as CSSProperties
        }
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(e) => up(e, false)}
        onPointerCancel={(e) => up(e, true)}
        onPointerEnter={(e: PointerEvent<HTMLButtonElement>) => {
          if (e.pointerType === "mouse" && !disabled) swell.set(hoverScale);
        }}
        onPointerLeave={() => swell.set(1)}
        onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
          if (e.key === "Escape" && grip.current !== null) {
            up(
              {
                pointerId: grip.current.id,
                currentTarget: e.currentTarget,
              },
              true,
            );
          }
        }}
        onClick={click}
      >
        <span ref={trackRef} className={styles.track}>
          <motion.span
            className={styles.thumb}
            aria-hidden="true"
            style={{ x, scaleX, scaleY }}
          />
        </span>
      </button>
      {label ? (
        <label htmlFor={buttonId} className={styles.label}>
          {label}
        </label>
      ) : null}
    </span>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
