# HubSpot Dashboard

## Version & Changelog

**Current version: 1.6.0**

| Version | Date | Changes |
|---------|------|---------|
| 1.6.0 | 2026-03-10 | Split dashboard into separate left-nav tabs (Overview, About to Implement, Currently Implementing, Launched in Period, Contracts for Renewal); remove client size distribution chart |
| 1.5.0 | 2026-03-10 | Add Pricing Model + Deal Source columns (configurable properties in Settings) to all 4 tables; add per-column filter inputs to all tables |
| 1.4.0 | 2026-03-10 | Deal name links to HubSpot deal card (new tab); Stage column shows stage name instead of raw ID; `pipeline_stages` table stores stage mappings; portal ID fetched and stored during sync |
| 1.3.0 | 2026-03-09 | Add Excel export to Currently Implementing, Launched in Period, and Contracts Up for Renewal tables (`xlsx` library, client-side) |
| 1.2.0 | 2026-03-04 | Incremental sync — only fetch deals modified since last sync via HubSpot Search API, with automatic fallback to full sync |
| 1.1.0 | 2026-03-04 | Add metric snapshots — auto-export summary metrics to `server/data/snapshots.json` after each sync, committed to git for historical tracking |
| 1.0.0 | 2026-03-04 | Initial release — dashboard with implementing/launched tables, size charts, renewals, settings UI, HubSpot sync |

---

## Stack
- **Client:** React 18 (Vite) — port 5173
- **Server:** Express.js — port 3003
- **Database:** SQLite via `node-sqlite3-wasm` (NOT better-sqlite3 — Node v24 has no prebuilt binaries)
- **Charts:** Recharts
- **Data fetching:** @tanstack/react-query
- **Excel export:** xlsx (client-side, used in ImplementingTable, LaunchedTable, RenewalsTable)

## Running
```bash
npm run install:all  # install root + server + client dependencies
npm run dev          # starts both server (3003) and client (5173)
```
Server requires no `.env` — set HubSpot API token via the Settings UI (stored in SQLite).

---

## Project Structure
```
client/src/
  pages/               # Dashboard.jsx (overview), AboutToImplement.jsx, Implementing.jsx, Launched.jsx, Renewals.jsx, Settings.jsx
  components/
    dashboard/         # ImplementingTable, LaunchedTable, RenewalsTable, ClientSizeChart, SummaryCards
    layout/            # AppShell.jsx
    shared/            # SyncButton, TimeframeSelector
  hooks/               # useDashboard, useRenewals, useSettings, useSync
  api/client.js        # axios instance (baseURL: /api)

server/
  index.js             # Express app entry
  config.js            # Environment config (PORT, DB_PATH, HUBSPOT_API_TOKEN)
  db.js                # node-sqlite3-wasm adapter (better-sqlite3-compatible API)
  schema.sql           # Initial schema (run on every startup via db.exec)
  middleware/
    errorHandler.js    # Global error handler
  routes/
    dashboard.js       # GET /api/dashboard — summary metrics, deal lists, size distributions
    settings.js        # GET/PUT /api/settings — config stored in SQLite
    hubspot.js         # GET /api/hubspot/properties|pipelines|deal/:id — HubSpot metadata
    sync.js            # POST /api/sync, GET /api/sync/status — trigger + poll sync
    renewals.js        # GET /api/renewals — contract renewal tracking
    snapshots.js       # GET /api/snapshots — historical metric snapshots (from git-tracked JSON)
  services/
    hubspotClient.js   # fetchAllDeals with cursor pagination + 429 retry
    syncService.js     # Reads settings, fetches HubSpot deals, upserts to DB, saves snapshot
    snapshotService.js # Computes aggregate metrics, appends to snapshots.json
```

---

## Database

- `db.js` runs `schema.sql` on startup (CREATE TABLE IF NOT EXISTS — safe to re-run)
- Migrations for added columns are at the bottom of `db.js` as try/catch ALTER TABLE statements
- **Always add new columns both to `schema.sql` AND as a migration in `db.js`**
- SQLite file at `server/data/hubspot.db` — gitignored (each user syncs their own data)

### Tables
| Table | Purpose |
|-------|---------|
| `settings` | Key/value config (API token, property mappings, stage IDs, portal ID) |
| `deals` | Raw HubSpot deal data (id, name, pipeline, stage, dates, size, network) |
| `pipeline_stages` | Stage ID → label mapping (populated during sync via Pipelines API) |
| `sync_runs` | Audit log of sync operations (start, end, status, deal count, errors) |

### Settings (stored in `settings` table)
| Key | Description |
|-----|-------------|
| `hubspot_api_token` | HubSpot Private App token |
| `size_property` | HubSpot deal property for client size |
| `network_property` | HubSpot deal property for Calculated Network (employers) |
| `launch_date_property` | Deal property for go-live date |
| `contract_start_property` | Deal property for contract start |
| `contract_end_property` | Deal property for contract end |
| `contract_renewal_property` | Deal property for renewal date |
| `implementing_stage_ids` | JSON array of stage IDs = "Implementing" |
| `launched_stage_ids` | JSON array of stage IDs = "Launched" |
| `hubspot_portal_id` | HubSpot portal/account ID (fetched during sync, used for deal card links) |
| `pricing_model_property` | Deal property for Pricing Model |
| `deal_source_property` | Deal property for Deal Source |

---

## Metric Snapshots

After every successful HubSpot sync, `snapshotService.js` computes aggregate metrics and appends them to `server/data/snapshots.json`. This file is committed to git (negation in `.gitignore`) so that anyone cloning the repo gets historical metric data without needing a HubSpot token.

**Snapshot schema:**
```json
{
  "timestamp": "2026-03-04T15:30:00.000Z",
  "sync_run_id": 42,
  "deals_fetched": 347,
  "metrics": {
    "total": 347,
    "implementing": 28,
    "total_ever_launched": 215,
    "size_distribution": [{ "size": "Enterprise", "count": 120 }],
    "implementing_size_distribution": [{ "size": "Enterprise", "count": 12 }]
  }
}
```

- Single accumulating array, newest entry appended
- "Launched" count is period-independent (total deals with a `launched_at` date)
- Exposed via `GET /api/snapshots` (read-only)

---

## HubSpot API

- Uses CRM v3 Deals API with cursor-based pagination (100 deals/page, max allowed)
- Requires Private App token with **CRM: Deals — Read** scope
- 429 rate-limit errors are retried with exponential backoff (reads `retry-after` header)
- Properties to fetch are built dynamically from saved settings

### Incremental Sync

By default, sync uses the HubSpot Search API (`POST /crm/v3/objects/deals/search`) to fetch only deals modified since the last successful sync. This dramatically reduces API calls for routine syncs.

- **First sync:** Always full (no previous timestamp)
- **Subsequent syncs:** Incremental via `hs_lastmodifieddate >= lastSyncTimestamp` (Unix ms)
- **Fallback:** If incremental returns >10,000 results (Search API cap), automatically falls back to full sync
- **Force full sync:** `POST /api/sync?full=true`
- **Status feedback:** Phase message shows "incremental: N updated" or "full: N deals"

### API Efficiency Notes

**Potential improvements (not yet implemented):**
- **Diagnostic route consolidation** — `GET /api/hubspot/deal/:id` currently makes 2 API calls for the same deal (one with specific properties, one with all). Could be reduced to 1 call requesting all properties.

---

## Adding a New Deal Property
1. Add migration to `db.js`: `try { _db.run('ALTER TABLE deals ADD COLUMN foo TEXT'); } catch (e) {}`
2. Add column to `schema.sql` deals table
3. Read setting in `syncService.js`, add to properties array, extract value in batch loop, add to upsert
4. Add to `settings.js` GET response and PUT handler
5. Add state + useEffect + save call in `Settings.jsx`
6. Add to dashboard route SELECT queries
7. Display in table components

---

## Webinar Comparison (added 2026-03-20)
New section under **Sections** nav: **Webinar Comparison** (`/webinar-comparison`)

### Routes added
- `POST /api/webinar/sync/zoom` — Server-to-Server OAuth, syncs past webinars + participants
- `POST /api/webinar/sync/eventbrite` — syncs events + attendees via continuation pagination
- `POST /api/webinar/enrich` — batch-fetches contact emails from HubSpot for all deals (improves match accuracy)
- `GET /api/webinar/compare?quarter=Q1&year=2024` — returns launched clients vs webinar attendees with overlap stats
- `POST /api/webinar/analyze` — SSE stream, Claude Sonnet generates engagement analysis
- `GET /api/webinar/status` — sync counts and last-synced timestamps

### Matching logic
Primary: email match (requires running "Enrich Emails" first — calls HubSpot batch contact associations API).
Fallback: name-based keyword match (deal name words vs attendee name).
`match_method` field on each client indicates which was used.

### New DB tables
`zoom_webinars`, `zoom_attendees`, `eventbrite_events`, `eventbrite_attendees`
New column on `deals`: `contact_email` (populated by enrich endpoint)

### New settings keys
`zoom_account_id`, `zoom_client_id`, `zoom_client_secret`, `eventbrite_token`, `eventbrite_org_id`, `anthropic_api_key`
All editable in Settings UI (new Zoom, Eventbrite, AI Analysis cards at bottom of Settings page).

## TODO

- **Cloud Run deployment** — Dockerfile, deploy.sh, static file serving in Express (Branch 2)
- **Google SSO** — Port savi_auth to Express middleware for Cloud Run auth (Branch 2)
