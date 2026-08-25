# Operations And Deployment

## Environment

Create a local `.env` from `.env.example`; never commit real values. Required capabilities vary by source:

- Meta: `FB_ACCESS_TOKEN`.
- BigQuery: `GOOGLE_APPLICATION_CREDENTIALS` pointing to a local service-account JSON.
- Main Shopify Analytics: `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`.
- Snapchat: `SNAP_CLIENT_ID`, `SNAP_CLIENT_SECRET`, `SNAP_REFRESH_TOKEN`, `SNAP_AD_ACCOUNT_IDS`.

The updater reads the parent data-analysis `.env` automatically. Never echo secrets in logs or responses.

## Daily Update

```bash
python3 scripts/update_dashboard_data.py \
  --start-date YYYY-MM-DD \
  --end-date YYYY-MM-DD
```

Pipeline:

1. Fetch Meta ad-country-day rows. It deletes and replaces only the requested date/account scope and fails before writing if any account fails.
2. Fetch main-store Shopify Analytics when credentials exist. Existing US official BQ rows remain primary unless `--shopify-analytics-json` imports a connected US payload.
3. Refresh Snapchat attribution.
4. Export five frontend partitions; lifecycle is preserved by default.
5. Validate source freshness.
6. Build `dist/server/public`.
7. Sync and push GitHub Pages.

Expected channel lag defaults in `scripts/update_dashboard_data.py`: Meta/Shopify/Snapchat 0 days, Google 1 day, Amazon/TikTok 2 days. A stale source must retain its last real date and show a warning; never duplicate a previous day to pass the gate.

## Required Validation

Meta duplicate query grain:

```text
date_start + account_id + ad_id + country
```

Check row count equals distinct key count for every refreshed day. Also compare account coverage, country coverage, spend, purchases, and purchase value by day.

Partition maximum dates:

```bash
python3 - <<'PY'
from scripts.dashboard_data_partitions import read_partition_files, merge_partition_payloads
from scripts.update_dashboard_data import channel_latest_dates, partition_latest_dates
parts = read_partition_files()
print(partition_latest_dates(parts))
print(channel_latest_dates(merge_partition_payloads(parts)))
PY
```

Run focused tests, then the full suites for cross-cutting changes:

```bash
node --test tests/*.js
python3 -m unittest discover -s tests
python3 scripts/build_static_site.py
```

## Public Deployment Verification

The updater invokes `scripts/sync_public_dashboard.py`. Then wait for Pages:

```bash
gh run list --repo Estella0819/skt-meta-dashboard-public --limit 3
gh run watch RUN_ID --repo Estella0819/skt-meta-dashboard-public --exit-status
```

Compare SHA-256 hashes for changed local files under `dist/server/public` and the public URL with a commit cache-buster. At minimum verify `index.html` and every changed `data/dashboard-*-data.js` or `src/*` asset.

## Troubleshooting

- API write succeeded but dashboard is old: export/build/sync may not have run; inspect partition dates and remote commit.
- Online page is old: wait for Pages, add `?v=COMMIT`, then compare hashes.
- Meta newest day collapses to few countries: inspect failed accounts before deleting/replacing data; re-pull fail-closed.
- Spend looks doubled: query raw distinct keys before touching frontend aggregation.
- Channel freshness fails: update that source if a supported fetcher exists; otherwise publish only with an explicit stale-source disclosure. Never fill forward.
- Current-day values are partial until the natural day closes.
- Lifecycle refresh is paused: do not use `--refresh-lifecycle` or claim its maximum date advanced.
