(function attachDashboardProductFilters(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardProductFilters = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardProductFilters() {
  function clean(value) {
    const text = String(value || "").trim();
    return text && text !== "Unknown" ? text : "";
  }

  function sorted(values) {
    return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));
  }

  function advertisingOptions(rows) {
    return sorted((rows || []).flatMap((row) => [
      clean(row.product_name),
      clean(row.standard_product_name || row.product_name),
    ]));
  }

  function channelOptions(rows) {
    return sorted((rows || []).filter((row) => {
      const sku = clean(row.sku_code);
      return sku && sku.toUpperCase() !== "UNKNOWN" && Number(row.sales || row.channel_sales || 0) !== 0;
    }).map((row) => clean(row.product_name)));
  }

  return { advertisingOptions, channelOptions };
});
