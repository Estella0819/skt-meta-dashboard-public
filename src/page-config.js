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
      filters: ["account", "country", "product", "productForm", "channel"],
      segments: [],
      modules,
    },
    product: {
      title: "产品",
      subtitle: "产品名称、单品套组和产品表现",
      filters: ["account", "country", "product", "productForm"],
      segments: ["overall", "form", "material"],
      modules,
    },
    country: {
      title: "国家",
      subtitle: "国家层面的产品承接和素材贡献",
      filters: ["account", "country", "product"],
      segments: [],
      drillDown: { key: "region", default: "ALL" },
      modules,
    },
    creative: {
      title: "素材",
      subtitle: "高花费、高回报和风险素材分层",
      filters: ["account", "country", "product", "operator", "materialType", "videoSource", "videoSubtype", "materialName", "adName"],
      segments: ["type", "source", "subtype"],
      modules,
    },
    landing: {
      title: "落地页",
      subtitle: "活动专题页、详情页和集合页承接表现",
      filters: ["account", "country", "product", "landingType"],
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
      filters: ["channel", "channelProduct"],
      segments: [],
      modules,
    },
  };

  function get(pageId) {
    return pages[pageId] ? structuredClone(pages[pageId]) : undefined;
  }

  return { get };
});
