const DashboardMetrics = (() => {
  const numeric = (value) => Number(value || 0);

  const calculateAov = (revenue, conversions) => {
    const count = numeric(conversions);
    return count ? numeric(revenue) / count : 0;
  };

  const calculateAovFromRows = (
    rows,
    revenueKey = "purchase_value",
    conversionKey = "purchase_times",
  ) => {
    const revenue = rows.reduce((sum, row) => sum + numeric(row[revenueKey]), 0);
    const conversions = rows.reduce((sum, row) => sum + numeric(row[conversionKey]), 0);
    return calculateAov(revenue, conversions);
  };

  return { calculateAov, calculateAovFromRows };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = DashboardMetrics;
}
