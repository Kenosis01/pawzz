/**
 * Attachments: the shapes, and the pure functions that make them.
 *
 * Nothing here is a component or a hook — every function takes a File or a
 * DataTransfer and hands back data. That is the whole reason this file exists
 * separately from the box: the composer's job is deciding what the prompt looks
 * like, and none of this is about that.
 */

export type Attachment = {
  id: string;
  kind: "text" | "file" | "image";
  name: string;
  /** Pasted or dropped text. */
  text?: string;
  /** Object URL for the live tile. Session-scoped, dies with the document. */
  preview?: string;
  /**
   * Downscaled JPEG data URL for the transcript. Unlike `preview` this survives
   * a reload, which a blob URL does not.
   */
  thumb?: string;
  size?: number;
};

let nextId = 0;
export const makeId = () => `att-${++nextId}`;

export function fromFile(file: File): Attachment {
  const isImage = file.type.startsWith("image/");
  return {
    id: makeId(),
    kind: isImage ? "image" : "file",
    name: file.name || (isImage ? "Pasted image" : "Attachment"),
    size: file.size,
    preview: isImage ? URL.createObjectURL(file) : undefined,
  };
}

/** Longest edge of a stored thumbnail. */
const THUMB_MAX = 1024;

/**
 * Rasterise an image to a downscaled JPEG data URL.
 *
 * The transcript has to show the picture, not a filename, and it has to survive
 * a reload — which rules out the blob URL the live tile uses. A full-size
 * base64 image would blow the ~5 MB localStorage budget after two or three, so
 * the image is scaled down first. A 1024px JPEG lands around 60-150 kB, which
 * leaves room for a reasonable number of them.
 *
 * Vector and animated formats are passed through un-rasterised: canvas would
 * flatten an SVG's transparency and a GIF's animation, and losing either is
 * worse than showing the file card.
 */
export async function toThumb(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return undefined;
  if (/svg|gif/.test(file.type)) return undefined;
  if (typeof createImageBitmap !== "function") return undefined;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      THUMB_MAX / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return undefined;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    // A format canvas cannot decode, or a revoked blob. The file card is the
    // fallback, not an error.
    return undefined;
  }
}

export type DragReadout = {
  count: number;
  fromFiles: number;
  fromItems: number;
  types: string[];
  dropped?: boolean;
};

/**
 * What the engine actually handed us. Surfaced in the UI so a drop that
 * captures nothing is visible instead of silent.
 */
export function probeDrag(data: DataTransfer | null): DragReadout {
  if (!data) return { count: 0, fromFiles: 0, fromItems: 0, types: [] };
  const fromFiles = data.files?.length ?? 0;
  const fromItems = Array.from(data.items ?? []).filter(
    (item) => item.kind === "file",
  ).length;
  return {
    count: Math.max(fromFiles, fromItems),
    fromFiles,
    fromItems,
    types: Array.from(data.types ?? []),
  };
}

/**
 * Images and copied files arrive as clipboard items, not as text. `files` is
 * populated by some sources and `items` by others, so check both.
 */
export function filesFromClipboard(data: DataTransfer): File[] {
  const fromFiles = Array.from(data.files ?? []);
  if (fromFiles.length) return fromFiles;

  const fromItems: File[] = [];
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) fromItems.push(file);
  }
  return fromItems;
}

/**
 * Second route to the same files, for engines that do not surface clipboard
 * blobs through DataTransfer.
 */
export async function readClipboardImages(): Promise<File[]> {
  // Guarded off the object rather than through a detached `const read` — a bare
  // method reference loses its `this` when the call is made through it.
  if (typeof navigator.clipboard?.read !== "function") return [];

  try {
    const items = await navigator.clipboard.read();
    const files: File[] = [];
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      const ext = imageType.split("/")[1]?.split("+")[0] ?? "png";
      files.push(new File([blob], `Pasted image.${ext}`, { type: imageType }));
    }
    return files;
  } catch {
    return [];
  }
}

export function readableSize(bytes?: number): string | null {
  if (bytes === undefined) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Pastes at least this long become a text card instead of landing in the field.
 *
 * The threshold matters: short pastes are far more useful inline, where they can
 * be read, reworded and sent without a second click. Only once a paste is long
 * enough to push the prompt out of view does the card earn its keep — it keeps
 * the field to one line and preserves the original text, line breaks and all.
 *
 * 600 characters is roughly six to eight lines: past that the prompt box starts
 * growing to accommodate something the user pasted rather than typed, which is
 * the signal that it belongs beside the message instead of inside it.
 */
export const PASTE_CARD_CHARS = 600;

/** Exported for testing: does this paste become an attachment? */
export function shouldCardifyPaste(text: string): boolean {
  // Trimmed first, so a paste of trailing newlines does not trip the threshold
  // on whitespace alone.
  return text.trim().length >= PASTE_CARD_CHARS;
}
