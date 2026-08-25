# Visual And Interaction Rules

## Page Reading Order

Every analytical page follows: `页面结论 -> 专属 KPI -> 主趋势 -> 结构图 -> 明细表`.

Current pages: 总览, 产品, 国家, 素材, 素材生命周期, 落地页, 归因, 渠道情况. There is no standalone 站内 or 投手 page; operator remains a filter/dimension where relevant.

## Global And Local Filters

- Global date/comparison/account filters stay sticky. Date changes require confirmation before refresh.
- Advertising product/account/country/operator/material/landing filters cross-filter 总览, 产品, 国家, 素材, and 落地页 where the dimension exists.
- Channel product filters are isolated to 渠道情况.
- Multi-select menus provide search when options exceed five, plus 全选 and 全不选.
- Region selection directly selects its countries.
- Preserve scroll position after filter changes. Always show active hidden filters and a reset action.
- Table/chart dimension clicks update the same canonical filter state; do not implement private one-off filters.

## Charts

- Trend charts use clear thin lines, restrained gridlines, full x-axis labels, adequate height, and hover tooltips.
- Product/country trends default to current GMV top eight and offer a compact searchable dropdown for alternatives.
- Creative trend follows current material hierarchy.
- Tooltip: date, name, daily GMV, daily share; add page-specific metrics only when useful.
- Structure uses a single-layer GMV-share donut. Keep it compact and pair it with a complete hierarchy table; hover shows name, GMV, share, spend, ROAS, conversions.
- Avoid oversized chart whitespace. Prefer one- or two-column layouts; never 1x1x1 narrow panels.

## Tables

- A table must be horizontally complete on desktop and mobile. Horizontal scrolling is forbidden.
- Show about ten rows; additional rows scroll vertically inside the table.
- Use responsive column sizing or mobile cards. Never truncate important headers/values into unreadable text.
- Center table headers and values unless a specific textual field reads better left-aligned.
- Sum rows include period-over-period values wherever comparable.
- Copy-table output separates current and comparison/delta values into independent columns and follows the displayed filter state.
- Put one copy button in every analytical table header.
- Keep metric value and comparison close. Titles carry only a concise metric/source hint; analysis sits above or beside the visualization.

## Page Intent

- 总览: fastest diagnosis of scale, efficiency, trend, product/country/creative contribution, and risk.
- 产品: overall/单品套组/素材组合 analysis, expandable product families, product daily trends, GMV structure, details.
- 国家: region overview then click-expand countries, country daily trends, GMV structure, country-product details.
- 素材: material type -> video source -> subtype drilldown, creative/product performance, compact structure, details last.
- 落地页: overall landing type first, then product/country/creative explanation.
- 归因: Meta/Google key performance and trend, Shopify net-sales context, platform efficiency and source coverage.
- 渠道情况: channel comparison first, then total product sales/units and each channel's product emphasis. Units are the primary comparison.
- 生命周期: retained read-only snapshot; do not imply freshness while refresh is paused.

Use restrained neutral surfaces, blue for primary interaction, red/green only for status, consistent Chinese system fonts, 8px-or-less radii, and page side gutters. Do not let cards or charts span edge to edge without breathing room.
