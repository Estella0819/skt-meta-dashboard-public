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

  const summarizeRows = (rows) => {
    const totals = rows.reduce((sum, row) => ({
      spend: sum.spend + Number(row.spend || 0),
      purchase_value: sum.purchase_value + Number(row.purchase_value || 0),
      purchase_times: sum.purchase_times + Number(row.purchase_times || 0),
      impressions: sum.impressions + Number(row.impressions || 0),
      clicks: sum.clicks + Number(row.clicks || 0),
    }), { spend: 0, purchase_value: 0, purchase_times: 0, impressions: 0, clicks: 0 });
    return {
      ...totals,
      roas: totals.spend ? totals.purchase_value / totals.spend : 0,
      cpa: totals.purchase_times ? totals.spend / totals.purchase_times : 0,
      ctr: totals.impressions ? totals.clicks / totals.impressions : 0,
      cvr: totals.clicks ? totals.purchase_times / totals.clicks : 0,
      aov: totals.purchase_times ? totals.purchase_value / totals.purchase_times : 0,
    };
  };

  const groupRows = (rows = [], dimensions = []) => {
    const groups = new Map();
    for (const row of rows) {
      const key = dimensions.map((dimension) => row[dimension] ?? "Unknown").join("||") || "all";
      if (!groups.has(key)) {
        groups.set(key, {
          ...Object.fromEntries(dimensions.map((dimension) => [dimension, row[dimension] ?? "Unknown"])),
          spend: 0,
          impressions: 0,
          reach: 0,
          clicks: 0,
          purchase_times: 0,
          purchase_value: 0,
        });
      }
      const group = groups.get(key);
      group.spend += Number(row.spend || 0);
      group.impressions += Number(row.impressions || 0);
      group.reach += Number(row.reach || 0);
      group.clicks += Number(row.clicks || 0);
      group.purchase_times += Number(row.purchase_times || 0);
      group.purchase_value += Number(row.purchase_value || 0);
    }
    return [...groups.values()].map((group) => ({
      ...group,
      ...summarizeRows([group]),
      cpm: group.impressions ? (group.spend / group.impressions) * 1000 : 0,
    }));
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
    summarizeRows,
    groupRows,
    calculateChannelEfficiency,
    calculateAttributionDiagnostics,
    aggregateGoogleMetrics,
    compareGoogleMetrics,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = DashboardMetrics;
}
