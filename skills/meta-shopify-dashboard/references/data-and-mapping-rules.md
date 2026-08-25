# Data And Mapping Rules

## Source Boundaries

BigQuery project/dataset: `advance-rush-406115.dim_independent_site`; query location: `US`; currency: USD.

- Meta product/country/creative/landing pages: Meta only. Source refresh is `raw_skt_independent_site_ad_country_daily_ads`, fetched at ad x country x day and exported through the canonical CTE in `scripts/export_bq_data.py`.
- Attribution: Meta + Google + Shopify; Snapchat is also shown where the page supports it. Platform attributed GMV can overlap and must not be added to Shopify as total revenue.
- Channel page: Shopify/Amazon/TikTok, using channel product/SKU names. Never mix channel-product options into advertising-product filters.
- Shopify financial truth: direct Shopify Analytics `net_sales` imported into `manual_skt_shopify_sales_report_daily`; order reconstruction is fallback only for uncovered store-date keys.
- Avoid `dashboard_ad_platform` and `dashboard_channel_performance`; their historical totals are inflated.
- Lifecycle is a separate retained snapshot and is currently paused.

## Metric Formulas

Aggregate numerators and denominators first; never average row-level rates.

```text
Meta GMV = SUM(purchase_value)
ROAS = SUM(purchase_value) / SUM(spend)
CPA = SUM(spend) / SUM(purchase_times)
AOV = SUM(purchase_value) / SUM(purchase_times)
Link CTR = SUM(inline_link_clicks) / SUM(impressions)
Outbound CVR = SUM(purchase_times) / SUM(outbound_clicks)
CPM = SUM(spend) / SUM(impressions) * 1000
MER = Shopify net_sales / (Meta spend + Google spend)
```

`clicks` remains an audit field and is not the Meta creative CTR/CVR denominator. Shopify `total_sales` is not displayed by default.

## Product Rules

- Advertising pages use product names extracted and normalized from Meta ad names plus `data/product-classification.csv`.
- Channel page uses SKU/product identity from each sales channel. Zero-sales gifts are excluded; unmatched single-channel SKUs remain in that channel.
- Do not classify 图片, 利益点, 卖点, 素材, 痛点, 场景, 日常, or 测评 as products without an explicit second token or confirmed mapping.
- `SC2606240536` is 跨品类. Only true multi-category material is 跨品类.
- `粉色Pdrn水油喷雾` and `pdrn水油喷雾` normalize to `PDRN水油喷雾`.
- Confirmed parent hierarchy is implemented in `src/pages/product-page.js`: 底妆系列 (底妆合集, 气垫系列, 粉饼系列, 有色面霜系列), 防晒系列, VC系列, 美白系列, 水光肌系列, PDRN系列, 泥膜棒系列, 水油喷雾系列.
- A single cushion name remains that product; multiple cushion names become 气垫合集.
- Mapping uncertainty must remain visible and be exported for human review. Do not invent mappings.

## Creative Classification Priority

Apply case-insensitively in this order:

1. Any `Aditya` -> 合创.
2. `tt搬运` or `tiktok搬运` -> 视频 / TT搬运 / TT搬运, even when no generic video token exists.
3. `合创` or `帖子` -> 合创.
4. `P_` or `图片` -> 图文.
5. `video`, `视频`, or token `V_` -> 视频; otherwise 图文.
6. Video source: `tt搬运`/`tiktok搬运` -> TT搬运; all other video -> 自产素材.
7. Owned-video subtype priority: `PUGC`; `TT Home`/`TT Ads` -> `TT mirror`; `Dy ref`/`ID S-level`/`IG ORDER` -> `印尼模版/IG`; KOL patterns; Hijab; IG S-level edits; Photo; AI Test; otherwise `其他自产`.

Material detail tables show the raw material code only; if no code exists, leave it blank. Do not show ad name or video source there unless the user explicitly changes the detail contract.

## Other Dimensions

- Operator: campaign name containing `estella` -> Estella; containing `leo` -> Leo; otherwise 未识别投手.
- Regions: 中东 = SA/AE; 美国 = US; 墨西哥 = MX; 澳英加 = remaining recognized non-US markets; keep 未识别地区 explicit. Countries within a region sort by current Meta GMV descending.
- Landing page uses `adset_name` only. The rightmost explicit label wins: 集合页, 活动专题页, Bundle页, 单品/详情页. Without an explicit label, use activity/bundle/product keywords; otherwise 集合页.
- Country source is the Meta country breakdown. Never infer advertising country from store destination or campaign prose when the breakdown exists.
