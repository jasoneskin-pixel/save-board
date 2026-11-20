/**
 * Server-side metadata fetching for saved links.
 *
 * Strategy per the spec:
 *   - TikTok:   public oEmbed endpoint (reliable) → title, author, thumbnail.
 *   - Website:  Open Graph tag scrape (generally reliable).
 *   - Instagram: best-effort OG scrape only. Meta restricts this without app
 *                review, so thumbnails will often be missing — that's expected,
 *                and the manual-thumbnail-upload fallback covers it.
 *
 * All network calls are time-boxed so a slow/blocking host can't hang a save.
 */
import type { Platform } from "./airtable";

const FETCH_TIMEOUT_MS = 6000;
// A Safari desktop UA. Instagram serves a stripped page (no OG tags) to a
// Chrome UA but returns full og:image/og:title/og:description to Safari —
// confirmed via diagnostic. This UA is shared with the TikTok oEmbed call,
// which is UA-agnostic, so it keeps working.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export type LinkMetadata = {
  platform: Platform;
  caption: string | null;
  thumbnailUrl: string | null;
};

export function detectPlatform(url: string): Platform {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "Website";
  }
  if (host.includes("instagram.com")) return "Instagram";
  if (host.includes("tiktok.com")) return "TikTok";
  return "Website";
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, ...(init?.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Pull a single Open Graph / meta value out of raw HTML. */
function readMeta(html: string, property: string): string | null {
  // Matches <meta property="og:x" content="..."> and the name="" / reversed
  // attribute-order variants, which real-world pages both use.
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1].trim());
  }
  return null;
}

function readTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1] ? decodeEntities(m[1].trim()) : null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

async function fetchOpenGraph(url: string): Promise<{
  caption: string | null;
  thumbnailUrl: string | null;
}> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { caption: null, thumbnailUrl: null };
    const html = await res.text();
    const caption =
      readMeta(html, "og:title") ||
      readMeta(html, "twitter:title") ||
      readTitleTag(html);
    const thumbnailUrl =
      readMeta(html, "og:image") || readMeta(html, "twitter:image");
    return { caption, thumbnailUrl };
  } catch {
    // Network error / timeout / abort — fall through to no metadata.
    return { caption: null, thumbnailUrl: null };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A real Instagram post's og:title is always "{account} on Instagram: ...".
// Meta's bot-defense / rate-limit fallback page instead returns the bare
// site name with no post-specific data — confirmed by re-fetching several
// saves that got stuck with this generic value: they succeeded on retry
// minutes later, so the failure is transient rather than permanent per-URL.
function isGenericInstagramResponse(caption: string | null): boolean {
  return caption?.trim() === "Instagram";
}

async function fetchInstagram(url: string): Promise<{
  caption: string | null;
  thumbnailUrl: string | null;
}> {
  let result = await fetchOpenGraph(url);
  for (const delayMs of [1200, 2400]) {
    if (!isGenericInstagramResponse(result.caption)) return result;
    await sleep(delayMs);
    result = await fetchOpenGraph(url);
  }
  // Still generic after retries — treat as no metadata rather than saving a
  // misleading generic logo/caption. The manual-thumbnail/caption fields
  // cover this exactly like any other unfetchable Instagram post.
  return isGenericInstagramResponse(result.caption)
    ? { caption: null, thumbnailUrl: null }
    : result;
}

// TikTok's oEmbed endpoint stopped returning title/author_name/thumbnail_url
// at some point (confirmed empirically — it now returns only the embed
// iframe fields), breaking auto-thumbnails for every new TikTok save. The
// watch page's static HTML has no usable Open Graph tags either (TikTok
// needs JS to render them), so this falls back to the page's own embedded
// state JSON, which still carries the real cover image and caption.
const REHYDRATION_SCRIPT_RE =
  /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/;

async function fetchTikTokPage(url: string): Promise<{
  caption: string | null;
  thumbnailUrl: string | null;
}> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return { caption: null, thumbnailUrl: null };
    const html = await res.text();
    const match = html.match(REHYDRATION_SCRIPT_RE);
    if (!match) return { caption: null, thumbnailUrl: null };
    const data = JSON.parse(match[1]);
    const videoDetail = data?.__DEFAULT_SCOPE__?.["webapp.video-detail"];
    const item = videoDetail?.itemInfo?.itemStruct;
    if (!item || videoDetail.statusCode) {
      return { caption: null, thumbnailUrl: null };
    }
    const caption = (item.desc as string)?.trim() || null;
    const thumbnailUrl =
      (item.video?.cover as string) || (item.video?.originCover as string) || null;
    return { caption, thumbnailUrl };
  } catch {
    return { caption: null, thumbnailUrl: null };
  }
}

async function fetchTikTok(url: string): Promise<{
  caption: string | null;
  thumbnailUrl: string | null;
}> {
  try {
    const res = await fetchWithTimeout(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
    );
    if (res.ok) {
      const data = (await res.json()) as {
        title?: string;
        author_name?: string;
        thumbnail_url?: string;
      };
      const caption =
        data.title?.trim() ||
        (data.author_name ? `TikTok by ${data.author_name}` : null) ||
        null;
      if (caption || data.thumbnail_url) {
        return { caption, thumbnailUrl: data.thumbnail_url ?? null };
      }
    }
  } catch {
    // fall through to the page scrape below
  }
  return fetchTikTokPage(url);
}

/**
 * Fetch metadata for a URL. Never throws — on failure it returns the detected
 * platform with null caption/thumbnail so the save can still be created.
 */
export async function fetchMetadata(url: string): Promise<LinkMetadata> {
  const platform = detectPlatform(url);

  if (platform === "TikTok") {
    const { caption, thumbnailUrl } = await fetchTikTok(url);
    return { platform, caption, thumbnailUrl };
  }

  if (platform === "Instagram") {
    const og = await fetchInstagram(url);
    return { platform, ...og };
  }

  // Website goes through plain OG scraping.
  const og = await fetchOpenGraph(url);
  return { platform, ...og };
}
