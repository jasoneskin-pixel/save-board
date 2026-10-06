/**
 * Centralized environment-variable access.
 *
 * The three required secrets come from `.env.local` (see `.env.local.example`):
 *   - AIRTABLE_TOKEN    Personal access token with data.records:read/write on the base
 *   - AIRTABLE_BASE_ID  The Airtable base id (looks like `app...`)
 *   - APP_PIN           Shared PIN for the lightweight auth gate
 *
 * Table names are overridable but default to the names in the build spec.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Add it to .env.local (see .env.local.example).`,
    );
  }
  return value;
}

export const env = {
  get airtableToken() {
    return required("AIRTABLE_TOKEN");
  },
  get airtableBaseId() {
    return required("AIRTABLE_BASE_ID");
  },
  get appPin() {
    return required("APP_PIN");
  },
  // Table name — defaults to "Saves", overridable if the base differs.
  get savesTable() {
    return process.env.AIRTABLE_SAVES_TABLE || "Saves";
  },
};
