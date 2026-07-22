(function attachDashboardCountry(root, metrics, factory) {
  const api = factory(metrics);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardCountry = api;
})(
  typeof window !== "undefined" ? window : globalThis,
  typeof DashboardMetrics !== "undefined" ? DashboardMetrics : require("../dashboard-metrics.js"),
  function createDashboardCountry(DashboardMetricsApi) {
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
    };

    function regionForCountry(country) {
      const value = String(country || "").trim().toUpperCase();
      if (!value || value === "UNKNOWN") return "未识别地区";
      if (value === "SA" || value === "AE") return "中东";
      if (value === "US") return "美国";
      return "澳英加";
    }

    function isMetaRow(row) {
      return row.operator !== "Google" && row.material_type !== "Google";
    }

    function applyFilters(rows, filters = {}) {
      return (rows || []).filter(isMetaRow).filter((row) => Object.entries(filters).every(([key, selected]) => {
        if (!Array.isArray(selected) || selected.length === 0) return true;
        const fields = filterFields[key] || [key];
        return fields.some((field) => selected.includes(row[field]));
      })).map((row) => ({
        ...row,
        standard_product_name: row.standard_product_name || row.product_name || "Unknown",
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

    function compareKey(row, dimensions) {
      return dimensions.map((dimension) => row[dimension] ?? "Unknown").join("||");
    }

    function addComparison(rows, previousRows, dimensions) {
      const previousMap = new Map(DashboardMetricsApi.groupRows(previousRows, dimensions)
        .map((row) => [compareKey(row, dimensions), row]));
      const empty = DashboardMetricsApi.summarizeRows([]);
      return rows.map((row) => {
        const previous = previousMap.get(compareKey(row, dimensions)) || empty;
        return {
          ...row,
          spend_delta: deltaText(row.spend, previous.spend),
          sales_delta: deltaText(row.purchase_value, previous.purchase_value),
          conversion_delta: deltaText(row.purchase_times, previous.purchase_times),
          roas_delta: deltaText(row.roas, previous.roas),
          cpa_delta: deltaText(row.cpa, previous.cpa),
          ctr_delta: deltaText(row.ctr, previous.ctr),
          cvr_delta: deltaText(row.cvr, previous.cvr),
          aov_delta: deltaText(row.aov, previous.aov),
        };
      });
    }

    function aggregateRegions(rows) {
      const withRegion = rows.map((row) => ({ ...row, region: regionForCountry(row.country) }));
      const countrySets = new Map();
      for (const row of withRegion) {
        if (!countrySets.has(row.region)) countrySets.set(row.region, new Set());
        countrySets.get(row.region).add(row.country || "Unknown");
      }
      return DashboardMetricsApi.groupRows(withRegion, ["region"]).map((row) => ({
        ...row,
        country_count: countrySets.get(row.region)?.size || 0,
      }));
    }

    function addRegionShares(rows, previousRows) {
      const previousMap = new Map(previousRows.map((row) => [row.region, row]));
      const totalSpend = rows.reduce((sum, row) => sum + row.spend, 0);
      const totalSales = rows.reduce((sum, row) => sum + row.purchase_value, 0);
      const previousTotalSpend = previousRows.reduce((sum, row) => sum + row.spend, 0);
      const previousTotalSales = previousRows.reduce((sum, row) => sum + row.purchase_value, 0);
      return rows.map((row) => {
        const previous = previousMap.get(row.region) || { spend: 0, purchase_value: 0, country_count: 0 };
        const spendShare = totalSpend ? row.spend / totalSpend : 0;
        const salesShare = totalSales ? row.purchase_value / totalSales : 0;
        const previousSpendShare = previousTotalSpend ? previous.spend / previousTotalSpend : 0;
        const previousSalesShare = previousTotalSales ? previous.purchase_value / previousTotalSales : 0;
        return {
          ...row,
          spend_share: spendShare,
          sales_share: salesShare,
          spend_share_delta: deltaText(spendShare, previousSpendShare),
          sales_share_delta: deltaText(salesShare, previousSalesShare),
          country_count_delta: deltaText(row.country_count, previous.country_count),
        };
      });
    }

    function selectModel(factRows, previousRows, filters = {}, region = "ALL") {
      const current = applyFilters(factRows, filters);
      const previous = applyFilters(previousRows, filters);
      const inRegion = (row) => region === "ALL" || regionForCountry(row.country) === region;
      const visible = current.filter(inRegion);
      const previousVisible = previous.filter(inRegion);
      const currentRegions = aggregateRegions(current);
      const previousRegions = aggregateRegions(previous);
      const previousRegionsWithShares = addRegionShares(previousRegions, []);
      const regions = addRegionShares(
        addComparison(currentRegions, previous.map((row) => ({ ...row, region: regionForCountry(row.country) })), ["region"]),
        previousRegions,
      ).sort((left, right) => right.purchase_value - left.purchase_value);
      const countries = addComparison(
        DashboardMetricsApi.groupRows(visible, ["country", "standard_product_name"]),
        previousVisible,
        ["country", "standard_product_name"],
      ).sort((left, right) => right.purchase_value - left.purchase_value
        || String(left.country).localeCompare(String(right.country))
        || String(left.standard_product_name).localeCompare(String(right.standard_product_name), "zh-CN"));

      return {
        summary: DashboardMetricsApi.summarizeRows(visible),
        trend: DashboardMetricsApi.groupRows(visible, ["date_start"])
          .sort((left, right) => String(left.date_start).localeCompare(String(right.date_start))),
        regions,
        countries,
        previousRegions: previousRegionsWithShares,
        previousCountries: DashboardMetricsApi.groupRows(previousVisible, ["country", "standard_product_name"]),
      };
    }

    return { applyFilters, regionForCountry, selectModel };
  },
);
