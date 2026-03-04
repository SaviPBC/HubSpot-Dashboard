# HubSpot Dashboard

## Stack
- **Client:** React (Vite) — port 5173
- **Server:** Express.js — port 3003
- **Database:** SQLite via `node-sqlite3-wasm` (NOT better-sqlite3 — Node v24 has no prebuilt binaries)
- **Charts:** Recharts
- **Data fetching:** @tanstack/react-query

## Running
```bash
npm run dev        # starts both server and client
npm run install:all  # install all dependencies
```
Server requires no `.env` — set HubSpot API token via the Settings UI (stored in SQLite).

## Project Structure
```
client/src/
  pages/          # Dashboard.jsx, Settings.jsx
  components/dashboard/  # ImplementingTable, LaunchedTable, RenewalsTable, ClientSizeChart, SummaryCards
  hooks/          # useDashboard, useRenewals, useSettings, useSync
  api/client.js   # axios instance

server/
  index.js        # Express app entry
  db.js           # node-sqlite3-wasm adapter (better-sqlite3-compatible API)
  schema.sql      # initial schema (run on every startup via db.exec)
  config.js
  routes/         # dashboard, settings, hubspot, sync, renewals
  services/
    hubspotClient.js   # fetchAllDeals with cursor pagination + 429 retry
    syncService.js     # reads settings, fetches HubSpot deals, upserts to DB
```

## Database
- `db.js` runs `schema.sql` on startup (CREATE TABLE IF NOT EXISTS — safe to re-run)
- Migrations for added columns are at the bottom of `db.js` as try/catch ALTER TABLE statements
- **Always add new columns both to `schema.sql` AND as a migration in `db.js`**

## Settings (stored in `settings` table)
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

## Adding a New Deal Property
1. Add migration to `db.js`: `try { _db.run('ALTER TABLE deals ADD COLUMN foo TEXT'); } catch (e) {}`
2. Add column to `schema.sql` deals table
3. Read setting in `syncService.js`, add to properties array, extract value in batch loop, add to upsert
4. Add to `settings.js` GET response and PUT handler
5. Add state + useEffect + save call in `Settings.jsx`
6. Add to dashboard route SELECT queries
7. Display in table components

## HubSpot API
- Uses CRM v3 Deals API with cursor-based pagination
- Requires Private App token with **CRM: Deals — Read** scope
- 429 rate-limit errors are retried with exponential backoff
- Properties to fetch are built dynamically from saved settings
