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

  const finiteNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  };

  const safeRatio = (numerator, denominator) => {
    const top = finiteNumber(numerator);
    const bottom = finiteNumber(denominator);
    return top !== null && bottom !== null && bottom !== 0 ? top / bottom : null;
  };

  const calculateChannelEfficiency = (channel) => ({
    roas: safeRatio(channel.value, channel.spend),
    cpa: safeRatio(channel.spend, channel.purchases),
    aov: safeRatio(channel.value, channel.purchases),
  });

  const sumAvailable = (...values) => {
    const available = values.map(finiteNumber).filter((value) => value !== null);
    return available.length ? available.reduce((sum, value) => sum + value, 0) : null;
  };

  const calculateAttributionDiagnostics = (meta, google, shopifyTotalSales) => {
    const totalSpend = sumAvailable(meta.spend, google.spend);
    const totalValue = sumAvailable(meta.value, google.value);
    const totalPurchases = sumAvailable(meta.purchases, google.purchases);
    const efficiency = calculateChannelEfficiency({
      spend: totalSpend,
      value: totalValue,
      purchases: totalPurchases,
    });
    const sales = finiteNumber(shopifyTotalSales);
    return {
      totalSpend,
      totalValue,
      totalPurchases,
      blendedMer: safeRatio(sales, totalSpend),
      adInvestmentRate: safeRatio(totalSpend, sales),
      attributionOverflowRate: sales !== null && totalValue !== null
        ? safeRatio(totalValue - sales, sales)
        : null,
      ...efficiency,
    };
  };

  return {
    calculateAov,
    calculateAovFromRows,
    calculateChannelEfficiency,
    calculateAttributionDiagnostics,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = DashboardMetrics;
}
