import { requirePin } from "@/lib/auth";
import { createSave, normalizeTags } from "@/lib/airtable";
import { fetchMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";
// Instagram metadata fetch can retry up to twice on Meta's rate-limit
// fallback (lib/metadata.ts), which can take ~20s worst case — default
// serverless timeouts are too tight for that.
export const maxDuration = 30;

/**
 * POST /api/save — create a save. Used by both the iOS Shortcut and the
 * desktop paste box.
 *
 * Body: { url, tags?, savedBy? }
 *   - `tags` may be an array of strings OR a comma-separated string (the latter
 *     is easier to produce from an iOS Shortcut "Ask for Input" step).
 *
 * The server fetches metadata (TikTok oEmbed / OG scrape) and creates the
 * Airtable record. Metadata failure is non-fatal: the save is still created so
 * the user never loses a link, and a thumbnail can be added manually later.
 */
export async function POST(request: Request) {
  const denied = await requirePin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { url, tags, savedBy } = (body ?? {}) as {
    url?: string;
    tags?: string[] | string;
    savedBy?: string;
  };

  if (!url || typeof url !== "string" || !isHttpUrl(url)) {
    return Response.json(
      { error: "`url` is required and must be a valid http(s) URL." },
      { status: 400 },
    );
  }

  const normalizedTags = normalizeTags(
    Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",") : [],
  );

  try {
    const meta = await fetchMetadata(url);
    const save = await createSave({
      url,
      platform: meta.platform,
      tags: normalizedTags,
      savedBy: savedBy?.trim() || undefined,
      caption: meta.caption,
      thumbnailUrl: meta.thumbnailUrl,
    });
    return Response.json({ save }, { status: 201 });
  } catch (err) {
    console.error("POST /api/save failed:", err);
    return Response.json({ error: "Failed to create save." }, { status: 500 });
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
