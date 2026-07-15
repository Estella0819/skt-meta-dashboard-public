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

  const aggregateGoogleMetrics = (rows = []) => {
    const sum = (key) => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
    const spend = sum("spend");
    const impressions = sum("impressions");
    const clicks = sum("clicks");
    const conversions = sum("conversions");
    const platform_gmv = sum("platform_gmv");
    return {
      spend, impressions, clicks, conversions, platform_gmv,
      roas: spend > 0 ? platform_gmv / spend : null,
      cpa: conversions > 0 ? spend / conversions : null,
      ctr: impressions > 0 ? clicks / impressions : null,
      cvr: clicks > 0 ? conversions / clicks : null,
    };
  };

  const compareGoogleMetrics = (current, previous) => {
    const delta = (now, before) => Number.isFinite(now) && Number.isFinite(before) && before !== 0
      ? (now - before) / Math.abs(before)
      : null;
    return Object.fromEntries(
      ["spend", "platform_gmv", "conversions", "roas", "cpa", "ctr", "cvr"]
        .map((key) => [key, delta(current[key], previous[key])]),
    );
  };

  return {
    calculateAov,
    calculateAovFromRows,
    calculateChannelEfficiency,
    calculateAttributionDiagnostics,
    aggregateGoogleMetrics,
    compareGoogleMetrics,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = DashboardMetrics;
}
