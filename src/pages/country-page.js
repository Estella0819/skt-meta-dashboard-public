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
      if (value === "MX") return "墨西哥";
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

    function sharePointDelta(now, before) {
      if (!before && !now) return { text: "持平", cls: "flat" };
      if (!before) return { text: "上期无占比", cls: "flat" };
      const points = (now - before) * 100;
      const sign = points >= 0 ? "+" : "";
      return {
        text: `${sign}${points.toLocaleString("en-US", { maximumFractionDigits: 1 })}pp`,
        cls: points >= 0 ? "up" : "down",
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

    function buildRegionHierarchy(currentRows, previousRows, expandedRegions = []) {
      const regions = addRegionShares(
        addComparison(
          aggregateRegions(currentRows),
          previousRows.map((row) => ({ ...row, region: regionForCountry(row.country) })),
          ["region"],
        ),
        aggregateRegions(previousRows),
      ).sort((left, right) => right.purchase_value - left.purchase_value);
      const currentTotals = DashboardMetricsApi.summarizeRows(currentRows);
      const previousTotals = DashboardMetricsApi.summarizeRows(previousRows);
      const output = [];
      for (const region of regions) {
        const expanded = expandedRegions.includes(region.region);
        output.push({
          ...region,
          _depth: 0,
          _nodeType: "region",
          _nodeValue: region.region,
          _expandable: true,
          _expanded: expanded,
        });
        if (!expanded) continue;
        const currentCountries = currentRows
          .filter((row) => regionForCountry(row.country) === region.region);
        const previousCountries = previousRows
          .filter((row) => regionForCountry(row.country) === region.region);
        const previousCountryGroups = DashboardMetricsApi.groupRows(previousCountries, ["country"]);
        const previousCountryMap = new Map(previousCountryGroups.map((row) => [row.country, row]));
        output.push(...addComparison(
          DashboardMetricsApi.groupRows(currentCountries, ["country"])
            .sort((left, right) => right.purchase_value - left.purchase_value
              || String(left.country).localeCompare(String(right.country))),
          previousCountryGroups,
          ["country"],
        ).map((country) => {
          const previousCountry = previousCountryMap.get(country.country);
          const spendShare = currentTotals.spend ? country.spend / currentTotals.spend : 0;
          const salesShare = currentTotals.purchase_value
            ? country.purchase_value / currentTotals.purchase_value
            : 0;
          const previousSpendShare = previousTotals.spend && previousCountry
            ? previousCountry.spend / previousTotals.spend
            : 0;
          const previousSalesShare = previousTotals.purchase_value && previousCountry
            ? previousCountry.purchase_value / previousTotals.purchase_value
            : 0;
          return {
            ...country,
            region: region.region,
            country_count: 1,
            country_count_delta: deltaText(1, previousCountry ? 1 : 0),
            spend_share: spendShare,
            sales_share: salesShare,
            spend_share_delta: deltaText(spendShare, previousSpendShare),
            sales_share_delta: deltaText(salesShare, previousSalesShare),
            _depth: 1,
            _nodeType: "country",
            _nodeValue: country.country,
            _parentValue: region.region,
            _expandable: false,
            _expanded: false,
          };
        }));
      }
      return output;
    }

    const productRegionOrder = ["中东", "美国", "澳英加", "墨西哥"];

    function normalizedProductRows(rows) {
      return (rows || []).map((row) => ({
        ...row,
        standard_product_name: row.standard_product_name || row.product_name || "Unknown",
        region: regionForCountry(row.country),
      }));
    }

    function regionMetric(now, previous, currentTotal = 0, previousTotal = 0) {
      const current = now || DashboardMetricsApi.summarizeRows([]);
      const before = previous || DashboardMetricsApi.summarizeRows([]);
      const gmvShare = currentTotal ? (current.purchase_value || 0) / currentTotal : 0;
      const previousGmvShare = previousTotal ? (before.purchase_value || 0) / previousTotal : 0;
      return {
        spend: current.spend || 0,
        purchase_value: current.purchase_value || 0,
        roas: current.roas || 0,
        gmv_share: gmvShare,
        gmv_share_delta: sharePointDelta(gmvShare, previousGmvShare),
        sales_delta: deltaText(current.purchase_value || 0, before.purchase_value || 0),
        spend_delta: deltaText(current.spend || 0, before.spend || 0),
        roas_delta: deltaText(current.roas || 0, before.roas || 0),
      };
    }

    function buildProductRegionComparison(currentRows, previousRows) {
      const current = normalizedProductRows(currentRows);
      const previous = normalizedProductRows(previousRows);
      const currentProducts = DashboardMetricsApi.groupRows(current, ["standard_product_name"])
        .sort((left, right) => right.purchase_value - left.purchase_value
          || String(left.standard_product_name).localeCompare(String(right.standard_product_name), "zh-CN"));
      const currentByProductRegion = new Map(
        DashboardMetricsApi.groupRows(current, ["standard_product_name", "region"])
          .map((row) => [compareKey(row, ["standard_product_name", "region"]), row]),
      );
      const previousByProductRegion = new Map(
        DashboardMetricsApi.groupRows(previous, ["standard_product_name", "region"])
          .map((row) => [compareKey(row, ["standard_product_name", "region"]), row]),
      );
      const previousByProduct = new Map(
        DashboardMetricsApi.groupRows(previous, ["standard_product_name"])
          .map((row) => [row.standard_product_name || "Unknown", row]),
      );

      return currentProducts.map((product) => {
        const productName = product.standard_product_name || "Unknown";
        const currentTotal = product.purchase_value || 0;
        const previousProduct = previousByProduct.get(productName);
        const previousTotal = previousProduct?.purchase_value || 0;
        const regions = {};
        productRegionOrder.forEach((region) => {
          const key = compareKey({ standard_product_name: productName, region }, ["standard_product_name", "region"]);
          regions[region] = regionMetric(
            currentByProductRegion.get(key),
            previousByProductRegion.get(key),
            currentTotal,
            previousTotal,
          );
        });
        return {
          ...product,
          standard_product_name: productName,
          product_total_purchase_value: currentTotal,
          product_total_delta: deltaText(currentTotal, previousTotal),
          regions,
        };
      });
    }

    function buildProductRegionSummary(currentRows, previousRows) {
      const current = normalizedProductRows(currentRows);
      const previous = normalizedProductRows(previousRows);
      const currentRegions = new Map(
        DashboardMetricsApi.groupRows(current, ["region"]).map((row) => [row.region, row]),
      );
      const previousRegions = new Map(
        DashboardMetricsApi.groupRows(previous, ["region"]).map((row) => [row.region, row]),
      );
      const currentTotal = DashboardMetricsApi.summarizeRows(current).purchase_value || 0;
      const previousTotal = DashboardMetricsApi.summarizeRows(previous).purchase_value || 0;
      return {
        product_total_purchase_value: currentTotal,
        product_total_delta: deltaText(currentTotal, previousTotal),
        regions: Object.fromEntries(productRegionOrder.map((region) => [
          region,
          regionMetric(
            currentRegions.get(region),
            previousRegions.get(region),
            currentTotal,
            previousTotal,
          ),
        ])),
      };
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
        trendByCountry: DashboardMetricsApi.groupRows(visible, ["date_start", "country"])
          .sort((left, right) => String(left.date_start).localeCompare(String(right.date_start))
            || String(left.country).localeCompare(String(right.country))),
        regions,
        countries,
        previousRegions: previousRegionsWithShares,
        previousCountries: DashboardMetricsApi.groupRows(previousVisible, ["country", "standard_product_name"]),
      };
    }

    return {
      applyFilters,
      regionForCountry,
      productRegionOrder,
      buildProductRegionComparison,
      buildProductRegionSummary,
      buildRegionHierarchy,
      selectModel,
    };
  },
);
