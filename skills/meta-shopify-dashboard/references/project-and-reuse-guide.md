# Project And Reuse Guide

## Data Flow

```text
Meta API / Shopify Analytics / Snapchat API / BigQuery marts
  -> scripts/update_dashboard_data.py
  -> scripts/export_bq_data.py
  -> data/dashboard-{core,creative,channel,attribution,lifecycle}-data.js
  -> index.html + src/
  -> scripts/build_static_site.py
  -> dist/server/public
  -> scripts/sync_public_dashboard.py
  -> GitHub Pages
```

## Ownership Map

- `index.html`: page shell, navigation, filter/chart/table containers, script loading.
- `src/app.js`: shared state, global filters, render orchestration, landing/material helpers.
- `src/dashboard-state.js`: URL/state normalization.
- `src/dashboard-metrics.js`: aggregate metric formulas.
- `src/page-config.js`: page filters/modules and source boundaries.
- `src/pages/*.js`: page-specific models and hierarchy logic.
- `src/components/*.js`: tables, filters, charts, segmented controls, page shell.
- `src/styles.css`: visual tokens, responsive layout, chart/table sizing.
- `scripts/export_bq_data.py`: canonical BQ queries and mapping logic.
- `scripts/fetch_*.py`: source ingestion.
- `scripts/dashboard_data_partitions.py`: partition merge and lifecycle validation.
- `scripts/update_dashboard_data.py`: end-to-end refresh and freshness gate.
- `scripts/build_static_site.py`: deterministic static bundle.
- `scripts/sync_public_dashboard.py`: public repository sync and push.
- `data/product-classification.csv`: advertising product normalization and product form.
- `data/dashboard-*.js`: generated snapshots; never hand-edit.
- `tests/`: source contracts, mappings, rendering, update, build, and deployment behavior.

## Reuse For Another Brand

1. Fork the private/source project; do not reuse SKT secrets or BQ table names.
2. Define brand/account/store/channel configuration outside source control.
3. Replace product mapping and hierarchy only after auditing real names/SKUs.
4. Confirm currency, timezone, purchase action, Shopify net-sales definition, region rules, and channel grains.
5. Keep advertising-product and sales-channel-product filters separate unless a verified shared key exists.
6. Run mapping coverage exports and leave unknowns visible.
7. Adapt page KPIs to the brand's decisions; retain table/chart/responsive contracts.
8. Create a new public repository/URL and update deployment constants.
9. Validate a known day per source before loading history.

## Installing The Skill

Copy the repository folder `skills/meta-shopify-dashboard` into the user's Codex skills directory as one intact folder. Do not copy project `.env` or data snapshots into the skill directory. Restart/reload Codex if the skill list does not refresh automatically.
