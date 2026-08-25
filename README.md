# SKINTIFIC 独立站投放看板

线上入口：<https://estella0819.github.io/skt-meta-dashboard-public/>

本项目是 SKINTIFIC 独立站广告与渠道分析看板，当前包含：总览、产品、国家、素材、素材生命周期、落地页、归因、渠道情况。投手作为筛选维度保留，不设置独立投手页；站内指标在归因/渠道语境中呈现，不设置独立站内页。

## 交接入口

- [完整交接说明](docs/HANDOFF.md)
- [文件职责清单](docs/FILE_MANIFEST.md)
- [可安装 Codex Skill](skills/meta-shopify-dashboard/SKILL.md)
- [脱敏环境变量模板](.env.example)

Skill references 分别说明数据与映射、视觉与交互、日常更新与发布、项目复用。它们以当前代码和公开链接为准。

## 数据流

```text
Meta API / Shopify Analytics / Snapchat API / BigQuery marts
  -> scripts/update_dashboard_data.py
  -> scripts/export_bq_data.py
  -> data/dashboard-*-data.js
  -> scripts/build_static_site.py
  -> scripts/sync_public_dashboard.py
  -> GitHub Pages
```

BigQuery dataset：`advance-rush-406115.dim_independent_site`，location 固定 `US`，币种统一 USD。Meta 产品/国家/素材/落地页只使用 Meta 广告数据；渠道情况页使用 Shopify/Amazon/TikTok 的渠道商品与 SKU，不与广告产品筛选混用。

## 日常更新

在维护源码目录运行：

```bash
python3 scripts/update_dashboard_data.py \
  --start-date YYYY-MM-DD \
  --end-date YYYY-MM-DD
```

默认流程会拉取支持的数据源、导出五个分区、检查渠道新鲜度、构建并同步 GitHub Pages。仅本地更新时加 `--skip-public-sync`。

素材生命周期目前暂停更新，默认保留已有快照。除非重新确认标准，不要使用 `--refresh-lifecycle`。

## 本地预览

```bash
python3 -m http.server 5177
```

浏览器访问 <http://localhost:5177/>。

## 验证

```bash
node --test tests/*.js
python3 -m unittest discover -s tests
python3 scripts/build_static_site.py
```

发布后必须等待 GitHub Pages Action 成功，并核对线上文件与 `dist/server/public` 的哈希。API/BQ 写入成功不等于看板已经更新。

## 安全

仓库不得包含 `.env`、access token、Shopify token、Snapchat secret、服务账号 JSON 或任何真实凭据。使用 `.env.example` 创建本地配置，真实值只保存在本机。
