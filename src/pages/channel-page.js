(function attachDashboardChannels(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardChannels = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardChannels() {
  const defaultComparableCountries = ["AU", "CA", "JP", "GB"];

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeRow(row) {
    return {
      ...row,
      sku_code: String(row?.sku_code || "Unknown").trim().toUpperCase() || "Unknown",
      product_name: String(row?.product_name || "Unknown").trim() || "Unknown",
      channel: String(row?.channel || "Unknown").trim() || "Unknown",
      channel_units: number(row?.channel_units ?? row?.units),
      channel_sales: number(row?.channel_sales ?? row?.sales),
    };
  }

  function applyFilters(rows, filters = {}) {
    const market = filters.channelMarket || filters.market || "US";
    const countries = filters.channelCountries || filters.countries || [];
    const channels = filters.channel || [];
    const products = filters.channelProduct || filters.product || [];
    const allowedCountries = market === "NON_US_COMPARE" && !countries.length
      ? defaultComparableCountries
      : countries;

    return (rows || []).map(normalizeRow).filter((row) => {
      if (row.channel_sales === 0 || row.market !== market) return false;
      if (countries.length && !allowedCountries.includes(row.country_code)) return false;
      if (channels.length && !channels.includes(row.channel)) return false;
      if (products.length && !products.includes(row.product_name)) return false;
      return true;
    });
  }

  function groupRows(rows, dimensions, options = {}) {
    const groups = new Map();
    for (const row of rows) {
      const key = dimensions.map((dimension) => row[dimension] ?? "Unknown").join("||");
      const group = groups.get(key) || {
        ...Object.fromEntries(dimensions.map((dimension) => [dimension, row[dimension] ?? "Unknown"])),
        channel_units: 0,
        channel_sales: 0,
        channels: new Set(),
      };
      group.channel_units += row.channel_units;
      group.channel_sales += row.channel_sales;
      group.channels.add(row.channel);
      groups.set(key, group);
    }
    return [...groups.values()].map((row) => {
      const result = {
        ...Object.fromEntries(dimensions.map((dimension) => [dimension, row[dimension]])),
        channel_units: row.channel_units,
        channel_sales: row.channel_sales,
        unit_value: row.channel_units ? row.channel_sales / row.channel_units : 0,
      };
      return options.includeChannelCount ? { ...result, channel_count: row.channels.size } : result;
    });
  }

  function deltaText(now, before) {
    if (!before) return { text: "上一周期无数据", cls: "flat" };
    const difference = (now - before) / before;
    return {
      text: `${difference >= 0 ? "+" : ""}${(difference * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`,
      cls: difference >= 0 ? "up" : "down",
    };
  }

  function addComparison(rows, previousRows, dimensions) {
    const keyFor = (row) => dimensions.map((dimension) => row[dimension] ?? "Unknown").join("||");
    const previousByKey = new Map(previousRows.map((row) => [keyFor(row), row]));
    return rows.map((row) => {
      const previous = previousByKey.get(keyFor(row)) || {};
      return {
        ...row,
        sales_delta: deltaText(row.channel_sales, previous.channel_sales),
        units_delta: deltaText(row.channel_units, previous.channel_units),
        unit_value_delta: deltaText(row.unit_value, previous.unit_value),
      };
    });
  }

  function sortByUnits(left, right) {
    return right.channel_units - left.channel_units
      || right.channel_sales - left.channel_sales
      || String(left.product_name).localeCompare(String(right.product_name));
  }

  function selectModel(rows, previousRows, filters = {}) {
    const current = applyFilters(rows, filters);
    const previous = applyFilters(previousRows, filters);
    const summary = groupRows(current, ["channel"]).sort(sortByUnits);
    const previousSummary = groupRows(previous, ["channel"]);
    const daily = groupRows(current, ["date_start", "channel"])
      .sort((left, right) => String(left.date_start).localeCompare(String(right.date_start))
        || String(left.channel).localeCompare(String(right.channel)));
    const allChannelProducts = groupRows(current, ["sku_code", "product_name"], { includeChannelCount: true })
      .sort(sortByUnits);
    const productMix = groupRows(current, ["channel", "sku_code", "product_name"])
      .sort(sortByUnits);
    const previousChannelProductDetail = groupRows(previous, ["channel", "sku_code", "product_name"]);
    const channelProductDetail = addComparison(productMix, previousChannelProductDetail, ["channel", "sku_code", "product_name"])
      .sort(sortByUnits);

    return {
      summary: addComparison(summary, previousSummary, ["channel"]),
      daily,
      allChannelProducts,
      productMix,
      channelProductDetail,
      previousSummary,
      previousChannelProductDetail,
    };
  }

  return { applyFilters, selectModel };
});
