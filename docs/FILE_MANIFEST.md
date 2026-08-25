# File Manifest

| Path | Role | Edit policy |
|---|---|---|
| `index.html` | Dashboard page shell and module containers | Manual; test after changes |
| `src/app.js` | Shared state, filtering, rendering orchestration | Manual; high blast radius |
| `src/dashboard-metrics.js` | Aggregate metric formulas | Manual; formula tests required |
| `src/dashboard-state.js` | URL and filter state | Manual; cross-filter tests required |
| `src/page-config.js` | Page/source/filter contracts | Manual |
| `src/pages/` | Page-specific analysis and hierarchies | Manual |
| `src/components/` | Tables, charts, filters, shell controls | Manual; responsive tests required |
| `src/styles.css` | Visual system and responsive layout | Manual; screenshot QA required |
| `scripts/fetch_meta_ad_country_daily.py` | Meta API ingestion | Manual; fail-closed and idempotency tests |
| `scripts/fetch_shopify_sales_report.py` | Main Shopify Analytics ingestion | Manual; direct `net_sales` |
| `scripts/fetch_snapchat_attribution_daily.py` | Snapchat ingestion | Manual |
| `scripts/export_bq_data.py` | Canonical queries and mappings | Manual; data contract tests required |
| `scripts/update_dashboard_data.py` | End-to-end updater and freshness gate | Manual; never bypass silently |
| `scripts/build_static_site.py` | Deterministic static build | Manual |
| `scripts/sync_public_dashboard.py` | GitHub Pages repository sync | Manual; includes handoff package |
| `data/product-classification.csv` | Confirmed advertising product mapping/form | Human-reviewed input |
| `data/dashboard-*-data.js` | Frontend data snapshots | Generated; never hand-edit |
| `data/*mapping*.csv` | Mapping/audit exports | Generated or human-reviewed as named |
| `tests/` | Behavioral and data contracts | Manual; update before production code |
| `skills/meta-shopify-dashboard/` | Portable Codex maintenance Skill | Manual; validate before publishing |
| `.env.example` | Secret-free configuration template | Manual; placeholders only |
| `.env` | Real local credentials | Never commit |
| `dist/` | Static build output | Generated; never edit |

## Published Data Packages

- `dashboard-core-data.js`: overview, product, country shared facts.
- `dashboard-creative-data.js`: creative and landing detail.
- `dashboard-channel-data.js`: Shopify/Amazon/TikTok channel facts.
- `dashboard-attribution-data.js`: Meta/Google/Shopify/Snapchat attribution facts.
- `dashboard-lifecycle-data.js`: retained lifecycle snapshot; currently paused.

The public repository is intentionally a deployable artifact plus documentation. The maintainer's working source may contain additional design notes and test history not needed by the browser.
