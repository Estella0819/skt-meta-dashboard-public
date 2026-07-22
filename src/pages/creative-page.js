(function attachDashboardCreative(root, metrics, factory) {
  const api = factory(metrics);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardCreative = api;
})(
  typeof window !== "undefined" ? window : globalThis,
  typeof DashboardMetrics !== "undefined" ? DashboardMetrics : require("../dashboard-metrics.js"),
  function createDashboardCreative(DashboardMetricsApi) {
    const segmentDimension = {
      type: "material_type",
      source: "video_source",
      subtype: "video_subtype",
    };
    const videoMaterialType = "视频";
    const filterFields = {
      account: ["account_name"],
      account_name: ["account_name"],
      country: ["country"],
      product: ["product_name", "standard_product_name"],
      product_name: ["product_name", "standard_product_name"],
      standard_product_name: ["standard_product_name", "product_name"],
      productForm: ["product_form"],
      product_form: ["product_form"],
      operator: ["operator"],
      materialType: ["material_type"],
      material_type: ["material_type"],
      videoSource: ["video_source"],
      video_source: ["video_source"],
      videoSubtype: ["video_subtype"],
      video_subtype: ["video_subtype"],
      materialName: ["material_name"],
      material_name: ["material_name"],
      adName: ["ad_name"],
      ad_name: ["ad_name"],
    };

    function isMetaRow(row) {
      return row.operator !== "Google" && row.material_type !== "Google";
    }

    function applyFilters(rows, filters = {}) {
      return (rows || []).filter(isMetaRow).filter((row) => Object.entries(filters).every(([key, selected]) => {
        if (!Array.isArray(selected) || selected.length === 0) return true;
        const fields = filterFields[key] || [key];
        return fields.some((field) => selected.includes(row[field]));
      }));
    }

    function deltaText(now, before) {
      if (!before) return { text: "上一周期无数据", cls: "flat" };
      const diff = (now - before) / before;
      const sign = diff >= 0 ? "+" : "";
      return {
        text: `${sign}${(diff * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`,
        cls: diff >= 0 ? "up" : "down",
      };
    }

    function rowKey(row, dimensions) {
      return dimensions.map((dimension) => row[dimension] ?? "Unknown").join("||");
    }

    function withShares(rows) {
      const totalSpend = rows.reduce((sum, row) => sum + row.spend, 0);
      const totalSales = rows.reduce((sum, row) => sum + row.purchase_value, 0);
      return rows.map((row) => ({
        ...row,
        spend_share: totalSpend ? row.spend / totalSpend : 0,
        sales_share: totalSales ? row.purchase_value / totalSales : 0,
      }));
    }

    function aggregateWithComparison(current, previous, dimensions) {
      const currentRows = withShares(DashboardMetricsApi.groupRows(current, dimensions));
      const previousRows = withShares(DashboardMetricsApi.groupRows(previous, dimensions));
      const previousMap = new Map(previousRows.map((row) => [rowKey(row, dimensions), row]));
      const empty = {
        ...DashboardMetricsApi.summarizeRows([]),
        spend_share: 0,
        sales_share: 0,
      };
      return currentRows.map((row) => {
        const before = previousMap.get(rowKey(row, dimensions)) || empty;
        return {
          ...row,
          spend_delta: deltaText(row.spend, before.spend),
          sales_delta: deltaText(row.purchase_value, before.purchase_value),
          conversion_delta: deltaText(row.purchase_times, before.purchase_times),
          roas_delta: deltaText(row.roas, before.roas),
          cpa_delta: deltaText(row.cpa, before.cpa),
          ctr_delta: deltaText(row.ctr, before.ctr),
          cvr_delta: deltaText(row.cvr, before.cvr),
          aov_delta: deltaText(row.aov, before.aov),
          spend_share_delta: deltaText(row.spend_share, before.spend_share),
          sales_share_delta: deltaText(row.sales_share, before.sales_share),
        };
      }).sort((left, right) => right.spend - left.spend);
    }

    function selectModel(adRows, previousRows, filters = {}, requestedSegment = "type") {
      const segment = segmentDimension[requestedSegment] ? requestedSegment : "type";
      const dimension = segmentDimension[segment];
      const scopePopulation = (rows) => segment === "type"
        ? rows
        : rows.filter((row) => row.material_type === videoMaterialType);
      const current = scopePopulation(applyFilters(adRows, filters));
      const previous = scopePopulation(applyFilters(previousRows, filters));
      const productDimensions = ["standard_product_name", dimension];

      return {
        segment,
        dimension,
        summary: DashboardMetricsApi.summarizeRows(current),
        previousSummary: DashboardMetricsApi.summarizeRows(previous),
        trend: DashboardMetricsApi.groupRows(current, ["date_start"])
          .sort((left, right) => String(left.date_start).localeCompare(String(right.date_start))),
        structure: aggregateWithComparison(current, previous, [dimension]),
        previousStructure: withShares(DashboardMetricsApi.groupRows(previous, [dimension])),
        productMaterial: aggregateWithComparison(current, previous, productDimensions),
        previousProductMaterial: withShares(DashboardMetricsApi.groupRows(previous, productDimensions)),
        detail: current.map((row) => ({ ...row }))
          .sort((left, right) => Number(right.spend || 0) - Number(left.spend || 0)),
        previousDetail: previous.map((row) => ({ ...row })),
      };
    }

    return { applyFilters, segmentDimension, selectModel };
  },
);
