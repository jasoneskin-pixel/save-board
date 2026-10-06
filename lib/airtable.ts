/**
 * Airtable client + typed helpers for the Saves table.
 *
 * Field names mirror the base exactly. If the base uses different labels,
 * adjust the constants in FIELDS below rather than scattering string literals
 * through the codebase.
 *
 * Note: this app is organized around freeform Tags (not albums). The base may
 * still contain a legacy "Album" field / "Albums" table, but nothing here
 * reads or writes them.
 */
import Airtable, { type FieldSet, type Records } from "airtable";
import { env } from "./env";

// Singleton base — created lazily so importing this module never throws at
// build time when env vars are absent.
let cachedBase: Airtable.Base | null = null;

function base(): Airtable.Base {
  if (!cachedBase) {
    cachedBase = new Airtable({ apiKey: env.airtableToken }).base(
      env.airtableBaseId,
    );
  }
  return cachedBase;
}

/** Canonical field names, kept in one place to avoid stringly-typed drift. */
export const FIELDS = {
  save: {
    url: "URL",
    platform: "Platform",
    thumbnail: "Thumbnail",
    manualThumbnail: "Manual Thumbnail",
    caption: "Caption/Title",
    manualCaption: "Manual Caption",
    notes: "Notes",
    tags: "Tags",
    savedBy: "Saved By",
  },
} as const;

export type Platform = "Instagram" | "TikTok" | "Website";

export type Save = {
  id: string;
  url: string;
  platform: Platform | null;
  /** Effective caption for display: auto-fetched preferred, manual as fallback. */
  caption: string | null;
  /** The raw manual-override value, edited in the detail view. */
  manualCaption: string | null;
  notes: string | null;
  tags: string[];
  savedBy: string | null;
  thumbnailUrl: string | null;
  createdTime: string;
};

type AttachmentLike = { url?: string; thumbnails?: { large?: { url?: string } } };

function firstAttachmentUrl(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const att = value[0] as AttachmentLike;
  return att?.thumbnails?.large?.url || att?.url || null;
}

function mapSave(record: Records<FieldSet>[number]): Save {
  // Prefer the auto-fetched thumbnail, fall back to the manual override.
  const thumbnailUrl =
    firstAttachmentUrl(record.get(FIELDS.save.thumbnail)) ??
    firstAttachmentUrl(record.get(FIELDS.save.manualThumbnail));

  // Same fallback for the caption: auto-fetched preferred, manual as the
  // fallback (covers Instagram, where the auto caption is usually empty).
  // `|| null` treats an empty string as absent so the fallback kicks in.
  const autoCaption = (record.get(FIELDS.save.caption) as string) || null;
  const manualCaption = (record.get(FIELDS.save.manualCaption) as string) || null;

  return {
    id: record.id,
    url: (record.get(FIELDS.save.url) as string) ?? "",
    platform: (record.get(FIELDS.save.platform) as Platform) ?? null,
    caption: autoCaption ?? manualCaption,
    manualCaption,
    notes: (record.get(FIELDS.save.notes) as string) ?? null,
    tags: (record.get(FIELDS.save.tags) as string[]) ?? [],
    savedBy: (record.get(FIELDS.save.savedBy) as string) ?? null,
    thumbnailUrl,
    createdTime: record._rawJson.createdTime,
  };
}

/**
 * Trim, lowercase, and de-dupe a tag list so casing (e.g. "Talent" vs
 * "talent") never creates two distinct tags. Applied wherever tags are
 * written, regardless of entry point (Shortcut, add page, or detail-modal
 * edit).
 */
export function normalizeTags(tags: string[]): string[] {
  const cleaned = tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
  return [...new Set(cleaned)];
}

/** Safely quote a string for use inside an Airtable formula. */
function formulaString(value: string): string {
  return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/**
 * List saves, newest first, with optional platform/search filters pushed to
 * Airtable. Sort is done in-memory on the built-in record createdTime (there is
 * no sortable "Saved At" field in the base). Tag filtering is handled in the
 * browser so the full tag list stays available for the filter UI.
 */
export async function listSaves(
  filters: { platform?: Platform; search?: string } = {},
): Promise<Save[]> {
  const parts: string[] = [];
  if (filters.platform) {
    parts.push(`{${FIELDS.save.platform}} = ${formulaString(filters.platform)}`);
  }
  if (filters.search?.trim()) {
    const term = formulaString(filters.search.trim().toLowerCase());
    // `& ""` coerces empty fields to a string so FIND doesn't error.
    parts.push(
      `OR(` +
        `FIND(${term}, LOWER({${FIELDS.save.caption}} & "")), ` +
        `FIND(${term}, LOWER({${FIELDS.save.notes}} & ""))` +
        `)`,
    );
  }
  const filterByFormula =
    parts.length === 0
      ? undefined
      : parts.length === 1
        ? parts[0]
        : `AND(${parts.join(", ")})`;

  const records = await base()(env.savesTable)
    .select(filterByFormula ? { filterByFormula } : {})
    .all();

  const saves = records.map(mapSave);
  saves.sort((a, b) => b.createdTime.localeCompare(a.createdTime));
  return saves;
}

export async function createSave(input: {
  url: string;
  platform: Platform;
  tags?: string[];
  savedBy?: string;
  caption?: string | null;
  thumbnailUrl?: string | null;
}): Promise<Save> {
  const fields: FieldSet = {
    [FIELDS.save.url]: input.url,
    [FIELDS.save.platform]: input.platform,
  };
  if (input.tags?.length) fields[FIELDS.save.tags] = normalizeTags(input.tags);
  if (input.savedBy) fields[FIELDS.save.savedBy] = input.savedBy;
  if (input.caption) fields[FIELDS.save.caption] = input.caption;
  // Airtable ingests attachments from a public URL when set as [{ url }].
  if (input.thumbnailUrl) {
    fields[FIELDS.save.thumbnail] = [
      { url: input.thumbnailUrl },
    ] as unknown as FieldSet[string];
  }

  // typecast lets new freeform Tags options be created on the fly.
  const created = await base()(env.savesTable).create([{ fields }], {
    typecast: true,
  });
  return mapSave(created[0]);
}

export async function updateSave(
  id: string,
  input: {
    notes?: string | null;
    tags?: string[];
    caption?: string | null;
    manualCaption?: string | null;
    savedBy?: string | null;
  },
): Promise<Save> {
  const fields: FieldSet = {};
  if (input.notes !== undefined) fields[FIELDS.save.notes] = input.notes ?? "";
  if (input.tags !== undefined)
    fields[FIELDS.save.tags] = normalizeTags(input.tags);
  // `caption` writes the auto field; `manualCaption` writes the override. The
  // UI only ever sends `manualCaption`, so a manual edit never clobbers the
  // auto-fetched "Caption/Title".
  if (input.caption !== undefined)
    fields[FIELDS.save.caption] = input.caption ?? "";
  if (input.manualCaption !== undefined)
    fields[FIELDS.save.manualCaption] = input.manualCaption ?? "";
  if (input.savedBy !== undefined)
    fields[FIELDS.save.savedBy] = input.savedBy ?? "";

  // typecast lets new freeform Tags options be created on the fly.
  const updated = await base()(env.savesTable).update([{ id, fields }], {
    typecast: true,
  });
  return mapSave(updated[0]);
}

export async function deleteSave(id: string): Promise<void> {
  await base()(env.savesTable).destroy([id]);
}

/** Fetch a single save by record id. */
export async function getSave(id: string): Promise<Save> {
  const record = await base()(env.savesTable).find(id);
  return mapSave(record);
}

// Field ids (needed by the uploadAttachment endpoint, which takes ids not
// names) are resolved once from the base schema and cached for the process.
let savesFieldIdCache: Record<string, string> | null = null;

async function savesFieldId(fieldName: string): Promise<string> {
  if (!savesFieldIdCache) {
    const res = await fetch(
      `https://api.airtable.com/v0/meta/bases/${env.airtableBaseId}/tables`,
      { headers: { Authorization: `Bearer ${env.airtableToken}` } },
    );
    if (!res.ok) throw new Error(`Schema fetch failed: HTTP ${res.status}`);
    const data = (await res.json()) as {
      tables: { name: string; fields: { id: string; name: string }[] }[];
    };
    const table = data.tables.find((t) => t.name === env.savesTable);
    if (!table) throw new Error(`Table "${env.savesTable}" not found.`);
    savesFieldIdCache = Object.fromEntries(
      table.fields.map((f) => [f.name, f.id]),
    );
  }
  const id = savesFieldIdCache[fieldName];
  if (!id) throw new Error(`Field "${fieldName}" not found in ${env.savesTable}.`);
  return id;
}

/**
 * Upload a manual thumbnail image to a save's "Manual Thumbnail" attachment
 * field via Airtable's content API (the only way to push binary uploads;
 * the records API only accepts attachment URLs). Returns the refreshed save.
 */
export async function uploadManualThumbnail(
  recordId: string,
  file: { filename: string; contentType: string; base64: string },
): Promise<Save> {
  const fieldId = await savesFieldId(FIELDS.save.manualThumbnail);
  const res = await fetch(
    `https://content.airtable.com/v0/${env.airtableBaseId}/${recordId}/${fieldId}/uploadAttachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.airtableToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contentType: file.contentType,
        file: file.base64,
        filename: file.filename,
      }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`uploadAttachment failed: HTTP ${res.status} ${text}`);
  }
  return getSave(recordId);
}
