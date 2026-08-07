(function attachDashboardPages(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardPages = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardPages() {
  const modules = ["conclusion", "kpis", "trend", "structure", "detail"];
  const pages = {
    overview: {
      title: "总览",
      subtitle: "投放规模、效率和趋势",
      filters: ["account", "country", "product", "productForm", "operator"],
      segments: [],
      modules,
    },
    product: {
      title: "产品",
      subtitle: "产品名称、单品套组和产品表现",
      filters: ["account", "country", "product", "productForm", "operator"],
      segments: ["overall", "form", "material"],
      modules,
    },
    country: {
      title: "国家",
      subtitle: "国家层面的产品承接和素材贡献",
      filters: ["account", "country", "product", "countryRegion", "operator"],
      segments: [],
      drillDown: { key: "region", default: "ALL" },
      modules,
    },
    creative: {
      title: "素材",
      subtitle: "高花费、高回报和风险素材分层",
      filters: ["account", "country", "product", "productForm", "operator", "materialType", "videoSource", "videoSubtype", "materialName", "adName", "lifecycleCreativeId"],
      segments: ["type", "source", "subtype"],
      modules,
    },
    lifecycle: {
      title: "素材生命周期",
      subtitle: "从产品到素材识别衰退趋势和行动机会",
      filters: ["product", "material_type", "creative_id", "diagnosis", "stage", "metric"],
      segments: [],
      modules,
    },
    landing: {
      title: "落地页",
      subtitle: "活动专题页、详情页和集合页承接表现",
      filters: ["account", "country", "product", "landingType", "operator"],
      segments: [],
      modules,
    },
    attribution: {
      title: "归因",
      subtitle: "渠道投放、Shopify 承接与数据可用性",
      filters: ["channel", "googleAdTypes", "googleProducts", "googleCountries"],
      segments: [],
      modules,
    },
    channels: {
      title: "渠道情况",
      subtitle: "Shopify、Amazon 和 TikTok 销售趋势",
      filters: ["channel", "channelProduct", "channelMarket", "channelCountries"],
      segments: [],
      modules: ["channel-summary", "channel-trend", "all-channel-products", "product-channel-mix", "channel-product-detail"],
    },
  };

  function get(pageId) {
    return pages[pageId] ? structuredClone(pages[pageId]) : undefined;
  }

  function filterKeys() {
    return [...new Set(Object.values(pages).flatMap((page) => page.filters))];
  }

  function pageIds() {
    return Object.keys(pages);
  }

  return { get, filterKeys, pageIds };
});
