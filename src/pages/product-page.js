(function attachDashboardProduct(root, metrics, factory) {
  const api = factory(metrics);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardProduct = api;
})(
  typeof window !== "undefined" ? window : globalThis,
  typeof DashboardMetrics !== "undefined" ? DashboardMetrics : require("../dashboard-metrics.js"),
  function createDashboardProduct(DashboardMetricsApi) {
    const segmentDimension = {
      overall: "standard_product_name",
      form: "product_form",
      material: "material_type",
    };
    const filterFields = {
      account: ["account_name"],
      country: ["country"],
      product: ["product_name", "standard_product_name"],
      productForm: ["product_form"],
      materialType: ["material_type"],
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
      return { text: `${diff >= 0 ? "+" : ""}${(diff * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`, cls: diff >= 0 ? "up" : "down" };
    }

    function withShares(rows) {
      const spend = rows.reduce((sum, row) => sum + row.spend, 0);
      const sales = rows.reduce((sum, row) => sum + row.purchase_value, 0);
      return rows.map((row) => ({
        ...row,
        spend_share: spend ? row.spend / spend : 0,
        sales_share: sales ? row.purchase_value / sales : 0,
      }));
    }

    function compareRows(current, previous, dimensions) {
      const currentRows = withShares(DashboardMetricsApi.groupRows(current, dimensions));
      const previousRows = withShares(DashboardMetricsApi.groupRows(previous, dimensions));
      const key = (row) => dimensions.map((dimension) => row[dimension] ?? "Unknown").join("||");
      const previousMap = new Map(previousRows.map((row) => [key(row), row]));
      return currentRows.map((row) => {
        const before = previousMap.get(key(row)) || {};
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
      }).sort((left, right) => right.purchase_value - left.purchase_value || right.spend - left.spend);
    }

    function selectModel(factRows, previousFactRows, adRows, previousAdRows, filters = {}, requestedSegment = "overall") {
      const segment = segmentDimension[requestedSegment] ? requestedSegment : "overall";
      const dimension = segmentDimension[segment];
      const source = segment === "material" ? adRows : factRows;
      const previousSource = segment === "material" ? previousAdRows : previousFactRows;
      const current = applyFilters(source, filters);
      const previous = applyFilters(previousSource, filters);
      const detailDimensions = segment === "overall"
        ? ["standard_product_name"]
        : ["standard_product_name", dimension];

      return {
        segment,
        dimension,
        summary: DashboardMetricsApi.summarizeRows(current),
        previousSummary: DashboardMetricsApi.summarizeRows(previous),
        trend: DashboardMetricsApi.groupRows(current, ["date_start"]).sort((left, right) => String(left.date_start).localeCompare(String(right.date_start))),
        structure: compareRows(current, previous, [dimension]),
        previousStructure: withShares(DashboardMetricsApi.groupRows(previous, [dimension])),
        detail: compareRows(current, previous, detailDimensions),
        previousDetail: withShares(DashboardMetricsApi.groupRows(previous, detailDimensions)),
        country: compareRows(current, previous, ["standard_product_name", "country"]),
        previousCountry: withShares(DashboardMetricsApi.groupRows(previous, ["standard_product_name", "country"])),
      };
    }

    return { applyFilters, segmentDimension, selectModel };
  },
);
