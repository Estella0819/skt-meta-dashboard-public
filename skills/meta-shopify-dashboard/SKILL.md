---
name: meta-shopify-dashboard
description: Use when maintaining, updating, auditing, deploying, handing off, or adapting the SKINTIFIC independent-site advertising dashboard, including Meta, Shopify, Google, Snapchat, Amazon, TikTok, product, country, creative, landing-page, attribution, channel, filter, chart, table, or GitHub Pages work.
---

# Meta Shopify Dashboard

Treat this dashboard as a versioned data product. Never claim an update from API/BQ writes alone: export, validate, build, deploy, and verify the public files.

## Locate The Project

Prefer the directory containing `scripts/update_dashboard_data.py`, `src/app.js`, and `data/dashboard-core-data.js`:

```bash
test -d /Users/mingyue/Desktop/AI/数据分析/meta-dashboard && cd /Users/mingyue/Desktop/AI/数据分析/meta-dashboard
test -d /Users/mingyue/Documents/数据分析/meta-dashboard && cd /Users/mingyue/Documents/数据分析/meta-dashboard
```

Public URL and repository:

```text
https://estella0819.github.io/skt-meta-dashboard-public/
https://github.com/Estella0819/skt-meta-dashboard-public
```

## Choose The Reference

- Data sources, metrics, products, materials, regions, and landing pages: read [data-and-mapping-rules.md](references/data-and-mapping-rules.md).
- UI, responsive tables, charts, filters, and page intent: read [visual-and-interaction-rules.md](references/visual-and-interaction-rules.md) and use `$dashboard-visual-rules`.
- Daily updates, validation, troubleshooting, and GitHub Pages publishing: read [operations-and-deployment.md](references/operations-and-deployment.md).
- File ownership and adapting another brand: read [project-and-reuse-guide.md](references/project-and-reuse-guide.md).

## Required Workflow

1. Inspect `git status`; preserve user changes and never revert unrelated work.
2. Identify the page, source, metric grain, mapping rule, filter scope, and comparison period affected.
3. For data updates, run the all-in-one updater with explicit dates. Lifecycle remains paused unless the user explicitly resumes it.
4. Fail closed on partial Meta account pulls, duplicate ad-country-day keys, missing partitions, stale required channels, invalid lifecycle payloads, or failed builds.
5. For code changes, add or update focused tests first and run the affected suite.
6. Build the static bundle. For online requests, sync the public GitHub Pages repository and wait for the deployment action.
7. Compare online and local hashes for `index.html` and every changed data/source asset.
8. Report exact source maximum dates. Label the current day as partial; never copy old values or turn unavailable data into zero.

## Update Command

```bash
python3 scripts/update_dashboard_data.py \
  --start-date YYYY-MM-DD \
  --end-date YYYY-MM-DD
```

Use `--skip-public-sync` for local-only work. Use `--refresh-lifecycle` only after the lifecycle definition is approved again.

## Completion Gate

Do not say complete until all applicable checks pass:

- Requested Meta dates exist and every requested account succeeded.
- Raw Meta key `date + account_id + ad_id + country` has no duplicates.
- Core, creative, channel, and attribution partitions have expected maximum dates; lifecycle pause is disclosed.
- Metric formulas and source labels match the reference.
- Tables are horizontally complete with vertical detail scrolling only.
- Cross-filters affect every intended page and preserve scroll position.
- Build/tests pass.
- GitHub Pages action succeeds and remote hashes match the local build.
- No `.env`, token, credential JSON, or secret is staged.
