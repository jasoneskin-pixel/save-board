/**
 * Helpers for playing saved videos inline instead of bouncing out to the
 * TikTok/Instagram app. Both platforms only support inline playback via
 * their own officially embeddable players (there's no API for fetching a
 * raw video file, and scraping one would violate their terms) — so this
 * extracts just enough from the stored URL to build each platform's embed.
 */

/**
 * Pull the numeric video id out of a TikTok URL so it can be passed to
 * TikTok's official player iframe (tiktok.com/player/v1/{id}). Works for any
 * URL containing `/video/<id>` (the common case for saved links); short
 * share links (tiktok.com/t/... or vm.tiktok.com/...) don't carry the id and
 * return null, so the caller should fall back to a plain link in that case.
 */
export function getTikTokVideoId(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}
