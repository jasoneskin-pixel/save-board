/**
 * Tags that represent film/show campaigns rather than content format or
 * social category. Purely a display-grouping concern for the filter bar —
 * doesn't change how filtering itself works. Edit this list directly to
 * add/remove campaign tags; names must match the stored (lowercase) tag
 * exactly, per lib/airtable.ts's normalizeTags.
 */
const CAMPAIGN_TAGS = new Set([
  "gatto",
  "frozen3",
  "iceage",
  "mickey",
  "mickey 100",
  "princess",
  "princesses",
  "simpsons",
  "bluey",
  "hexed",
  "crush",
  "tangled",
]);

export function isCampaignTag(tag: string): boolean {
  return CAMPAIGN_TAGS.has(tag.trim().toLowerCase());
}
