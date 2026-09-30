"use client";

import { cn } from "../../lib/cn";
import styles from "./icons.module.css";

/*
 * Lucide icon geometry (24x24, stroke-width 2, round caps and joins), with
 * hover animations written in CSS instead of pulling in a motion runtime.
 *
 * Animations are triggered by hovering any ancestor carrying
 * `data-icon-trigger`, so the trigger animates its own icon without per-row JS
 * state. Nothing animates at rest.
 */

type IconProps = { size?: number; className?: string };

function Svg({
  size = 16,
  className,
  children,
  ...rest
}: IconProps & { children: React.ReactNode } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn(styles.icon, className)}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function PlusIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.plus, className)}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Svg>
  );
}

export function FolderOpenIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.folder, className)}>
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </Svg>
  );
}

export function BotIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.bot, className)}>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path className={styles.eye} d="M9 13v2" />
      <path className={styles.eye} d="M15 13v2" />
    </Svg>
  );
}

export function UserIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </Svg>
  );
}

export function SettingsIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.settings, className)}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function SunIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.sun, className)}>
      <circle cx="12" cy="12" r="4" />
      <g className={styles.rays}>
        <path d="M12 2v2" />
        <path d="m19.07 4.93-1.41 1.41" />
        <path d="M20 12h2" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M12 20v2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="M2 12h2" />
        <path d="m4.93 4.93 1.41 1.41" />
      </g>
    </Svg>
  );
}

export function MoonIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </Svg>
  );
}

export function PanelLeftCloseIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </Svg>
  );
}

export function PanelLeftOpenIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m14 9 3 3-3 3" />
    </Svg>
  );
}

export function ChevronUpIcon({ size, className }: IconProps) {  return (
    <Svg size={size} className={cn(styles.chevron, className)}>
      <path d="m18 15-6-6-6 6" />
    </Svg>
  );
}

/**
 * Incognito / hidden chat. Ghost is a plain-Lucide glyph (the animated registry
 * does not carry it), so its body and eyes are split so the eyes can blink
 * without the whole figure drifting.
 */
export function GhostIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.ghost, className)}>
      <g className={styles.ghostBody}>
        <path d="M7.528 20.472a1.6 1.6 0 012.277 0l1.057 1.056a1.6 1.6 0 002.276 0l1.057-1.056a1.6 1.6 0 012.277 0l1.114 1.114a1.4 1.4 0 002.414-1V10a8 8 0 00-16 0v10.586a1.4 1.4 0 002.414 1z" />
      </g>
      <path className={styles.eye} d="M15 10v1" />
      <path className={styles.eye} d="M9 10v1" />
    </Svg>
  );
}

export function MicIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.mic, className)}>
      <path d="M12 19v3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <rect x="9" y="2" width="6" height="13" rx="3" />
    </Svg>
  );
}

export function ArrowUpIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.arrowUp, className)}>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </Svg>
  );
}

export function PaperclipIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551" />
    </Svg>
  );
}

export function ArrowRightIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.arrowRight, className)}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Svg>
  );
}

export function CheckIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

export function ChevronRightIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  );
}

export function ArrowDownIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.arrowDown, className)}>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </Svg>
  );
}

export function XIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  );
}

export function ArchiveIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </Svg>
  );
}

export function SparklesIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </Svg>
  );
}

export function BlocksIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a2 2 0 0 0-1-1H2" />
      <rect x="14" y="2" width="8" height="8" rx="1" />
    </Svg>
  );
}

export function PaletteIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z" />
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    </Svg>
  );
}

export function PuzzleIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 0 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 0-1.68-.474l1.682-1.682a2.414 2.414 0 0 1 3.414 0z" />
    </Svg>
  );
}

export function GlobeIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </Svg>
  );
}

export function BrainIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 18V5" />
      <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
      <path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5" />
      <path d="M17.997 5.125a4 4 0 0 1 2.526 5.77" />
      <path d="M18 18a4 4 0 0 0 2-7.464" />
      <path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517" />
      <path d="M6 18a4 4 0 0 1-2-7.464" />
      <path d="M6.003 5.125a4 4 0 0 0-2.526 5.77" />
    </Svg>
  );
}

export function ScrollIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.scroll, className)}>
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 2 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    </Svg>
  );
}

export function DatabaseIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.database, className)}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </Svg>
  );
}

export function RotateCcwIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.rotateCcw, className)}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </Svg>
  );
}

export function PencilIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.pencil, className)}>
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </Svg>
  );
}

export function CopyIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Svg>
  );
}

export function AudioWaveformIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={cn(styles.waveform, className)}>
      <path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2" />
    </Svg>
  );
}

/** Three dots in a row: the affordance for "there is more here than fits". */
export function DotsHorizontalIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </Svg>
  );
}

export function PinIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </Svg>
  );
}

export function TrashIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </Svg>
  );
}

export function ShareIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </Svg>
  );
}

/** Triangle-alert, for the cost warning on the top effort tier. */
export function WarningIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

/** The overflow trigger. Filled rather than stroked, because a stroked row of
    dots at 12px renders as three specks; at this size the dots need to be
    solid to read as a single control. */
export function MoreIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className} fill="currentColor" stroke="none">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </Svg>
  );
}

export function DownloadIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </Svg>
  );
}

export function ImageIcon({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </Svg>
  );
}
