# Save Board — Build Spec (v1)

A personal/team web app for saving Instagram, TikTok, and website links used as creative inspiration for social media campaigns — organized into flexible, freeform albums (e.g. "Talent Ideas," "Social Editorial," "Creators"). Saving happens primarily via the iOS share sheet (Shortcut) or a simple paste box on desktop.

---

## 1\. Core User Flow

**Mobile (primary):**

1. See something inspiring in Instagram, TikTok, or Safari.  
2. Tap Share → tap the "Save Board" Shortcut.  
3. Shortcut fetches the current list of albums, shows a quick menu to pick one.  
4. Link is sent to the app automatically, tagged with your name (pre-set per person) and timestamp — no typing required.

**Desktop:**

1. Open the web app.  
2. Paste a link into the save box, pick an album and your name, hit Save.

**Browsing:**

- Open the app to a Pinterest-style visual grid of saves, newest first.  
- Filter by album and/or platform; search across notes and captions.  
- Click a save to open detail view: edit notes/tags, upload a manual thumbnail if needed, or delete.

---

## 2\. Architecture

- **Frontend:** Next.js (App Router) \+ Tailwind CSS, deployed on Vercel. Configured as an installable PWA (works fine in mobile Safari; add-to-home-screen for quick access, though saving itself goes through the Shortcut, not the PWA's share target, since iOS Safari doesn't support Web Share Target for PWAs).  
- **Backend/data store:** Airtable (existing account) — two tables, detailed below.  
- **Auth:** Lightweight shared PIN gate. Not enterprise security — appropriate for a small, trusted team. PIN stored as an environment variable; checked via a simple cookie/header on all API routes.  
- **Metadata fetching:**  
  - **TikTok:** public oEmbed endpoint (`https://www.tiktok.com/oembed?url=...`) → title, author, thumbnail. Reliable.  
  - **Websites:** Open Graph tag scrape (`og:title`, `og:image`, `og:description`). Generally reliable.  
  - **Instagram:** best-effort only. Meta restricts oEmbed/scraping without app review, so automatic thumbnails will sometimes fail. **Fallback: manual thumbnail upload** in the detail view, per your preference — don't over-invest engineering time trying to work around Meta's restrictions.

---

## 3\. Airtable Data Model

### Table: `Albums`

| Field | Type | Notes |
| :---- | :---- | :---- |
| Name | Single line text (primary) |  |
| Created By | Single line text | name/initials |
| Created At | Created time |  |
| Color/Icon | Single select (optional) | for visual differentiation in grid headers |

### Table: `Saves`

| Field | Type | Notes |
| :---- | :---- | :---- |
| URL | URL |  |
| Platform | Single select: Instagram / TikTok / Website |  |
| Thumbnail | Attachment | auto-fetched |
| Manual Thumbnail | Attachment | fallback override, used when auto-fetch fails |
| Caption/Title | Long text | auto-fetched where possible |
| Notes | Long text | added/edited anytime inside the app (not required at save time) |
| Tags | Multi-select | freeform, editable in-app |
| Album | Link to `Albums` |  |
| Saved By | Single line text or single select | name/initials, chosen at save time |
| Saved At | Created time | used for newest-first sort |

---

## 4\. API Endpoints (Next.js route handlers)

- `POST /api/save` — create a save. Used by both the Shortcut and the desktop paste box. Accepts `{ url, album, savedBy }`; server fetches metadata server-side and creates the Airtable record.  
- `GET /api/albums` — list albums (used by the Shortcut's menu and the app's dropdowns).  
- `POST /api/albums` — create an album.  
- `PATCH /api/albums/:id` — rename an album.  
- `DELETE /api/albums/:id` — delete an album.  
- `GET /api/saves` — list saves, with query params for `album`, `platform`, and free-text `search` (matches Notes \+ Caption).  
- `PATCH /api/saves/:id` — edit notes, tags, or manual thumbnail.  
- `DELETE /api/saves/:id` — delete a save.  
- **Auth middleware** — validates the shared PIN (cookie for browser sessions, header for the Shortcut's API calls) on every route.

---

## 5\. iOS Shortcut Design

Each team member installs their **own personalized copy** of the Shortcut (name hardcoded once during setup — this is the one small piece of one-time friction, in exchange for zero friction on every save after that).

**Flow:**

1. Receives the shared URL from the Share Sheet.  
2. Calls `GET /api/albums` (with PIN header) to get the current album list.  
3. Shows a native "Choose from Menu" with those album names.  
4. Calls `POST /api/save` with `{ url, album: <chosen>, savedBy: <hardcoded name>, pin }`.  
5. Shows a brief "Saved\!" notification.

**One-time setup per person:** install the Shortcut, enable it in the Share Sheet's action list, replace the placeholder name field with their own.

---

## 6\. Browsing UI

- Pinterest-style masonry/grid, thumbnail-forward.  
- Top filter bar: album selector, platform toggle, search box.  
- Default sort: newest first (no manual reordering in v1).  
- Clicking a card opens a detail view: full-size thumbnail, link-out button, editable Notes/Tags, manual thumbnail upload, Saved By \+ timestamp, delete option.

---

## 7\. MVP Checklist

- [ ] PIN gate (middleware \+ simple login screen)  
- [ ] Airtable base connected (`Albums` \+ `Saves` tables)  
- [ ] `POST /api/save` with metadata fetch (TikTok oEmbed, OG tags, Instagram best-effort)  
- [ ] Album CRUD endpoints \+ UI  
- [ ] Saves list/filter/search endpoint \+ UI  
- [ ] Grid browsing view \+ detail modal  
- [ ] Desktop paste-link page  
- [ ] iOS Shortcut template \+ personalization instructions (name field, PIN, API base URL)

## 8\. Stretch Goals (v2+, not in scope for first build)

- Drag-to-reorder or pin favorites within an album  
- Individual logins (replacing shared PIN) if attribution/security needs grow  
- Slack notification when a new save is added  
- Migrate off Airtable to a dedicated database (e.g., Supabase/Postgres) if save volume or search needs (semantic/fuzzy search) outgrow Airtable  
- AI-suggested tags/albums based on caption content

## 9\. Known Technical Risks / Notes for Claude Code

- **Instagram metadata is unreliable** without Meta app review. Build the manual-thumbnail-upload fallback as a first-class feature, not an afterthought.  
- **Airtable rate limits** are fine for this volume, but avoid N+1 request patterns when listing/filtering saves.  
- **Shared-PIN auth is intentionally minimal.** Don't build session security as if defending against a serious attacker — it's a convenience gate for a small trusted team, not a compliance requirement.

