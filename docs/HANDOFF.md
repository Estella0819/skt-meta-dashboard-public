# SKT Meta Dashboard Handoff

## What This Repository Contains

This public repository serves the live dashboard and includes a reusable Codex Skill plus maintenance documentation. The live URL remains:

```text
https://estella0819.github.io/skt-meta-dashboard-public/
```

The repository contains no credentials. Obtain BigQuery/API access separately and create a local `.env` from `.env.example`.

## First-Time Setup

1. Clone the source project used by the dashboard maintainer, or use the public static files for read-only inspection.
2. Install Python dependencies required by the scripts (`google-cloud-bigquery`, HTTP client dependencies) in the local environment.
3. Create `.env` outside version control and fill only the services the operator may refresh.
4. Ensure the GCP identity can query/write `advance-rush-406115.dim_independent_site` in location `US`.
5. Install `skills/meta-shopify-dashboard` into the local Codex skills directory.

## Normal Update

From the dashboard source root:

```bash
python3 scripts/update_dashboard_data.py \
  --start-date YYYY-MM-DD \
  --end-date YYYY-MM-DD
```

This refreshes supported sources, exports data partitions, validates freshness, builds, and publishes. Use `--skip-public-sync` for local-only work. Lifecycle refresh is paused unless explicitly resumed with `--refresh-lifecycle`.

## Acceptance Checklist

- Requested dates and all target Meta accounts are present.
- Meta ad-country-day keys are unique.
- Source and partition maximum dates are reported separately.
- Current day is labelled partial.
- Focused/full tests and static build pass.
- GitHub Pages action succeeds.
- Online hashes match the local build.
- No token, `.env`, service-account JSON, or credential path is committed.

## Where To Read Next

- [FILE_MANIFEST.md](FILE_MANIFEST.md): file ownership and generated/manual boundaries.
- [`skills/meta-shopify-dashboard/SKILL.md`](../skills/meta-shopify-dashboard/SKILL.md): agent workflow.
- Skill references: data/mapping, visual/interaction, operations/deployment, project reuse.
