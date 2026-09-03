(function attachDashboardPages(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardPages = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardPages() {
  const modules = ["conclusion", "kpis", "trend", "structure", "detail"];
  const metaCrossFilters = [
    "account",
    "country",
    "product",
    "productForm",
    "operator",
    "landingType",
    "materialType",
    "videoSource",
    "videoSubtype",
    "materialName",
    "adName",
  ];
  const pages = {
    overview: {
      title: "总览",
      subtitle: "投放规模、效率和趋势",
      filters: ["account", "country", "product", "productForm", "operator"],
      dataFilters: metaCrossFilters,
      segments: [],
      modules,
    },
    product: {
      title: "产品",
      subtitle: "产品名称、单品套组和产品表现",
      filters: ["account", "country", "product", "productForm", "operator"],
      dataFilters: metaCrossFilters,
      segments: ["overall", "form", "material"],
      modules,
    },
    country: {
      title: "国家",
      subtitle: "国家层面的产品承接和素材贡献",
      filters: ["account", "country", "product", "countryRegion", "operator"],
      dataFilters: metaCrossFilters,
      segments: [],
      drillDown: { key: "region", default: "ALL" },
      modules,
    },
    creative: {
      title: "素材",
      subtitle: "高花费、高回报和风险素材分层",
      filters: ["account", "country", "product", "productForm", "operator", "materialType", "videoSource", "videoSubtype", "materialName", "adName"],
      dataFilters: metaCrossFilters,
      segments: ["type", "source", "subtype"],
      modules,
    },
    landing: {
      title: "落地页",
      subtitle: "集合页、活动专题页、Bundle页和单品详情页承接表现",
      filters: ["account", "country", "product", "landingType", "operator"],
      dataFilters: metaCrossFilters,
      segments: [],
      modules,
    },
    allChannels: {
      title: "全渠道",
      subtitle: "投放归因、站内承接与销售渠道表现",
      filters: ["channel", "channelProduct", "channelMarket", "channelCountries", "googleAdTypes", "googleProducts", "googleCountries"],
      segments: [],
      modules: [...modules, "channel-summary", "channel-trend", "all-channel-products", "product-channel-mix", "channel-product-detail"],
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
