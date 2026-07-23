function unpackRows(rows, schema) {
  if (!Array.isArray(rows) || !Array.isArray(schema) || !Array.isArray(rows[0])) return rows || [];
  return rows.map((values) => {
    const row = {};
    schema.forEach((key, index) => {
      row[key] = values[index];
    });
    return row;
  });
}

function normalizeDashboardData(source) {
  const next = source || {};
  const schemas = next._schemas || {};
  Object.keys(schemas).forEach((key) => {
    next[key] = unpackRows(next[key], schemas[key]);
  });
  return next;
}

const data = normalizeDashboardData(window.META_DASHBOARD_DATA);

const state = {
  view: "overview",
  productSegment: "overall",
  creativeSegment: "type",
  startDate: "",
  endDate: "",
  country: [],
  countryRegion: "ALL",
  creativeExpandedType: "",
  creativeExpandedSources: [],
  expandedRegions: [],
  account: [],
  product: [],
  channelProduct: [],
  productForm: [],
  channel: [],
  channelMarket: "US",
  channelCountries: [],
  operator: [],
  landingType: [],
  materialType: [],
  videoSource: [],
  videoSubtype: [],
  materialName: [],
  adName: [],
  compareMode: "lastMonth",
  compareStartDate: "",
  compareEndDate: "",
  trendMetric: "spend",
  attributionMetric: "platform_value",
  googleAdTypes: [],
  googleProducts: [],
  googleCountries: [],
  googleSort: {
    adType: { key: "spend", direction: "desc" },
    product: { key: "platform_gmv", direction: "desc" },
    market: { key: "spend", direction: "desc" },
  },
};

const filterOptions = {};

const NON_US_COMPARABLE_COUNTRIES = ["AU", "CA", "JP", "GB"];

const pendingTime = {
  startDate: "",
  endDate: "",
  compareMode: "lastMonth",
  compareStartDate: "",
  compareEndDate: "",
};

const metricLabels = {
  value: "指标",
  spend: "花费",
  purchase_value: "销售额",
  purchase_times: "转化数",
  roas: "ROAS",
  cpa: "CPA",
  ctr: "CTR",
  cvr: "CVR",
  cpm: "CPM",
};

const shopifyProductRules = [
  [/glow makeup set with cushion, face mist & lip serum/i, "水光气垫,唇部精华,水油喷雾"],
  [/12-hour long-lasting cushion, serum spray & lip serum set/i, "水光气垫,唇部精华,水油喷雾"],
  [/velvet matte & cover perfect stay base set/i, "底妆合集"],
  [/niacinamide brightening set/i, "美白多件套"],
  [/pore perfect clay stick mask set/i, "泥膜棒合集"],
  [/symwhite\s*377.*moisture gel|377 dark spot moisture gel/i, "377面霜"],
  [/377 dark spot serum/i, "377精华"],
  [/symwhite\s*377.*toner/i, "377套组"],
  [/msh niacinamide brightening moisture gel/i, "美白面霜"],
  [/10% niacinamide brightening serum/i, "精华合集"],
  [/pdrn brightening one time ampoule/i, "PDRN次抛精华"],
  [/pdrn brightening smooth serum/i, "PDRN精华"],
  [/aha bha pha exfoliating pads/i, "磨皮棉片"],
  [/aha bha pha exfoliating toner/i, "磨皮棉片"],
  [/12% aha bha pha lha peeling solution/i, "磨皮棉片"],
  [/retinol.*moisturizer|anti-aging night cream/i, "早C晚A 视黄醇VC面霜两件套"],
  [/retinol serum/i, "combo:视黄醇面霜+视黄醇精华"],
  [/eye cream|crystal massager/i, "护肤类"],
  [/essence toner/i, "护肤类"],
  [/cleanser|face wash|cleansing|makeup remover|cleansing balm|cleansing oil|cleansing mousse/i, "美白洗面奶"],
  [/acne gel cleanser|salicylic acid|acne treatment|water gel/i, "护肤类"],
  [/glow bright day cream/i, "美白面霜"],
  [/cover perfect serum concealer|serum foundation/i, "底妆合集"],
  [/hyaluronic acid|lactic acid/i, "精华合集"],
  [/lip serum|lip/i, "唇部精华"],
  [/cover glow perfect cushion|glow perfect cushion/i, "水光气垫"],
  [/cover all perfect cushion|perfect stay velvet matte cushion|cushion/i, "气垫合集"],
  [/powder foundation/i, "粉饼"],
  [/skin tint/i, "素颜霜"],
  [/radiance booster serum spray|radiance bright serum spray|serum spray|face mist/i, "水油喷雾"],
  [/5x ceramide|ceramide barrier|ceramide/i, "5X面霜"],
  [/pdrn.*cream|pdrn.*moisture/i, "PDRN面霜"],
  [/pdrn.*spray/i, "PDRN水油喷雾"],
  [/niacinamide.*mask/i, "美白面膜"],
  [/niacinamide.*sunscreen/i, "美白防晒"],
  [/niacinamide.*set|brightening set/i, "美白多件套"],
  [/sunscreen/i, "防晒合集"],
  [/volcano.*clay|alaska volcano/i, "火山泥膜棒"],
  [/mugwort.*clay/i, "艾草泥膜棒"],
  [/clay stick|pore perfect|pores.*mask/i, "泥膜棒合集"],
  [/vitamin c/i, "VC双舱精华"],
  [/makeup set|base set|set 2pcs|set 3pcs|set/i, "多件套"],
];

const shopifyProductMap = new Map((data.shopify_product_mapping || []).map((row) => [
  row.product_title,
  row.product_name,
]));
const productClassificationMap = new Map((data.product_classification || []).map((row) => [
  row.current_product_name.toLocaleLowerCase(),
  row,
]));

function productClass(productName) {
  const current = String(productName || "Unknown").trim() || "Unknown";
  const matched = productClassificationMap.get(current.toLocaleLowerCase()) || {};
  const standard = matched.standard_product_name || current;
  return {
    standard_product_name: standard,
    product_form: matched.product_form || "待确认",
  };
}

function enrichProductFields(row) {
  const info = productClass(row?.product_name);
  return {
    ...row,
    standard_product_name: info.standard_product_name,
    product_form: info.product_form,
  };
}

function money(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function channelMoney(value, rowOrChannel = "") {
  return money(value);
}

function hasChannelData(byChannel, channel) {
  return byChannel.has(channel);
}

function channelMarketLabel() {
  return state.channelMarket === "US" ? "美国" : "非美国可比市场";
}

function channelMarketCountries() {
  if (state.channelMarket === "US") return ["US"];
  return state.channelCountries.length ? state.channelCountries : NON_US_COMPARABLE_COUNTRIES;
}

function channelTrendTitle() {
  return `${channelMarketLabel()}多渠道每日销售趋势`;
}

function number(value, digits = 0) {
  if (value === null || value === undefined || value === "") return "-";
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: digits });
}

function ratio(value) {
  if (value === null || value === undefined || value === "") return "-";
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function pct(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `${(Number(value || 0) * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

function materialCodeText(row) {
  const code = String(row?.material_code || "").trim();
  if (!code || code === "Unknown" || code === "-") return inferredMaterialCode(row);
  return code;
}

function materialName(row) {
  const type = row?.material_type || "未分类";
  return `${type} / ${materialCodeText(row)}`;
}

function materialIdentity(row) {
  return String(row?.material_name || row?.material_key || row?.material_code || row?.ad_id || row?.ad_name || "").trim();
}

function landingPageType(row) {
  const text = `${row?.campaign_name || ""} ${row?.adset_name || ""}`.toLowerCase();
  if (/活动专题页|专题页|campaign page|promo page/.test(text)) return "活动专题页";
  if (/详情页|商品详情|detail|details|pdp|product page|item page/.test(text)) return "详情页";
  return "集合页";
}

function inferredMaterialCode(row) {
  const adName = String(row?.ad_name || "").trim();
  const product = String(row?.product_name || "").trim();
  const videoSource = String(row?.video_source || "").trim();
  const normalized = adName.replace(/\s+-\s+Copy(?:\s+\d+)?$/i, "").trim();
  const posterMatch = normalized.match(/(?:帖子|post)[_-]+(.+)$/i);
  if (posterMatch?.[1]) return `合创-${posterMatch[1].trim()}`;
  if (/官号贴|官方贴/.test(normalized)) return `官号贴-${product || "未归类"}`;
  if (/tt搬运|tiktok搬运|tt[ _-]*home|tt[ _-]*ads/i.test(normalized) || videoSource === "TT搬运") return `TT搬运-${product || "未归类"}`;
  if (videoSource) return `${videoSource}-${product || "未归类"}`;
  return `${row?.material_type || "素材"}-${product || "未归类"}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function escapeJsString(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, " ");
}

function filterControlId(key) {
  if (state.view === "channels" && (key === "product_name" || key === "standard_product_name")) {
    return "channelProduct";
  }
  return {
    country: "country",
    product_name: state.view === "channels" ? "channelProduct" : "product",
    standard_product_name: state.view === "channels" ? "channelProduct" : "product",
    product_form: "productForm",
    operator: "operator",
    account_name: "account",
    channel: "channel",
    landing_type: "landingType",
    material_type: "materialType",
    video_source: "videoSource",
    video_subtype: "videoSubtype",
    material_name: "materialName",
    ad_name: "adName",
  }[key];
}

function appendValues(params, key, values) {
  for (const item of values) params.append(key, item);
}

function filterHref(key, value) {
  const params = new URLSearchParams();
  params.set("start", state.startDate);
  params.set("end", state.endDate);
  params.set("compareMode", state.compareMode);
  if (state.compareStartDate) params.set("compareStart", state.compareStartDate);
  if (state.compareEndDate) params.set("compareEnd", state.compareEndDate);
  appendValues(params, "country", key === "region" ? countriesForRegion(value) : (key === "country" ? [value] : state.country));
  appendValues(params, "account", key === "account_name" ? [value] : state.account);
  const productClick = key === "product_name" || key === "standard_product_name";
  appendValues(params, "product", productClick && state.view !== "channels" ? [value] : state.product);
  appendValues(params, "channelProduct", productClick && state.view === "channels" ? [value] : state.channelProduct);
  appendValues(params, "productForm", key === "product_form" ? [value] : state.productForm);
  appendValues(params, "channel", key === "channel" ? [value] : state.channel);
  appendValues(params, "operator", key === "operator" ? [value] : state.operator);
  appendValues(params, "landingType", key === "landing_type" ? [value] : state.landingType);
  appendValues(params, "materialType", key === "material_type" ? [value] : state.materialType);
  appendValues(params, "videoSource", key === "video_source" ? [value] : state.videoSource);
  appendValues(params, "videoSubtype", key === "video_subtype" ? [value] : state.videoSubtype);
  appendValues(params, "materialName", key === "material_name" ? [value] : state.materialName);
  appendValues(params, "adName", key === "ad_name" ? [value] : state.adName);
  return `?${params.toString()}`;
}

function getMetric(row, key) {
  return Number(row?.[key] || 0);
}

function countryRegion(country) {
  return DashboardCountry.regionForCountry(country);
}

function countriesForRegion(region, rows = data.fact || []) {
  return [...new Set(rows
    .map((row) => row.country || "Unknown")
    .filter((country) => countryRegion(country) === region))]
    .sort((a, b) => a.localeCompare(b));
}

function inferShopifyProductName(title) {
  const value = String(title || "");
  const mapped = shopifyProductMap.get(value);
  if (mapped) return mapped;
  for (const [pattern, name] of shopifyProductRules) {
    if (pattern.test(value)) return name;
  }
  return "未匹配";
}

function enrichShopifyRow(row) {
  return enrichProductFields({
    ...row,
    product_name: inferShopifyProductName(row.product_title),
  });
}

data.fact = (data.fact || []).map(enrichProductFields);
data.ads = (data.ads || []).map(enrichProductFields);
data.material_inventory = (data.material_inventory || []).map(enrichProductFields);
data.shopify_fact = data.shopify_fact || [];
data.us_channel_product_daily = data.us_channel_product_daily || [];
data.channel_market_product_daily = data.channel_market_product_daily || [];

function dateToTime(value) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function addDays(value, days) {
  const next = new Date(dateToTime(value));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function addMonths(value, months) {
  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

function daysBetween(start, end) {
  return Math.round((dateToTime(end) - dateToTime(start)) / 86400000) + 1;
}

function comparisonWindow() {
  if (!state.startDate || !state.endDate) return { start: "", end: "", label: "无对比周期" };
  if (state.compareMode === "custom" && state.compareStartDate && state.compareEndDate) {
    return {
      start: state.compareStartDate,
      end: state.compareEndDate,
      label: `${state.compareStartDate} 至 ${state.compareEndDate}`,
    };
  }
  if (state.compareMode === "lastMonth") {
    const start = addMonths(state.startDate, -1);
    const end = addMonths(state.endDate, -1);
    return { start, end, label: `上月同期 ${start} 至 ${end}` };
  }
  const length = daysBetween(state.startDate, state.endDate);
  const prevEnd = addDays(state.startDate, -1);
  const prevStart = addDays(prevEnd, -(length - 1));
  return { start: prevStart, end: prevEnd, label: `上一周期 ${prevStart} 至 ${prevEnd}` };
}

function aggregate(rows, dims = []) {
  return DashboardMetrics.groupRows(rows, dims);
}

function aggregateRegions(rows) {
  const withRegion = rows.map((row) => ({ ...row, region: countryRegion(row.country) }));
  const countrySets = new Map();
  for (const row of withRegion) {
    const region = row.region || "未识别地区";
    if (!countrySets.has(region)) countrySets.set(region, new Set());
    countrySets.get(region).add(row.country || "Unknown");
  }
  return aggregate(withRegion, ["region"]).map((row) => ({
    ...row,
    country_count: countrySets.get(row.region)?.size || 0,
  }));
}

function regionPerformanceRows(rows, previousRows) {
  const current = aggregateRegions(rows);
  const previous = aggregateRegions(previousRows);
  const previousMap = new Map(previous.map((row) => [row.region, row]));
  return addShareDeltas(addComparison(current, previous, ["region"]), previous, ["region"])
    .map((row) => {
      const previousRow = previousMap.get(row.region) || {};
      return {
        ...row,
        country_count_delta: deltaText(row.country_count, previousRow.country_count || 0),
      };
    })
    .sort((a, b) => b.purchase_value - a.purchase_value);
}

function deriveMetrics(row) {
  Object.assign(row, DashboardMetrics.summarizeRows([row]));
  row.cpm = row.impressions ? (row.spend / row.impressions) * 1000 : 0;
  return row;
}

function passesCommonFilters(row, options = {}) {
  if (!options.ignoreCountry && state.country.length && !state.country.includes(row.country)) return false;
  if (state.account.length && !state.account.includes(row.account_name)) return false;
  if (state.product.length && !state.product.includes(row.product_name) && !state.product.includes(row.standard_product_name)) return false;
  if (state.productForm.length && !state.productForm.includes(row.product_form)) return false;
  if (state.operator.length && !state.operator.includes(row.operator)) return false;
  if (state.landingType.length && !state.landingType.includes(row.landing_type || landingPageType(row))) return false;
  if (state.materialType.length && !state.materialType.includes(row.material_type)) return false;
  if (state.videoSource.length && !state.videoSource.includes(row.video_source)) return false;
  if (state.videoSubtype.length && !state.videoSubtype.includes(row.video_subtype)) return false;
  if (state.materialName.length && (row.material_code || row.material_name || row.ad_name) && !state.materialName.includes(row.material_name || materialName(row))) return false;
  if (state.adName.length && row.ad_name && !state.adName.includes(row.ad_name)) return false;
  return true;
}

function googleAccountLabel(accountId) {
  return `Google Ads · ${accountId}`;
}

function accountOptionsForView() {
  const metaAccounts = [...new Set(data.fact.map((row) => row.account_name || "Unknown"))].sort((a, b) => a.localeCompare(b));
  if (state.view !== "attribution") return metaAccounts;
  const googleAccounts = [...new Set([
    ...(data.google_ad_type_daily || []),
    ...(data.google_product_daily || []),
    ...(data.google_market_daily || []),
  ].map((row) => googleAccountLabel(row.account_id)))].sort((a, b) => a.localeCompare(b));
  return [...new Set([...metaAccounts, ...googleAccounts])];
}

function rowsForWindow(source, start, end, options = {}) {
  return source.filter((row) => {
    if (start && row.date_start < start) return false;
    if (end && row.date_start > end) return false;
    return passesCommonFilters(row, options);
  });
}

function filteredRows(source) {
  return rowsForWindow(source, state.startDate, state.endDate);
}

function comparisonRows(source) {
  const period = comparisonWindow();
  if (!period.start || !period.end) return [];
  return rowsForWindow(source, period.start, period.end);
}

function isMetaAdRow(row) {
  return row.operator !== "Google" && row.material_type !== "Google";
}

function viewUsesMetaOnlyAds() {
  return ["product", "country", "creative"].includes(state.view);
}

function pageFactRows(source = data.fact) {
  const rows = filteredRows(source);
  return viewUsesMetaOnlyAds() ? rows.filter(isMetaAdRow) : rows;
}

function pageComparisonRows(source = data.fact) {
  const rows = comparisonRows(source);
  return viewUsesMetaOnlyAds() ? rows.filter(isMetaAdRow) : rows;
}

function countryPageModel() {
  const ignoreCountry = state.countryRegion !== "ALL";
  const current = rowsForWindow(data.fact, state.startDate, state.endDate, { ignoreCountry }).filter(isMetaAdRow);
  const period = comparisonWindow();
  const previous = period.start && period.end
    ? rowsForWindow(data.fact, period.start, period.end, { ignoreCountry }).filter(isMetaAdRow)
    : [];
  return {
    ...DashboardCountry.selectModel(current, previous, {}, state.countryRegion),
    hierarchyCurrentRows: current,
    hierarchyPreviousRows: previous,
  };
}

function creativePageModel(currentRows, previousRows) {
  return DashboardCreative.selectModel(currentRows, previousRows, {}, state.creativeSegment);
}

function productPageModel(factRows, previousFactRows, adRows, previousAdRows) {
  return DashboardProduct.selectModel(factRows, previousFactRows, adRows, previousAdRows, {}, state.productSegment);
}

function materialInventoryRowsForWindow(source = data.material_inventory, start = state.startDate, end = state.endDate) {
  return (source || []).map((row) => ({
    ...row,
    video_source: row.video_source || "",
    video_subtype: row.video_subtype || "",
    material_name: row.material_name || materialName(row),
  })).filter((row) => {
    if (start && row.date_start < start) return false;
    if (end && row.date_start > end) return false;
    if (state.product.length && !state.product.includes(row.product_name) && !state.product.includes(row.standard_product_name)) return false;
    if (state.productForm.length && !state.productForm.includes(row.product_form)) return false;
    if (state.materialType.length && !state.materialType.includes(row.material_type)) return false;
    if (state.videoSource.length && !state.videoSource.includes(row.video_source)) return false;
    if (state.videoSubtype.length && !state.videoSubtype.includes(row.video_subtype)) return false;
    if (state.materialName.length && !state.materialName.includes(row.material_name)) return false;
    return true;
  });
}

function filteredMaterialInventoryRows() {
  return materialInventoryRowsForWindow(data.material_inventory, state.startDate, state.endDate);
}

function comparisonMaterialInventoryRows() {
  const period = comparisonWindow();
  if (!period.start || !period.end) return [];
  return materialInventoryRowsForWindow(data.material_inventory, period.start, period.end);
}

function materialCountBy(rows, dims) {
  const map = new Map();
  for (const row of rows) {
    const materialKey = materialIdentity(row);
    if (!materialKey) continue;
    const key = compareKey(row, dims);
    if (!map.has(key)) {
      const seed = Object.fromEntries(dims.map((dim) => [dim, row[dim] ?? "Unknown"]));
      seed._materials = new Set();
      map.set(key, seed);
    }
    map.get(key)._materials.add(materialKey);
  }
  return [...map.values()].map((row) => {
    const materialCount = row._materials.size;
    delete row._materials;
    return { ...row, material_count: materialCount };
  });
}

function shopifyRowsForWindow(source, start, end) {
  return (source || []).map(enrichShopifyRow).filter((row) => {
    if (start && row.date_start < start) return false;
    if (end && row.date_start > end) return false;
    if (state.country.length && !state.country.includes(row.country)) return false;
    if (state.product.length && !state.product.includes(row.product_name) && !state.product.includes(row.standard_product_name)) return false;
    if (state.productForm.length && !state.productForm.includes(row.product_form)) return false;
    return true;
  });
}

function filteredShopifyRows() {
  return shopifyRowsForWindow(data.shopify_fact, state.startDate, state.endDate);
}

function comparisonShopifyRows() {
  const period = comparisonWindow();
  if (!period.start || !period.end) return [];
  return shopifyRowsForWindow(data.shopify_fact, period.start, period.end);
}

function filteredShopifyDailyRows(source = data.shopify_daily, start = state.startDate, end = state.endDate) {
  return (source || []).filter((row) => {
    if (start && row.date_start < start) return false;
    if (end && row.date_start > end) return false;
    if (state.country.length && row.country && !state.country.includes(row.country)) return false;
    return true;
  });
}

function shopifyAggregate(rows, dims = []) {
  const map = new Map();
  for (const row of rows) {
    const key = dims.map((dim) => row[dim] ?? "Unknown").join("||") || "all";
    if (!map.has(key)) {
      const seed = Object.fromEntries(dims.map((dim) => [dim, row[dim] ?? "Unknown"]));
      Object.assign(seed, {
        orders: 0,
        net_items_sold: 0,
        gross_sales: 0,
        discounts: 0,
        returns: 0,
        net_sales: 0,
        taxes: 0,
        total_sales: 0,
      });
      map.set(key, seed);
    }
    const item = map.get(key);
    item.orders += getMetric(row, "orders");
    item.net_items_sold += getMetric(row, "net_items_sold");
    item.gross_sales += getMetric(row, "gross_sales");
    item.discounts += getMetric(row, "discounts");
    item.returns += getMetric(row, "returns");
    item.net_sales += getMetric(row, "net_sales");
    item.taxes += getMetric(row, "taxes");
    item.total_sales += getMetric(row, "total_sales");
  }
  return [...map.values()].map((row) => {
    row.aov = row.orders ? row.net_sales / row.orders : 0;
    return row;
  });
}

function normalizeChannelProduct(row) {
  const rawName = String(row?.product_name || "Unknown").trim() || "Unknown";
  return rawName;
}

function channelRowsForWindow(source, start, end) {
  return (source || []).map((row) => enrichProductFields({
      ...row,
      sku_code: String(row?.sku_code || "Unknown").trim().toUpperCase() || "Unknown",
      product_name: normalizeChannelProduct(row),
      channel_sales: getMetric(row, "sales"),
      channel_units: getMetric(row, "units"),
    })).filter((row) => {
    if (getMetric(row, "channel_sales") === 0) return false;
    if (start && row.date_start < start) return false;
    if (end && row.date_start > end) return false;
    if (row.market !== state.channelMarket) return false;
    if (state.channelMarket === "NON_US" && state.channelCountries.length && !state.channelCountries.includes(row.country_code)) return false;
    if (state.channelMarket === "NON_US" && !state.channelCountries.length && !NON_US_COMPARABLE_COUNTRIES.includes(row.country_code)) return false;
    if (state.channel.length && !state.channel.includes(row.channel)) return false;
    if (state.channelProduct.length && !state.channelProduct.includes(row.product_name)) return false;
    return true;
  });
}

function filteredChannelRows(source = data.channel_market_product_daily, start = state.startDate, end = state.endDate) {
  return channelRowsForWindow(source, start, end);
}

function comparisonChannelRows(source = data.channel_market_product_daily) {
  const period = comparisonWindow();
  if (!period.start || !period.end) return [];
  return channelRowsForWindow(source, period.start, period.end);
}

function advertisingProductOptions() {
  return DashboardProductFilters.advertisingOptions(data.fact);
}

function channelProductOptions() {
  return DashboardProductFilters.channelOptions(data.channel_market_product_daily || []);
}

function channelAggregate(rows, dims = []) {
  const map = new Map();
  for (const row of rows) {
    const key = dims.map((dim) => row[dim] ?? "Unknown").join("||") || "all";
    if (!map.has(key)) {
      const seed = Object.fromEntries(dims.map((dim) => [dim, row[dim] ?? "Unknown"]));
      Object.assign(seed, { orders: 0, channel_units: 0, channel_sales: 0 });
      map.set(key, seed);
    }
    const item = map.get(key);
    item.orders += getMetric(row, "orders");
    item.channel_units += getMetric(row, "channel_units");
    item.channel_sales += getMetric(row, "channel_sales");
  }
  const totalSales = [...map.values()].reduce((sum, row) => sum + row.channel_sales, 0);
  return [...map.values()].map((row) => ({
    ...row,
    unit_value: row.channel_units ? row.channel_sales / row.channel_units : 0,
    sales_share: totalSales ? row.channel_sales / totalSales : 0,
  }));
}

function setMultiOptions(key, values, selected) {
  const panel = document.getElementById(`${key}FilterPanel`);
  if (!panel) return;
  filterOptions[key] = [...values];
  const effectiveSelected = selected.length ? selected : values;
  const selectedSet = new Set(effectiveSelected);
  const search = values.length > 5 ? `
    <div class="multi-search">
      <input type="search" placeholder="搜索选项" data-filter-search="${key}" aria-label="搜索${key}筛选项" />
    </div>
  ` : "";
  panel.innerHTML = `
    <div class="multi-actions">
      <span>${values.length} 项</span>
    </div>
    ${search}
    <div class="multi-options">
      <label class="check-option select-all-option" for="${key}_all">
        <input id="${key}_all" type="checkbox" data-filter-select-all="${key}" />
        <span>全选</span>
      </label>
      ${values.map((value, index) => {
        const id = `${key}_${index}`;
        return `
          <label class="check-option" for="${id}" data-filter-option-row>
            <input id="${id}" type="checkbox" value="${escapeHtml(value)}" ${selectedSet.has(value) ? "checked" : ""} data-filter="${key}" data-filter-option />
            <span>${escapeHtml(value)}</span>
          </label>
        `;
      }).join("")}
    </div>
  `;
  updateSelectAllControl(key);
  updateMultiButton(key);
}

function getSelectedValues(key) {
  return [...document.querySelectorAll(`#${key}FilterPanel input[data-filter-option]:checked`)].map((input) => input.value);
}

function getVisibleFilterValues(key) {
  return [...document.querySelectorAll(`#${key}FilterPanel [data-filter-option-row]:not(.hidden) input[data-filter-option]`)]
    .map((input) => input.value);
}

function updateSelectAllControl(key) {
  const input = document.querySelector(`#${key}FilterPanel [data-filter-select-all="${key}"]`);
  if (!input) return;
  const visible = getVisibleFilterValues(key);
  const status = DashboardFilters.selectAllState(getSelectedValues(key), visible);
  input.checked = status === "checked";
  input.indeterminate = status === "indeterminate";
  input.disabled = visible.length === 0;
  input.dataset.state = status;
}

function updateMultiButton(key) {
  const button = document.getElementById(`${key}FilterButton`);
  const values = state[key] || [];
  if (!button) return;
  const label = button.closest(".multi-select")?.querySelector(".filter-label")?.textContent.trim() || key;
  button.textContent = DashboardFilters.selectionSummary(label, values, filterOptions[key] || []);
  button.title = values.length > 1 ? values.join("、") : "";
  button.classList.toggle("has-selection", values.length > 0);
}

function syncMultiSelection(key) {
  const panel = document.getElementById(`${key}FilterPanel`);
  DashboardFilters.syncSelection(panel, state[key] || []);
  updateMultiButton(key);
}

function syncPendingTimeFromState() {
  pendingTime.startDate = state.startDate;
  pendingTime.endDate = state.endDate;
  pendingTime.compareMode = state.compareMode;
  pendingTime.compareStartDate = state.compareStartDate;
  pendingTime.compareEndDate = state.compareEndDate;
}

function tableFilterKey(col) {
  if (col.filterKey === false) return "";
  if (col.filterKey) return col.filterKey;
  return {
    country: "country",
    product_name: "product_name",
    standard_product_name: "standard_product_name",
    product_form: "product_form",
    account_name: "account_name",
    operator: "operator",
    channel: "channel",
    region: "region",
    landing_type: "landing_type",
    material_type: "material_type",
    video_source: "video_source",
    material_name: "material_name",
    ad_name: "ad_name",
  }[col.key] || "";
}

function pendingComparisonWindow() {
  if (!pendingTime.startDate || !pendingTime.endDate) return { start: "", end: "", label: "无对比周期" };
  if (pendingTime.compareMode === "custom" && pendingTime.compareStartDate && pendingTime.compareEndDate) {
    return {
      start: pendingTime.compareStartDate,
      end: pendingTime.compareEndDate,
      label: `${pendingTime.compareStartDate} 至 ${pendingTime.compareEndDate}`,
    };
  }
  if (pendingTime.compareMode === "lastMonth") {
    const start = addMonths(pendingTime.startDate, -1);
    const end = addMonths(pendingTime.endDate, -1);
    return { start, end, label: `上月同期 ${start} 至 ${end}` };
  }
  const length = daysBetween(pendingTime.startDate, pendingTime.endDate);
  const prevEnd = addDays(pendingTime.startDate, -1);
  const prevStart = addDays(prevEnd, -(length - 1));
  return { start: prevStart, end: prevEnd, label: `上一周期 ${prevStart} 至 ${prevEnd}` };
}

function hasPendingTimeChanges() {
  return pendingTime.startDate !== state.startDate
    || pendingTime.endDate !== state.endDate
    || pendingTime.compareMode !== state.compareMode
    || pendingTime.compareStartDate !== state.compareStartDate
    || pendingTime.compareEndDate !== state.compareEndDate;
}

function updateApplyTimeButton() {
  const button = document.getElementById("applyTimeFilter");
  if (!button) return;
  const hasPending = hasPendingTimeChanges();
  button.classList.toggle("has-pending", hasPending);
  button.textContent = hasPending ? "应用并刷新" : "应用时间";
  renderPeriodHint();
}

function updateDatePresetButtons() {
  document.querySelectorAll("[data-range-preset]").forEach((button) => {
    const range = DashboardUI.datePresetRange(button.dataset.rangePreset, data.summary.max_date);
    const active = range.startDate === pendingTime.startDate && range.endDate === pendingTime.endDate;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function applyPendingDatePreset(preset) {
  const range = DashboardUI.datePresetRange(preset, data.summary.max_date);
  pendingTime.startDate = range.startDate < data.summary.min_date ? data.summary.min_date : range.startDate;
  pendingTime.endDate = range.endDate;
  document.getElementById("startDateFilter").value = pendingTime.startDate;
  document.getElementById("endDateFilter").value = pendingTime.endDate;
  updateDatePresetButtons();
  updateApplyTimeButton();
}

function initFilters() {
  const countries = [...new Set(data.fact.map((row) => row.country || "Unknown"))].sort();
  const accounts = accountOptionsForView();
  const products = advertisingProductOptions();
  const channelProducts = channelProductOptions();
  state.product = state.product.filter((value) => products.includes(value));
  state.channelProduct = state.channelProduct.filter((value) => channelProducts.includes(value));
  const productForms = [...new Set(data.fact.map((row) => row.product_form || "待确认"))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  const operators = [...new Set(data.fact.map((row) => row.operator || "Unknown"))].sort();
  const channels = [...new Set([
    ...(data.channel_market_product_daily || []).map((row) => row.channel || "Unknown"),
    ...(data.attribution_channel || []).map((row) => row.channel || "Unknown"),
  ])].sort();
  const landingTypes = ["集合页", "活动专题页", "详情页"].filter((value) => data.fact.some((row) => landingPageType(row) === value));
  const materialTypes = ["图文", "视频", "合创"].filter((value) => data.fact.some((row) => row.material_type === value));
  const videoSources = ["自产素材", "TT搬运"].filter((value) => data.fact.some((row) => row.video_source === value));
  const videoSubtypes = [...new Set(data.fact.map((row) => row.video_subtype).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  setMultiOptions("country", countries, state.country);
  setMultiOptions("account", accounts, state.account);
  setMultiOptions("product", products, state.product);
  setMultiOptions("channelProduct", channelProducts, state.channelProduct);
  setMultiOptions("productForm", productForms, state.productForm);
  setMultiOptions("channel", channels, state.channel);
  setMultiOptions("operator", operators, state.operator);
  setMultiOptions("landingType", landingTypes, state.landingType);
  setMultiOptions("materialType", materialTypes, state.materialType);
  setMultiOptions("videoSource", videoSources, state.videoSource);
  setMultiOptions("videoSubtype", videoSubtypes, state.videoSubtype);

  const minDate = data.summary.min_date;
  const maxDate = data.summary.max_date;
  if (!state.startDate) state.startDate = addDays(maxDate, -2) < minDate ? minDate : addDays(maxDate, -2);
  if (!state.endDate) state.endDate = maxDate;

  const start = document.getElementById("startDateFilter");
  const end = document.getElementById("endDateFilter");
  const compareStart = document.getElementById("compareStartDateFilter");
  const compareEnd = document.getElementById("compareEndDateFilter");
  const compareMode = document.getElementById("compareModeFilter");
  if (!pendingTime.startDate) syncPendingTimeFromState();
  const compareWindowDates = pendingComparisonWindow();
  start.min = minDate;
  start.max = maxDate;
  start.value = pendingTime.startDate;
  end.min = minDate;
  end.max = maxDate;
  end.value = pendingTime.endDate;
  compareMode.value = pendingTime.compareMode;
  compareStart.min = minDate;
  compareStart.max = maxDate;
  compareStart.value = pendingTime.compareStartDate || compareWindowDates.start;
  compareEnd.min = minDate;
  compareEnd.max = maxDate;
  compareEnd.value = pendingTime.compareEndDate || compareWindowDates.end;
  document.querySelectorAll(".compare-custom").forEach((el) => {
    el.classList.toggle("hidden", pendingTime.compareMode !== "custom");
  });
  updateApplyTimeButton();
  updateDatePresetButtons();
}

function formatMetric(metric, value) {
  if (metric === "spend" || metric === "purchase_value" || metric === "cpa" || metric === "cpm") return money(value);
  if (metric === "ctr" || metric === "cvr") return pct(value);
  return number(value, metric === "roas" ? 2 : 0);
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

function deltaValue(now, before) {
  return before ? (now - before) / before : 0;
}

function baseSummary() {
  return deriveMetrics({ spend: 0, impressions: 0, clicks: 0, purchase_times: 0, purchase_value: 0 });
}

function summaryOf(rows) {
  const summary = DashboardMetrics.summarizeRows(rows);
  summary.reach = rows.reduce((sum, row) => sum + getMetric(row, "reach"), 0);
  summary.cpm = summary.impressions ? (summary.spend / summary.impressions) * 1000 : 0;
  return summary;
}

function insightTone(value, inverse = false) {
  if (Math.abs(value) < 0.03) return "neutral";
  const good = inverse ? value < 0 : value > 0;
  return good ? "positive" : "negative";
}

function renderActionInsights(fact, previousFact, context = {}) {
  const current = summaryOf(fact);
  const previous = summaryOf(previousFact);
  const spendDelta = deltaValue(current.spend, previous.spend);
  const salesDelta = deltaValue(current.purchase_value, previous.purchase_value);
  const roasDelta = deltaValue(current.roas, previous.roas);
  const countryRows = aggregate(fact, ["country"]).filter((row) => row.spend > 100).sort((a, b) => b.purchase_value - a.purchase_value);
  const productCountryRows = aggregate(fact, ["product_name", "country"]).filter((row) => row.spend > 200);
  const materialRows = materialComparisonRows(fact, previousFact);
  const topCountry = countryRows[0];
  const bestCombo = [...productCountryRows].filter((row) => row.purchase_times >= 5).sort((a, b) => b.roas - a.roas)[0];
  const riskCombo = [...productCountryRows].filter((row) => row.roas < 1.4).sort((a, b) => b.spend - a.spend)[0];
  const bestMaterial = [...materialRows].filter((row) => row.spend > 100).sort((a, b) => b.roas - a.roas)[0];
  const weakMaterial = [...materialRows].filter((row) => row.spend > 100).sort((a, b) => a.roas - b.roas)[0];
  const countryComparison = addComparison(aggregate(fact, ["country"]), previousFact, ["country"]).filter((row) => row.spend > 100);
  const growthCountry = [...countryComparison].sort((a, b) => deltaValue(b.purchase_value, summaryOf(previousFact.filter((row) => row.country === b.country)).purchase_value) - deltaValue(a.purchase_value, summaryOf(previousFact.filter((row) => row.country === a.country)).purchase_value))[0];
  const weakCountry = [...countryComparison].filter((row) => row.roas < 1.5).sort((a, b) => b.spend - a.spend)[0];
  const operatorRows = aggregate(fact, ["operator"]).filter((row) => row.spend > 100).sort((a, b) => b.purchase_value - a.purchase_value);
  const topOperator = operatorRows[0];
  const operatorRisk = aggregate(fact, ["operator", "product_name", "country"]).filter((row) => row.spend > 200 && row.roas < 1.4).sort((a, b) => b.spend - a.spend)[0];
  const productNameRows = aggregate(fact, ["standard_product_name"]).filter((row) => row.spend > 100).sort((a, b) => b.purchase_value - a.purchase_value);
  const topProductName = productNameRows[0];
  const productFormRows = aggregate(fact, ["product_form"]).filter((row) => row.spend > 100).sort((a, b) => b.roas - a.roas);
  const bestProductForm = productFormRows.find((row) => row.purchase_times >= 3) || productFormRows[0];
  const productCountryRisk = aggregate(fact, ["standard_product_name", "country"]).filter((row) => row.spend > 200 && row.roas < 1.4).sort((a, b) => b.spend - a.spend)[0];
  const landingRows = context.landingRows || fact.map((row) => ({ ...row, landing_type: landingPageType(row) }));
  const previousLandingRows = context.previousLandingRows || previousFact.map((row) => ({ ...row, landing_type: landingPageType(row) }));
  const landingTypeRows = addComparison(aggregate(landingRows, ["landing_type"]), previousLandingRows, ["landing_type"]).filter((row) => row.spend > 100);
  const topLanding = [...landingTypeRows].sort((a, b) => b.spend - a.spend)[0];
  const bestLanding = [...landingTypeRows].filter((row) => row.purchase_times >= 3).sort((a, b) => b.roas - a.roas)[0];
  const riskLanding = [...landingTypeRows].filter((row) => row.spend > 300 && row.roas < 1.5).sort((a, b) => b.spend - a.spend)[0];
  const shopifyRows = filteredShopifyRows();
  const previousShopifyRows = comparisonShopifyRows();
  const shopify = tableSummary(shopifyRows);
  const previousShopify = tableSummary(previousShopifyRows);
  const onsiteRoas = current.spend ? shopify.net_sales / current.spend : 0;
  const previousOnsiteRoas = previous.spend ? previousShopify.net_sales / previous.spend : 0;
  const onsiteProducts = addOnsiteShareMetrics(joinedOnsiteRows(fact, shopifyRows, ["product_name"]))
    .filter((row) => row.spend > 100 || row.shopify_sales > 100)
    .sort((a, b) => Math.abs(b.share_gap) - Math.abs(a.share_gap));
  const onsiteMismatch = onsiteProducts[0];
  const onsiteStrong = [...onsiteProducts].filter((row) => row.efficiency_index >= 1.2 && row.onsite_roas >= 1.8).sort((a, b) => b.shopify_sales - a.shopify_sales)[0];
  const unmatchedSales = shopifyRows.filter((row) => row.product_name === "未匹配").reduce((sum, row) => sum + getMetric(row, "net_sales"), 0);
  const channelRows = filteredChannelRows();
  const previousChannelRows = comparisonChannelRows();
  const channelSummary = channelAggregate(channelRows)[0] || { channel_sales: 0, channel_units: 0 };
  const previousChannelSummary = channelAggregate(previousChannelRows)[0] || { channel_sales: 0, channel_units: 0 };
  const topChannel = channelAggregate(channelRows, ["channel"]).sort((a, b) => b.channel_sales - a.channel_sales)[0];
  const topChannelProduct = channelAggregate(channelRows, ["channel", "product_name"]).sort((a, b) => b.channel_units - a.channel_units)[0];
  const channelRisk = channelAggregate(channelRows, ["channel", "product_name"]).filter((row) => row.channel_sales > 100 && row.channel_units <= 1).sort((a, b) => b.channel_sales - a.channel_sales)[0];
  const overviewCards = [
    {
      label: "经营变化",
      title: `销售额 ${deltaText(current.purchase_value, previous.purchase_value).text}`,
      body: `花费 ${deltaText(current.spend, previous.spend).text}，ROAS ${deltaText(current.roas, previous.roas).text}。${salesDelta > spendDelta ? "增长质量好于花费扩张。" : "销售增长没有跑赢花费，需要看效率。"}`,
      tone: insightTone(roasDelta),
    },
    {
      label: "主要贡献",
      title: topCountry ? `${topCountry.country} 贡献 ${pct(current.purchase_value ? topCountry.purchase_value / current.purchase_value : 0)}` : "暂无贡献国家",
      body: topCountry ? `销售额 ${money(topCountry.purchase_value)}，ROAS ${ratio(topCountry.roas)}，CPA ${money(topCountry.cpa)}。` : "当前筛选下没有可分析数据。",
      tone: "neutral",
    },
    {
      label: "可加码组合",
      title: bestCombo ? `${bestCombo.country} / ${bestCombo.product_name}` : "暂无明显放量组合",
      body: bestCombo ? `ROAS ${ratio(bestCombo.roas)}，转化 ${number(bestCombo.purchase_times)}，花费 ${money(bestCombo.spend)}。` : "需要更高转化量后再判断可放量机会。",
      tone: bestCombo ? "positive" : "neutral",
    },
    {
      label: "复盘优先级",
      title: riskCombo ? `${riskCombo.country} / ${riskCombo.product_name}` : "暂无明显风险",
      body: riskCombo ? `花费 ${money(riskCombo.spend)}，ROAS ${ratio(riskCombo.roas)}，优先看素材和承接。` : "当前筛选下整体没有明显异常。",
      tone: riskCombo ? "negative" : "neutral",
    },
  ];
  const cardsByView = {
    overview: overviewCards,
    product: [
      {
        label: "主力产品",
        title: topProductName ? `${topProductName.standard_product_name} 贡献 ${pct(current.purchase_value ? topProductName.purchase_value / current.purchase_value : 0)}` : "暂无产品数据",
        body: topProductName ? `GMV ${money(topProductName.purchase_value)}，花费 ${money(topProductName.spend)}，ROAS ${ratio(topProductName.roas)}。` : "当前筛选下没有可分析数据。",
        tone: "neutral",
      },
      {
        label: "单品/套组判断",
        title: bestProductForm ? `${bestProductForm.product_form} ROAS ${ratio(bestProductForm.roas)}` : "暂无类型差异",
        body: bestProductForm ? `GMV ${money(bestProductForm.purchase_value)}，转化 ${number(bestProductForm.purchase_times)}，用于判断当前更适合单品或套组素材。` : "需要更多转化量后再判断。",
        tone: bestProductForm?.roas >= 2 ? "positive" : "neutral",
      },
      overviewCards[2],
      {
        label: "产品风险",
        title: productCountryRisk ? `${productCountryRisk.standard_product_name} / ${productCountryRisk.country}` : "暂无明显产品风险",
        body: productCountryRisk ? `花费 ${money(productCountryRisk.spend)}，ROAS ${ratio(productCountryRisk.roas)}，优先看该国家素材和承接。` : "当前筛选下产品国家组合没有明显异常。",
        tone: productCountryRisk ? "negative" : "neutral",
      },
    ],
    country: [
      overviewCards[1],
      {
        label: "增长国家",
        title: growthCountry ? `${growthCountry.country} 销售 ${growthCountry.sales_delta.text}` : "暂无增长国家",
        body: growthCountry ? `销售额 ${money(growthCountry.purchase_value)}，花费 ${money(growthCountry.spend)}，ROAS ${ratio(growthCountry.roas)}。` : "当前对比周期下没有明显增长。",
        tone: growthCountry?.sales_delta?.cls === "up" ? "positive" : "neutral",
      },
      {
        label: "国家风险",
        title: weakCountry ? `${weakCountry.country} ROAS ${ratio(weakCountry.roas)}` : "暂无国家风险",
        body: weakCountry ? `花费 ${money(weakCountry.spend)}，CPA ${money(weakCountry.cpa)}，建议看该国家的产品和素材结构。` : "当前筛选下国家层面没有明显效率风险。",
        tone: weakCountry ? "negative" : "neutral",
      },
      overviewCards[2],
    ],
    creative: [
      {
        label: "最佳素材类型",
        title: bestMaterial ? `${bestMaterial.material_label} ROAS ${ratio(bestMaterial.roas)}` : "暂无素材表现",
        body: bestMaterial ? `花费占比 ${pct(bestMaterial.spend_share)}，销售占比 ${pct(bestMaterial.sales_share)}，ROAS ${bestMaterial.roas_delta.text}。` : "当前筛选下没有素材数据。",
        tone: bestMaterial ? "positive" : "neutral",
      },
      {
        label: "素材风险",
        title: weakMaterial ? `${weakMaterial.material_label} ROAS ${ratio(weakMaterial.roas)}` : "暂无素材风险",
        body: weakMaterial ? `花费 ${money(weakMaterial.spend)}，销售额 ${money(weakMaterial.purchase_value)}，需要看具体素材明细。` : "当前筛选下素材效率比较平稳。",
        tone: weakMaterial ? "negative" : "neutral",
      },
      overviewCards[2],
      overviewCards[3],
    ],
    landing: [
      {
        label: "主要承接",
        title: topLanding ? `${topLanding.landing_type} 花费占比 ${pct(current.spend ? topLanding.spend / current.spend : 0)}` : "暂无落地页数据",
        body: topLanding ? `花费 ${money(topLanding.spend)}，GMV ${money(topLanding.purchase_value)}，ROAS ${ratio(topLanding.roas)}。` : "当前筛选下没有可分析落地页。",
        tone: "neutral",
      },
      {
        label: "高效承接",
        title: bestLanding ? `${bestLanding.landing_type} ROAS ${ratio(bestLanding.roas)}` : "暂无高效承接",
        body: bestLanding ? `转化 ${number(bestLanding.purchase_times)}，CVR ${pct(bestLanding.cvr)}，GMV ${bestLanding.sales_delta.text}。` : "需要更高转化量后再判断落地页效率。",
        tone: bestLanding ? "positive" : "neutral",
      },
      {
        label: "承接风险",
        title: riskLanding ? `${riskLanding.landing_type} ROAS ${ratio(riskLanding.roas)}` : "暂无明显风险",
        body: riskLanding ? `花费 ${money(riskLanding.spend)}，CPA ${money(riskLanding.cpa)}，优先看对应产品和素材。` : "当前筛选下落地页没有明显低效消耗。",
        tone: riskLanding ? "negative" : "neutral",
      },
      {
        label: "规模变化",
        title: `落地页花费 ${deltaText(current.spend, previous.spend).text}`,
        body: `GMV ${deltaText(current.purchase_value, previous.purchase_value).text}，ROAS ${deltaText(current.roas, previous.roas).text}。`,
        tone: insightTone(roasDelta),
      },
    ],
    channels: [
      {
        label: "主力渠道",
        title: topChannel ? `${topChannel.channel} 占比 ${pct(topChannel.sales_share)}` : "暂无渠道数据",
        body: topChannel ? `销售额 ${money(topChannel.channel_sales)}，销量 ${number(topChannel.channel_units)}。` : "当前筛选下没有渠道销售数据。",
        tone: "neutral",
      },
      {
        label: "渠道销售",
        title: `总销售 ${money(channelSummary.channel_sales)}`,
        body: `环比 ${deltaText(channelSummary.channel_sales, previousChannelSummary.channel_sales).text}，销量 ${number(channelSummary.channel_units)}。`,
        tone: insightTone(deltaValue(channelSummary.channel_sales, previousChannelSummary.channel_sales)),
      },
      {
        label: "最高销量产品",
        title: topChannelProduct ? `${topChannelProduct.product_name}` : "暂无产品销量",
        body: topChannelProduct ? `${topChannelProduct.channel}，销量 ${number(topChannelProduct.channel_units)}，销售额 ${money(topChannelProduct.channel_sales)}。` : "当前筛选下没有产品销量数据。",
        tone: topChannelProduct ? "positive" : "neutral",
      },
      {
        label: "数据复核",
        title: channelRisk ? `${channelRisk.channel} / ${channelRisk.product_name}` : "暂无明显异常",
        body: channelRisk ? `销售额 ${money(channelRisk.channel_sales)} 但销量 ${number(channelRisk.channel_units)}，建议复核商品口径。` : "当前渠道商品数据没有明显高销售低销量异常。",
        tone: channelRisk ? "negative" : "neutral",
      },
    ],
  };
  const cards = cardsByView[state.view] || overviewCards;
  document.getElementById("actionInsights").innerHTML = cards.map((card) => `
    <article class="insight-card ${card.tone}">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.title)}</strong>
      <p>${escapeHtml(card.body)}</p>
    </article>
  `).join("");
}

function renderPeriodHint() {
  const period = comparisonWindow();
  const pendingPeriod = pendingComparisonWindow();
  const hint = document.getElementById("periodHint");
  const hasPending = hasPendingTimeChanges();
  const pendingText = hasPending
    ? `<span class="pending-period">待应用输入框：${escapeHtml(pendingTime.startDate)} 至 ${escapeHtml(pendingTime.endDate)} / 对比 ${escapeHtml(pendingPeriod.label)}，点击“应用并刷新”后生效</span>`
    : "";
  hint.classList.toggle("has-pending", hasPending);
  hint.innerHTML = `
    <span>当前生效：${escapeHtml(state.startDate)} 至 ${escapeHtml(state.endDate)}</span>
    <span>当前对比：${escapeHtml(period.label)}</span>
    ${pendingText}
  `;
}

function renderKpiItems(items) {
  document.getElementById("kpis").innerHTML = items.map((item) => {
    const value = typeof item.value === "string" ? item.value : item.format(item.value);
    const delta = item.previous === undefined || item.previous === null ? null : deltaText(item.value, item.previous);
    const cls = delta && item.inverse && delta.cls !== "flat" ? (delta.cls === "up" ? "down" : "up") : (delta?.cls || "flat");
    return `
    <article class="kpi">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small class="${cls}">${escapeHtml(delta ? `${delta.text} 环比` : (item.note || "当前周期"))}</small>
      <em>${escapeHtml(item.hint || "")}</em>
    </article>
  `;
  }).join("");
}

function renderKpis(rows, previousRows, context = {}) {
  const summary = summaryOf(rows);
  const previous = summaryOf(previousRows);
  const countryCount = new Set(rows.map((row) => row.country).filter(Boolean)).size;
  const previousCountryCount = new Set(previousRows.map((row) => row.country).filter(Boolean)).size;
  const productCount = new Set(rows.map((row) => row.product_name).filter(Boolean)).size;
  const previousProductCount = new Set(previousRows.map((row) => row.product_name).filter(Boolean)).size;
  const currentMaterials = filteredMaterialInventoryRows();
  const previousMaterials = comparisonMaterialInventoryRows();
  const materialCount = new Set(currentMaterials.map(materialIdentity).filter(Boolean)).size;
  const previousMaterialCount = new Set(previousMaterials.map(materialIdentity).filter(Boolean)).size;
  const topCountry = aggregate(rows, ["country"]).sort((a, b) => b.purchase_value - a.purchase_value)[0];
  const topProduct = aggregate(rows, ["product_name"]).sort((a, b) => b.purchase_value - a.purchase_value)[0];
  const materialRows = materialComparisonRows(rows, previousRows, currentMaterials, previousMaterials);
  const topMaterial = materialRows.filter((row) => !row.is_child).sort((a, b) => b.spend - a.spend)[0];

  if (state.view === "product") {
    const productModel = context.productModel;
    const productSummary = productModel?.summary || summary;
    const previousProductSummary = productModel?.previousSummary || previous;
    const modelRows = productModel?.detail || rows;
    const previousModelRows = productModel?.previousDetail || previousRows;
    const standardProductCount = new Set(modelRows.map((row) => row.standard_product_name).filter(Boolean)).size;
    const previousStandardProductCount = new Set(previousModelRows.map((row) => row.standard_product_name).filter(Boolean)).size;
    const topStandardProduct = [...modelRows].sort((a, b) => b.purchase_value - a.purchase_value)[0];
    const topStructure = productModel?.structure?.[0];
    const structureLabel = productModel?.segment === "form" ? "主力单品套组" : productModel?.segment === "material" ? "主力素材类型" : "主力产品";
    renderKpiItems([
      { label: "产品数", value: standardProductCount, previous: previousStandardProductCount, format: number, hint: "按标准产品名" },
      { label: "主力产品", value: topStandardProduct?.standard_product_name || "-", note: topStandardProduct ? `GMV ${money(topStandardProduct.purchase_value)}` : "当前周期", format: String, hint: "按 归因收入" },
      { label: structureLabel, value: topStructure?.[productModel?.dimension] || "-", note: topStructure ? `ROAS ${ratio(topStructure.roas)}` : "当前周期", format: String, hint: "当前分析维度" },
      { label: "归因收入", value: productSummary.purchase_value, previous: previousProductSummary.purchase_value, format: money, hint: `${number(productSummary.purchase_times)} 转化` },
      { label: "ROAS", value: productSummary.roas, previous: previousProductSummary.roas, format: ratio, hint: "归因收入 / 花费" },
      { label: "CVR", value: productSummary.cvr, previous: previousProductSummary.cvr, format: pct, hint: "转化 / 点击" },
    ]);
    return;
  }

  if (state.view === "creative") {
    const creativeModel = context.creativeModel;
    const creativeSummary = creativeModel?.summary || summary;
    const previousCreativeSummary = creativeModel?.previousSummary || previous;
    const creativeMaterialCount = new Set((creativeModel?.detail || []).map(materialIdentity).filter(Boolean)).size;
    const previousCreativeMaterialCount = new Set((creativeModel?.previousDetail || []).map(materialIdentity).filter(Boolean)).size;
    const topSegment = creativeModel?.structure?.[0];
    const segmentLabel = creativeModel ? creativeSegmentMeta(creativeModel).label : "素材类型";
    const riskRows = aggregate((creativeModel?.detail || []).map((row) => ({ ...row, material_name: materialName(row) })), ["material_name"])
      .filter((row) => row.spend > 100 && row.roas < 1.3);
    renderKpiItems([
      { label: "素材数", value: creativeMaterialCount, previous: previousCreativeMaterialCount, format: number, hint: "唯一素材名/编号" },
      { label: "素材花费", value: creativeSummary.spend, previous: previousCreativeSummary.spend, format: money, hint: "Meta 广告花费" },
      { label: "归因收入", value: creativeSummary.purchase_value, previous: previousCreativeSummary.purchase_value, format: money, hint: `${number(creativeSummary.purchase_times)} 转化` },
      { label: `主要${segmentLabel}`, value: topSegment?.[creativeModel?.dimension] || "-", note: topSegment ? `花费占比 ${pct(topSegment.spend_share)}` : "当前周期", format: String, hint: "按花费占比" },
      { label: "风险素材", value: riskRows.length, previous: undefined, format: number, hint: "花费>$100 且 ROAS<1.3", inverse: true },
      { label: "CVR", value: creativeSummary.cvr, previous: previousCreativeSummary.cvr, format: pct, hint: "转化 / 点击" },
    ]);
    return;
  }

  if (state.view === "country") {
    renderKpiItems([
      { label: "国家数", value: countryCount, previous: previousCountryCount, format: number, hint: "当前筛选覆盖" },
      { label: "最大国家", value: topCountry?.country || "-", note: topCountry ? `GMV ${money(topCountry.purchase_value)}` : "当前周期", format: String, hint: "按 归因收入" },
      { label: "归因收入", value: summary.purchase_value, previous: previous.purchase_value, format: money, hint: `${number(summary.purchase_times)} 转化` },
      { label: "广告花费", value: summary.spend, previous: previous.spend, format: money, hint: `${number(summary.impressions)} 展示` },
      { label: "ROAS", value: summary.roas, previous: previous.roas, format: ratio, hint: "归因收入 / 花费" },
      { label: "CPA", value: summary.cpa, previous: previous.cpa, format: money, hint: "花费 / 转化", inverse: true },
    ]);
    return;
  }

  if (state.view === "landing") {
    const landingRows = context.landingRows || rows.map((row) => ({ ...row, landing_type: landingPageType(row) }));
    const previousLandingRows = context.previousLandingRows || previousRows.map((row) => ({ ...row, landing_type: landingPageType(row) }));
    const landingTypes = new Set(landingRows.map((row) => row.landing_type)).size;
    const previousLandingTypes = new Set(previousLandingRows.map((row) => row.landing_type)).size;
    const topLanding = aggregate(landingRows, ["landing_type"]).sort((a, b) => b.spend - a.spend)[0];
    renderKpiItems([
      { label: "落地页类型", value: landingTypes, previous: previousLandingTypes, format: number, hint: "集合页/详情页/活动页" },
      { label: "主要承接", value: topLanding?.landing_type || "-", note: topLanding ? `花费占比 ${pct(summary.spend ? topLanding.spend / summary.spend : 0)}` : "当前周期", format: String, hint: "按花费" },
      { label: "广告花费", value: summary.spend, previous: previous.spend, format: money, hint: "落地页消耗" },
      { label: "归因收入", value: summary.purchase_value, previous: previous.purchase_value, format: money, hint: `${number(summary.purchase_times)} 转化` },
      { label: "ROAS", value: summary.roas, previous: previous.roas, format: ratio, hint: "归因收入 / 花费" },
      { label: "CVR", value: summary.cvr, previous: previous.cvr, format: pct, hint: "转化 / 点击" },
    ]);
    return;
  }

  if (state.view === "channels") {
    const channelRows = filteredChannelRows();
    const previousChannelRows = comparisonChannelRows();
    const byChannel = new Map(channelAggregate(channelRows, ["channel"]).map((row) => [row.channel, row]));
    const previousByChannel = new Map(channelAggregate(previousChannelRows, ["channel"]).map((row) => [row.channel, row]));
    const shopify = byChannel.get("Shopify");
    const previousShopify = previousByChannel.get("Shopify");
    const amazon = byChannel.get("Amazon");
    const previousAmazon = previousByChannel.get("Amazon");
    const tiktok = byChannel.get("TikTok");
    const previousTiktok = previousByChannel.get("TikTok");
    const topProductChannel = channelAggregate(channelRows, ["channel", "product_name"]).sort((a, b) => b.channel_units - a.channel_units)[0];
    const channelSalesKpi = (label, channel, current, previous, metricBasis) => ({
      label,
      value: hasChannelData(byChannel, channel) ? getMetric(current, "channel_sales") : "暂无数据",
      previous: hasChannelData(byChannel, channel) && hasChannelData(previousByChannel, channel)
        ? getMetric(previous, "channel_sales")
        : undefined,
      format: money,
      hint: metricBasis,
    });
    renderKpiItems([
      { label: "渠道数", value: new Set(channelRows.map((row) => row.channel)).size, previous: new Set(previousChannelRows.map((row) => row.channel)).size, format: number, hint: "当前筛选覆盖" },
      channelSalesKpi("Shopify销售额", "Shopify", shopify, previousShopify, "Shopify Net Sales"),
      channelSalesKpi("Amazon销售额", "Amazon", amazon, previousAmazon, "Source USD GMV"),
      channelSalesKpi("TikTok销售额", "TikTok", tiktok, previousTiktok, "Source USD GMV"),
      { label: "渠道销量", value: channelRows.reduce((sum, row) => sum + getMetric(row, "channel_units"), 0), previous: previousChannelRows.reduce((sum, row) => sum + getMetric(row, "channel_units"), 0), format: number, hint: "Units 汇总" },
      { label: "最高销量产品", value: topProductChannel?.product_name || "-", note: topProductChannel ? `${number(topProductChannel.channel_units)} 件` : "当前周期", format: String, hint: topProductChannel?.channel || "" },
    ]);
    return;
  }

  renderKpiItems([
    { label: "广告花费", value: summary.spend, previous: previous.spend, format: money, hint: `${number(summary.impressions)} 展示` },
    { label: "归因收入", value: summary.purchase_value, previous: previous.purchase_value, format: money, hint: `${number(summary.purchase_times)} 转化` },
    { label: "产品数", value: productCount, previous: previousProductCount, format: number, hint: "当前筛选覆盖" },
    { label: "最大产品", value: topProduct?.product_name || "-", note: topProduct ? `GMV ${money(topProduct.purchase_value)}` : "当前周期", format: String, hint: "按 归因收入" },
    { label: "ROAS", value: summary.roas, previous: previous.roas, format: ratio, hint: "归因收入 / 花费" },
    { label: "CPA", value: summary.cpa, previous: previous.cpa, format: money, hint: "花费 / 转化", inverse: true },
  ]);
}

function renderComparison(currentRows, previousRows) {
  document.getElementById("comparison").innerHTML = "";
}

function renderInsightSummary(fact, previousFact, context = {}) {
  if (state.view === "channels") {
    const channelRows = filteredChannelRows();
    const topSalesProduct = channelAggregate(channelRows, ["product_name"])
      .sort((a, b) => b.channel_sales - a.channel_sales)[0];
    const topUnitsProduct = channelAggregate(channelRows, ["product_name"])
      .sort((a, b) => b.channel_units - a.channel_units)[0];
    document.getElementById("insightSummary").innerHTML = `
      <article>
        <span>最高销售产品</span>
        <strong>${escapeHtml(topSalesProduct?.product_name || "-")} <small>${topSalesProduct ? money(topSalesProduct.channel_sales) : ""}</small></strong>
      </article>
      <article>
        <span>最高销量产品</span>
        <strong>${escapeHtml(topUnitsProduct?.product_name || "-")} <small>${topUnitsProduct ? `${number(topUnitsProduct.channel_units)} 件` : ""}</small></strong>
      </article>
    `;
    return;
  }
  if (state.view === "creative" && context.creativeModel) {
    const model = context.creativeModel;
    const meta = creativeSegmentMeta(model);
    const topSpend = model.structure[0];
    const topRoas = [...model.structure]
      .filter((row) => row.spend > 100)
      .sort((left, right) => right.roas - left.roas)[0];
    document.getElementById("insightSummary").innerHTML = `
      <article>
        <span>主要${escapeHtml(meta.label)}</span>
        <strong>${escapeHtml(topSpend?.[model.dimension] || "-")} <small>${topSpend ? `花费占比 ${pct(topSpend.spend_share)}` : ""}</small></strong>
      </article>
      <article>
        <span>高效${escapeHtml(meta.label)}</span>
        <strong>${escapeHtml(topRoas?.[model.dimension] || "-")} <small>${topRoas ? `ROAS ${ratio(topRoas.roas)}` : ""}</small></strong>
      </article>
    `;
    return;
  }
  const topCountry = aggregate(fact, ["country"]).sort((a, b) => b.purchase_value - a.purchase_value)[0];
  const topProduct = aggregate(fact, ["product_name"]).sort((a, b) => b.purchase_value - a.purchase_value)[0];
  const bestProduct = aggregate(fact, ["product_name"]).filter((row) => row.spend > 100 && row.purchase_times >= 3).sort((a, b) => b.roas - a.roas)[0];
  document.getElementById("insightSummary").innerHTML = `
    <article>
      <span>主要贡献</span>
      <strong>${escapeHtml(topCountry?.country || "-")} / ${escapeHtml(topProduct?.product_name || "-")}</strong>
    </article>
    <article>
      <span>当前高效产品</span>
      <strong>${escapeHtml(bestProduct?.product_name || "-")} <small>${bestProduct ? `ROAS ${ratio(bestProduct.roas)}` : ""}</small></strong>
    </article>
  `;
}

function responsiveChartWidth(el) {
  return Math.max(300, Math.floor(Number(el?.clientWidth || 0) - 28));
}

function responsiveTickStep(itemCount, width, pad) {
  const plotWidth = Math.max(width - pad.left - pad.right, 1);
  const maxTicks = Math.max(2, Math.floor(plotWidth / 56));
  return Math.max(1, Math.ceil(Math.max(itemCount - 1, 1) / Math.max(maxTicks - 1, 1)));
}

function renderLineChart(id, rows, metric) {
  const el = document.getElementById(id);
  if (!rows.length) {
    el.innerHTML = "";
    return;
  }
  const width = responsiveChartWidth(el);
  const height = 330;
  const pad = { top: 18, right: 24, bottom: 54, left: 64 };
  const values = rows.map((row) => Number(row[metric] || 0));
  const max = Math.max(...values, 1);
  const min = metric === "roas" ? Math.min(...values, 0) : 0;
  const x = (index) => pad.left + (index * (width - pad.left - pad.right)) / Math.max(rows.length - 1, 1);
  const y = (value) => height - pad.bottom - ((value - min) * (height - pad.top - pad.bottom)) / Math.max(max - min, 1);
  const points = rows.map((row, index) => `${x(index)},${y(Number(row[metric] || 0))}`).join(" ");
  const area = `${pad.left},${height - pad.bottom} ${points} ${x(rows.length - 1)},${height - pad.bottom}`;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((step) => {
    const yy = pad.top + step * (height - pad.top - pad.bottom);
    const val = max - step * (max - min);
    return `<line class="grid-line" x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}" />
      <text x="8" y="${yy + 4}">${formatMetric(metric, val)}</text>`;
  }).join("");
  const tickStep = responsiveTickStep(rows.length, width, pad);
  const ticks = rows.filter((_, index) => index === 0 || index === rows.length - 1 || index % tickStep === 0).map((row) => {
    const originalIndex = rows.indexOf(row);
    return `<text class="x-tick" x="${x(originalIndex)}" y="${height - 18}" text-anchor="end" transform="rotate(-35 ${x(originalIndex)} ${height - 18})">${row.date_start.slice(5)}</text>`;
  }).join("");
  const hoverPoints = rows.map((row, index) => {
    const value = Number(row[metric] || 0);
    const cx = x(index);
    const cy = y(value);
    const label = `${row.date_start} · ${metricLabels[metric]} ${formatMetric(metric, value)}`;
    return `
      <g class="chart-point" tabindex="0">
        <line class="hover-guide" x1="${cx}" x2="${cx}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
        <circle class="point-hit" cx="${cx}" cy="${cy}" r="13"></circle>
        <circle class="point-dot" cx="${cx}" cy="${cy}" r="3.5"></circle>
        <g class="chart-tooltip" transform="translate(${Math.min(Math.max(cx - 74, 8), width - 156)} ${cy > 72 ? cy - 54 : cy + 18})">
          <rect width="148" height="42" rx="6"></rect>
          <text x="10" y="17">${escapeHtml(row.date_start)}</text>
          <text x="10" y="32">${escapeHtml(metricLabels[metric])} ${escapeHtml(formatMetric(metric, value))}</text>
        </g>
        <title>${escapeHtml(label)}</title>
      </g>
    `;
  }).join("");
  el.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metricLabels[metric]}趋势">
      <g class="axis">${grid}${ticks}</g>
      <polygon class="area" points="${area}"></polygon>
      <polyline class="line" points="${points}"></polyline>
      ${hoverPoints}
    </svg>
  `;
}

function renderTrendConclusion(id, rows, metric) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有趋势数据。</p>`;
    return;
  }
  const first = rows[0];
  const last = rows[rows.length - 1];
  const peak = [...rows].sort((a, b) => getMetric(b, metric) - getMetric(a, metric))[0];
  const total = rows.reduce((sum, row) => sum + getMetric(row, metric), 0);
  const avg = total / rows.length;
  const trendDelta = deltaText(getMetric(last, metric), getMetric(first, metric));
  el.innerHTML = `
    <strong>趋势结论</strong>
    <p>${escapeHtml(metricLabels[metric])}峰值出现在 ${escapeHtml(peak.date_start)}，为 ${escapeHtml(formatMetric(metric, getMetric(peak, metric)))}。</p>
    <p>期末较期初 <span class="${trendDelta.cls}">${escapeHtml(trendDelta.text)}</span>，日均 ${escapeHtml(formatMetric(metric, avg))}。</p>
  `;
}

function renderCountryTrendConclusion(countryRows) {
  const el = document.getElementById("countryTrendConclusion");
  if (!el) return;
  const countryProducts = countryRows.filter((row) => row.spend > 50);
  if (!countryProducts.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有国家产品数据。</p>`;
    return;
  }
  const topSales = [...countryProducts].sort((a, b) => b.purchase_value - a.purchase_value)[0];
  const best = [...countryProducts].filter((row) => row.purchase_times >= 3).sort((a, b) => b.roas - a.roas)[0];
  const weak = [...countryProducts].filter((row) => row.spend > 200 && row.purchase_times > 0).sort((a, b) => a.roas - b.roas)[0];
  el.innerHTML = `
    <strong>国家产品结论</strong>
    <p>贡献最高是 ${escapeHtml(topSales.country)} / ${escapeHtml(topSales.standard_product_name)}，GMV ${money(topSales.purchase_value)}，ROAS ${ratio(topSales.roas)}。</p>
    ${best ? `<p>效率最好是 ${escapeHtml(best.country)} / ${escapeHtml(best.standard_product_name)}，ROAS ${ratio(best.roas)}，可优先看素材复用。</p>` : ""}
    ${weak ? `<p>表现偏弱是 ${escapeHtml(weak.country)} / ${escapeHtml(weak.standard_product_name)}，花费 ${money(weak.spend)}，ROAS ${ratio(weak.roas)}。</p>` : ""}
  `;
}

function renderChannelLineChart(id, rows) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有${escapeHtml(channelTrendTitle())}数据。</p>`;
    return;
  }
  const channelOrder = ["Shopify", "Amazon", "TikTok"];
  const channels = channelOrder.filter((channel) => rows.some((row) => row.channel === channel));
  const colors = {
    Shopify: "#047857",
    Amazon: "#a16207",
    TikTok: "#2563eb",
  };
  const dates = [...new Set(rows.map((row) => row.date_start))].sort();
  const byKey = new Map(rows.map((row) => [`${row.date_start}||${row.channel}`, row]));
  const series = channels.map((channel) => ({
    channel,
    values: dates.map((date) => ({
      date_start: date,
      channel,
      value: byKey.has(`${date}||${channel}`) ? getMetric(byKey.get(`${date}||${channel}`), "channel_sales") : null,
    })),
  }));
  const width = responsiveChartWidth(el);
  const height = 380;
  const pad = { top: 18, right: 24, bottom: 76, left: 64 };
  const max = Math.max(...series.flatMap((line) => line.values.map((point) => point.value).filter((value) => value !== null)), 1);
  const x = (index) => pad.left + (index * (width - pad.left - pad.right)) / Math.max(dates.length - 1, 1);
  const y = (value) => height - pad.bottom - (value * (height - pad.top - pad.bottom)) / max;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((step) => {
    const yy = pad.top + step * (height - pad.top - pad.bottom);
    const val = max - step * max;
    return `<line class="grid-line" x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}" />
      <text x="8" y="${yy + 4}">${money(val)}</text>`;
  }).join("");
  const tickStep = responsiveTickStep(dates.length, width, pad);
  const ticks = dates.filter((_, index) => index === 0 || index === dates.length - 1 || index % tickStep === 0).map((date) => {
    const index = dates.indexOf(date);
    return `<text class="x-tick" x="${x(index)}" y="${height - 28}" text-anchor="end" transform="rotate(-35 ${x(index)} ${height - 28})">${date.slice(5)}</text>`;
  }).join("");
  const lines = series.map((line) => {
    const points = line.values
      .filter((point) => point.value !== null)
      .map((point) => `${x(dates.indexOf(point.date_start))},${y(point.value)}`)
      .join(" ");
    return `<polyline class="line" style="stroke:${colors[line.channel]}" points="${points}"></polyline>`;
  }).join("");
  const hoverPoints = dates.map((date, index) => {
    const values = channels.map((channel) => ({
      channel,
      value: byKey.has(`${date}||${channel}`) ? getMetric(byKey.get(`${date}||${channel}`), "channel_sales") : null,
    }));
    const cx = x(index);
    const topValue = Math.max(...values.map((item) => item.value).filter((value) => value !== null), 0);
    const cy = y(topValue);
    return `
      <g class="chart-point" tabindex="0">
        <line class="hover-guide" x1="${cx}" x2="${cx}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
        ${values.filter((item) => item.value !== null).map((item) => `<circle class="point-hit" cx="${cx}" cy="${y(item.value)}" r="13"></circle>
          <circle class="point-dot" style="stroke:${colors[item.channel]}" cx="${cx}" cy="${y(item.value)}" r="3.5"></circle>`).join("")}
        <g class="chart-tooltip channel-tooltip" transform="translate(${Math.min(Math.max(cx - 96, 8), width - 200)} ${cy > 104 ? cy - 86 : cy + 18})">
          <rect width="192" height="76" rx="6"></rect>
          <text x="10" y="17">${escapeHtml(date)}</text>
          ${values.map((item, lineIndex) => `<text x="10" y="${35 + lineIndex * 15}">${escapeHtml(item.channel)} ${escapeHtml(item.value === null ? "暂无数据" : channelMoney(item.value, item.channel))}</text>`).join("")}
        </g>
        <title>${escapeHtml(`${date} · ${values.map((item) => `${item.channel} ${item.value === null ? "暂无数据" : channelMoney(item.value, item.channel)}`).join(" · ")}`)}</title>
      </g>
    `;
  }).join("");
  el.innerHTML = `
    <div class="dual-legend">
      ${channels.map((channel) => `<span><i class="legend-dot" style="background:${colors[channel]}"></i>${escapeHtml(channel)}</span>`).join("")}
    </div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(channelTrendTitle())}，Shopify 为 Net Sales，Amazon 和 TikTok 为 Source USD GMV">
      <g class="axis">${grid}${ticks}</g>
      ${lines}
      ${hoverPoints}
    </svg>
  `;
}

function renderChannelConclusion(rows) {
  const el = document.getElementById("usChannelTrendConclusion");
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有${escapeHtml(channelTrendTitle())}数据。</p>`;
    return;
  }
  const channelRows = channelAggregate(rows, ["channel"]).sort((a, b) => b.channel_sales - a.channel_sales);
  const latestByChannel = ["Shopify", "Amazon", "TikTok"].map((channel) => {
    const latest = rows.filter((item) => item.channel === channel)
      .sort((a, b) => String(b.date_start).localeCompare(String(a.date_start)))[0];
    return `${channel} ${latest?.date_start || "暂无数据"}`;
  }).join("；");
  const top = channelRows[0];
  el.innerHTML = `
    <strong>${escapeHtml(channelMarketLabel())}多渠道结论</strong>
    <p>国家：${escapeHtml(channelMarketCountries().join("、"))}。${escapeHtml(top.channel)} 当前销售额最高，为 ${channelMoney(top.channel_sales, top)}。</p>
    <p>最后有数据日期：${escapeHtml(latestByChannel)}。Shopify 为 Net Sales；Amazon 和 TikTok 为 Source USD GMV。</p>
  `;
}

function renderDonutChart(id, rows, metric, title, options = {}) {
  const el = document.getElementById(id);
  const labelKey = options.labelKey || "material_label";
  const limit = options.limit || rows.length;
  const sortedSource = rows
    .filter((row) => !row.is_child && getMetric(row, metric) > 0)
    .sort((a, b) => getMetric(b, metric) - getMetric(a, metric));
  const source = sortedSource.length > limit
    ? [
        ...sortedSource.slice(0, Math.max(limit - 1, 1)),
        {
          [labelKey]: "其他",
          [metric]: sortedSource.slice(Math.max(limit - 1, 1)).reduce((sum, row) => sum + getMetric(row, metric), 0),
        },
      ]
    : sortedSource;
  const total = source.reduce((sum, row) => sum + getMetric(row, metric), 0);
  if (!source.length || !total) {
    el.innerHTML = `<strong>${escapeHtml(title)}</strong><p class="empty">暂无数据</p>`;
    return;
  }
  const palette = ["#0b6f6a", "#2563eb", "#a16207", "#047857", "#b45309"];
  let offset = 25;
  const rings = source.map((row, index) => {
    const value = getMetric(row, metric);
    const dash = (value / total) * 100;
    const ring = `<circle class="donut-segment" r="38" cx="50" cy="50" pathLength="100"
      stroke="${palette[index % palette.length]}" stroke-dasharray="${dash} ${100 - dash}" stroke-dashoffset="${-offset}">
      <title>${escapeHtml(`${row[labelKey] || "Unknown"}: ${formatMetric(metric, value)} (${pct(value / total)})`)}</title>
    </circle>`;
    offset += dash;
    return ring;
  }).join("");
  const legend = source.map((row, index) => {
    const value = getMetric(row, metric);
    return `
      <div class="donut-legend-row">
        <i style="background:${palette[index % palette.length]}"></i>
        <span>${escapeHtml(row[labelKey] || "Unknown")}</span>
        <strong>${pct(value / total)}</strong>
      </div>
    `;
  }).join("");
  el.innerHTML = `
    <div class="donut-visual">
      <svg viewBox="0 0 100 100" role="img" aria-label="${escapeHtml(title)}">
        <circle class="donut-bg" r="38" cx="50" cy="50"></circle>
        ${rings}
        <text x="50" y="47" text-anchor="middle">${escapeHtml(formatMetric(metric, total))}</text>
        <text x="50" y="60" text-anchor="middle">合计</text>
      </svg>
    </div>
    <div class="donut-copy">
      <strong>${escapeHtml(title)}</strong>
      <div class="donut-legend">${legend}</div>
    </div>
  `;
}

function renderBars(id, rows, labelKey, metric = "spend", limit = 10, options = {}) {
  const top = [...rows].sort((a, b) => getMetric(b, metric) - getMetric(a, metric)).slice(0, limit);
  const max = Math.max(...top.map((row) => getMetric(row, metric)), 1);
  document.getElementById(id).innerHTML = top.map((row) => {
    const label = row[labelKey] || "Unknown";
    const value = getMetric(row, metric);
    const [efficiencyText, efficiencyTone] = efficiencyLabel(row);
    const labelHtml = options.clickable === false
      ? `<span>${escapeHtml(label)}</span>`
      : `<a class="link-filter" data-filter-key="${labelKey}" data-filter-value="${escapeHtml(label)}" href="${filterHref(labelKey, label)}">${escapeHtml(label)}</a>`;
    return `
      <div class="bar-row">
        <div class="bar-meta">
          ${labelHtml}
          <strong>${formatMetric(metric, value)}</strong>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.max((value / max) * 100, 2)}%"></div></div>
        <div class="bar-sub">
          ${options.subText
            ? options.subText(row)
            : `<span class="efficiency-chip ${efficiencyTone}">${escapeHtml(efficiencyText)}</span>
              ROAS ${ratio(row.roas)} / CPA ${money(row.cpa)} / Meta AOV ${money(row.aov)} / 转化 ${number(row.purchase_times)}`}
        </div>
      </div>
    `;
  }).join("") || `<p class="empty">当前筛选下暂无排行数据。</p>`;
}

function renderLandingTypeBars(id, rows) {
  const el = document.getElementById(id);
  if (!el) return;
  const source = rows
    .filter((row) => getMetric(row, "spend") > 0 || getMetric(row, "purchase_value") > 0)
    .sort((a, b) => getMetric(b, "spend") - getMetric(a, "spend"));
  if (!source.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有落地页类型数据。</p>`;
    return;
  }
  el.innerHTML = source.map((row) => {
    const spendShare = getMetric(row, "spend_share");
    const salesShare = getMetric(row, "sales_share");
    const gap = salesShare - spendShare;
    const gapCls = Math.abs(gap) < 0.01 ? "flat" : (gap > 0 ? "up" : "down");
    const [efficiencyText, efficiencyTone] = efficiencyLabel(row);
    return `
      <article class="compare-bar-row">
        <div class="compare-bar-head">
          <strong>${escapeHtml(row.landing_type || "Unknown")}</strong>
          <span class="efficiency-chip ${efficiencyTone}">${escapeHtml(efficiencyText)}</span>
        </div>
        <div class="compare-line">
          <span>花费</span>
          <div class="compare-track"><i class="spend-bar" style="width:${Math.max(spendShare * 100, 1)}%"></i></div>
          <b>${pct(spendShare)}</b>
        </div>
        <div class="compare-line">
          <span>GMV</span>
          <div class="compare-track"><i class="sales-bar" style="width:${Math.max(salesShare * 100, 1)}%"></i></div>
          <b>${pct(salesShare)}</b>
        </div>
        <p>ROAS ${ratio(row.roas)}，占比差 <span class="${gapCls}">${gap > 0 ? "+" : ""}${pct(gap)}</span></p>
      </article>
    `;
  }).join("");
}

function renderShareCompareBars(id, rows, labelKey, options = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const valueKey = options.valueKey || "purchase_value";
  const spendShareKey = options.spendShareKey || "spend_share";
  const salesShareKey = options.salesShareKey || "sales_share";
  const spendLabel = options.spendLabel || "花费";
  const salesLabel = options.salesLabel || "GMV";
  const valueFormat = options.valueFormat || ((value) => formatMetric(valueKey, value));
  const limit = options.limit || 6;
  const source = [...rows]
    .filter((row) => getMetric(row, spendShareKey) > 0 || getMetric(row, salesShareKey) > 0 || getMetric(row, valueKey) > 0)
    .sort((a, b) => getMetric(b, valueKey) - getMetric(a, valueKey))
    .slice(0, limit);
  if (!source.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有占比数据。</p>`;
    return;
  }
  el.innerHTML = source.map((row) => {
    const label = row[labelKey] || "Unknown";
    const spendShare = getMetric(row, spendShareKey);
    const salesShare = getMetric(row, salesShareKey);
    const gap = salesShare - spendShare;
    const gapCls = Math.abs(gap) < 0.01 ? "flat" : (gap > 0 ? "up" : "down");
    const filterKey = tableFilterKey({ key: labelKey });
    const labelHtml = filterKey
      ? `<a class="link-filter" data-filter-key="${filterKey}" data-filter-value="${escapeHtml(label)}" href="${filterHref(filterKey, label)}">${escapeHtml(label)}</a>`
      : `<strong>${escapeHtml(label)}</strong>`;
    return `
      <article class="compare-bar-row compact-compare-row">
        <div class="compare-bar-head">
          ${labelHtml}
          <span class="${gapCls}">占比差 ${gap > 0 ? "+" : ""}${pct(gap)}</span>
        </div>
        <div class="compare-line">
          <span>${escapeHtml(spendLabel)}</span>
          <div class="compare-track"><i class="spend-bar" style="width:${Math.max(spendShare * 100, spendShare ? 1 : 0)}%"></i></div>
          <b>${pct(spendShare)}</b>
        </div>
        <div class="compare-line">
          <span>${escapeHtml(salesLabel)}</span>
          <div class="compare-track"><i class="sales-bar" style="width:${Math.max(salesShare * 100, salesShare ? 1 : 0)}%"></i></div>
          <b>${pct(salesShare)}</b>
        </div>
        <p>ROAS ${ratio(row.roas || row.meta_roas || row.onsite_roas)}，${escapeHtml(salesLabel)} ${valueFormat(getMetric(row, valueKey))}</p>
      </article>
    `;
  }).join("");
}

function renderHeatmap(id, rows, xKey, yKey, options = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const valueKey = options.valueKey || "purchase_value";
  const colorKey = options.colorKey || "roas";
  const xLimit = options.xLimit || 5;
  const yLimit = options.yLimit || 6;
  const source = rows.filter((row) => getMetric(row, valueKey) > 0 || getMetric(row, "spend") > 0);
  if (!source.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有热力数据。</p>`;
    return;
  }
  const totals = (key) => {
    const map = new Map();
    for (const row of source) {
      const label = row[key] || "Unknown";
      map.set(label, (map.get(label) || 0) + getMetric(row, valueKey));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label);
  };
  const xLabels = totals(xKey).slice(0, xLimit);
  const yLabels = totals(yKey).slice(0, yLimit);
  const byKey = new Map(source.map((row) => [`${row[xKey] || "Unknown"}||${row[yKey] || "Unknown"}`, row]));
  const maxColor = Math.max(...source.map((row) => getMetric(row, colorKey)), 1);
  const xFilterKey = tableFilterKey({ key: xKey });
  const yFilterKey = tableFilterKey({ key: yKey });
  const xHeads = xLabels.map((label) => xFilterKey
    ? `<a class="heatmap-head" data-filter-key="${xFilterKey}" data-filter-value="${escapeHtml(label)}" href="${filterHref(xFilterKey, label)}">${escapeHtml(label)}</a>`
    : `<span class="heatmap-head">${escapeHtml(label)}</span>`).join("");
  const rowsHtml = yLabels.map((yLabel) => {
    const yHead = yFilterKey
      ? `<a class="heatmap-side" data-filter-key="${yFilterKey}" data-filter-value="${escapeHtml(yLabel)}" href="${filterHref(yFilterKey, yLabel)}">${escapeHtml(yLabel)}</a>`
      : `<span class="heatmap-side">${escapeHtml(yLabel)}</span>`;
    const cells = xLabels.map((xLabel) => {
      const row = byKey.get(`${xLabel}||${yLabel}`) || {};
      const colorValue = getMetric(row, colorKey);
      const value = getMetric(row, valueKey);
      const alpha = value ? Math.max(0.16, Math.min(colorValue / maxColor, 1) * 0.82) : 0;
      const background = value ? `rgba(11, 111, 106, ${alpha.toFixed(2)})` : "#f3f5f7";
      const textColor = alpha > 0.48 ? "#ffffff" : "#1f2937";
      return `<span class="heatmap-cell" style="background:${background};color:${textColor}" title="${escapeHtml(`${xLabel} / ${yLabel}: ${formatMetric(valueKey, value)} · ROAS ${ratio(colorValue)}`)}"><b>${value ? formatMetric(valueKey, value) : "-"}</b><small>${value ? `R ${ratio(colorValue)}` : ""}</small></span>`;
    }).join("");
    return `<div class="heatmap-row">${yHead}${cells}</div>`;
  }).join("");
  el.innerHTML = `
    <div class="heatmap-grid" style="--heatmap-cols:${xLabels.length}">
      <span></span>${xHeads}
      ${rowsHtml}
    </div>
  `;
}

function renderQuadrantChart(id, rows, labelKey, options = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const source = [...rows].filter((row) => getMetric(row, "spend") > 0).sort((a, b) => b.spend - a.spend).slice(0, options.limit || 12);
  if (!source.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有象限数据。</p>`;
    return;
  }
  const width = 620;
  const height = 360;
  const pad = { top: 28, right: 24, bottom: 48, left: 58 };
  const maxSpend = Math.max(...source.map((row) => getMetric(row, "spend")), 1);
  const maxRoas = Math.max(...source.map((row) => getMetric(row, "roas")), 2.5);
  const maxSales = Math.max(...source.map((row) => getMetric(row, "purchase_value")), 1);
  const avgSpend = source.reduce((sum, row) => sum + getMetric(row, "spend"), 0) / source.length;
  const avgRoas = source.reduce((sum, row) => sum + getMetric(row, "roas"), 0) / source.length;
  const x = (value) => pad.left + (value / maxSpend) * (width - pad.left - pad.right);
  const y = (value) => height - pad.bottom - (value / maxRoas) * (height - pad.top - pad.bottom);
  const labelFilterKey = tableFilterKey({ key: labelKey });
  const points = source.map((row) => {
    const label = row[labelKey] || "Unknown";
    const radius = 6 + Math.sqrt(getMetric(row, "purchase_value") / maxSales) * 16;
    const href = filterHref(labelFilterKey, label);
    const attrs = labelFilterKey ? `data-filter-key="${labelFilterKey}" data-filter-value="${escapeHtml(label)}" href="${href}"` : "";
    return `
      <a class="quadrant-point-link" ${attrs}>
        <circle class="quadrant-point" cx="${x(getMetric(row, "spend"))}" cy="${y(getMetric(row, "roas"))}" r="${radius}">
          <title>${escapeHtml(`${label}: 花费 ${money(row.spend)} · ROAS ${ratio(row.roas)} · GMV ${money(row.purchase_value)}`)}</title>
        </circle>
        <text x="${x(getMetric(row, "spend")) + radius + 4}" y="${y(getMetric(row, "roas")) + 4}">${escapeHtml(label)}</text>
      </a>
    `;
  }).join("");
  el.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="投手效率象限图">
      <line class="grid-line" x1="${pad.left}" x2="${width - pad.right}" y1="${y(avgRoas)}" y2="${y(avgRoas)}"></line>
      <line class="grid-line" x1="${x(avgSpend)}" x2="${x(avgSpend)}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
      <text class="axis-label" x="${pad.left}" y="${pad.top - 8}">ROAS</text>
      <text class="axis-label" x="${width - 95}" y="${height - 14}">广告花费</text>
      <text class="quadrant-label" x="${x(avgSpend) + 8}" y="${y(avgRoas) - 10}">高效放量</text>
      <text class="quadrant-label" x="${pad.left + 8}" y="${y(avgRoas) + 20}">低消观察</text>
      ${points}
    </svg>
  `;
}

function renderCategoryLineChart(id, rows, categoryKey, metric, options = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有趋势数据。</p>`;
    return;
  }
  const categories = [...new Set(rows.map((row) => row[categoryKey] || "Unknown"))].slice(0, options.limit || 4);
  const dates = [...new Set(rows.map((row) => row.date_start))].sort();
  const width = responsiveChartWidth(el);
  const height = 330;
  const pad = { top: 20, right: 28, bottom: 62, left: 64 };
  const byKey = new Map(rows.map((row) => [`${row.date_start}||${row[categoryKey] || "Unknown"}`, row]));
  const max = Math.max(...rows.map((row) => getMetric(row, metric)), 1);
  const x = (index) => pad.left + (index * (width - pad.left - pad.right)) / Math.max(dates.length - 1, 1);
  const y = (value) => height - pad.bottom - (value * (height - pad.top - pad.bottom)) / max;
  const palette = ["#0b6f6a", "#2563eb", "#a16207", "#b45309"];
  const tickStep = responsiveTickStep(dates.length, width, pad);
  const ticks = dates.filter((_, index) => index === 0 || index === dates.length - 1 || index % tickStep === 0).map((date) => {
    const index = dates.indexOf(date);
    return `<text class="x-tick" x="${x(index)}" y="${height - 20}" text-anchor="end" transform="rotate(-35 ${x(index)} ${height - 20})">${date.slice(5)}</text>`;
  }).join("");
  const grid = [0, 0.25, 0.5, 0.75, 1].map((step) => {
    const yy = pad.top + step * (height - pad.top - pad.bottom);
    return `<line class="grid-line" x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}" />`;
  }).join("");
  const lines = categories.map((category, lineIndex) => {
    const pointValues = dates.map((date, index) => {
      const row = byKey.get(`${date}||${category}`);
      if (options.missingAsGap && (!row || row[metric] === null || row[metric] === undefined)) return null;
      return `${x(index)},${y(getMetric(row || {}, metric))}`;
    });
    const runs = options.missingAsGap
      ? pointValues.reduce((groups, point) => {
        if (point === null) {
          if (groups[groups.length - 1]?.length) groups.push([]);
        } else {
          groups[groups.length - 1].push(point);
        }
        return groups;
      }, [[]]).filter((group) => group.length)
      : [pointValues];
    return runs.map((points) => `<polyline class="line" style="stroke:${palette[lineIndex % palette.length]}" points="${points.join(" ")}"></polyline>`).join("");
  }).join("");
  el.innerHTML = `
    <div class="dual-legend">
      ${categories.map((category, index) => `<span><i class="legend-dot" style="background:${palette[index % palette.length]}"></i>${escapeHtml(category)}</span>`).join("")}
    </div>
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metricLabels[metric]}分类型趋势">
      <g class="axis">${grid}${ticks}</g>
      ${lines}
    </svg>
  `;
}

function renderChannelProductMix(id, rows) {
  const el = document.getElementById(id);
  if (!el) return;
  const productRows = [...rows]
    .filter((row) => getMetric(row, "channel_units") > 0)
    .sort((a, b) => getMetric(b, "channel_units") - getMetric(a, "channel_units"))
    .slice(0, 10);
  if (!productRows.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有渠道产品销量数据。</p>`;
    return;
  }
  const channelOrder = ["Shopify", "Amazon", "TikTok"];
  const colors = {
    Shopify: "#047857",
    Amazon: "#a16207",
    TikTok: "#2563eb",
  };
  const byProduct = new Map();
  for (const row of rows) {
    const product = row.product_name || "Unknown";
    if (!byProduct.has(product)) {
      byProduct.set(product, { product_name: product, total_units: 0, total_sales: 0, channels: new Map() });
    }
    const item = byProduct.get(product);
    const channel = row.channel || "Unknown";
    const units = getMetric(row, "channel_units");
    const sales = getMetric(row, "channel_sales");
    item.total_units += units;
    item.total_sales += sales;
    const channelItem = item.channels.get(channel) || { units: 0, sales: 0 };
    channelItem.units += units;
    channelItem.sales += sales;
    item.channels.set(channel, channelItem);
  }
  const top = [...byProduct.values()].sort((a, b) => b.total_units - a.total_units).slice(0, 10);
  el.innerHTML = `
    <div class="stacked-legend">
      ${channelOrder.map((channel) => `<span><i style="background:${colors[channel]}"></i>${escapeHtml(channel)}</span>`).join("")}
    </div>
    ${top.map((row) => {
      const segments = channelOrder.map((channel) => {
        const item = row.channels.get(channel) || { units: 0, sales: 0 };
        const share = row.total_units ? item.units / row.total_units : 0;
        if (!share) return "";
        return `<i style="width:${share * 100}%;background:${colors[channel]}" title="${escapeHtml(`${channel}: ${number(item.units)} 件 / ${money(item.sales)}`)}"></i>`;
      }).join("");
      const topChannel = channelOrder
        .map((channel) => ({ channel, ...(row.channels.get(channel) || { units: 0, sales: 0 }) }))
        .sort((a, b) => b.units - a.units)[0];
      return `
        <article class="stacked-bar-row">
          <div class="stacked-bar-head">
            <strong>${escapeHtml(row.product_name)}</strong>
            <span>${number(row.total_units)} 件 / ${money(row.total_sales)}</span>
          </div>
          <div class="stacked-track">${segments}</div>
          <p>主力渠道 ${escapeHtml(topChannel.channel)}，销量占比 ${pct(row.total_units ? topChannel.units / row.total_units : 0)}</p>
        </article>
      `;
    }).join("")}
  `;
}

function efficiencyLabel(row) {
  const roas = getMetric(row, "roas");
  const spend = getMetric(row, "spend");
  const sales = getMetric(row, "purchase_value");
  if (spend > 250 && roas < 1.3) return ["低效复盘", "bad"];
  if (sales > 0 && roas >= 2.2) return ["高效", "good"];
  if (spend > 0 && sales === 0) return ["无转化", "bad"];
  return ["观察", "warn"];
}

function renderTable(id, rows, columns, limit = 80, options = {}) {
  const summaryRows = options.summaryRows || rows;
  DashboardTable.render(document.getElementById(id), rows, columns, {
    ...options,
    limit,
    visibleRowCount: 10,
    summaryRows,
    sort: options.sortGroup ? {
      ...state.googleSort[options.sortGroup],
      group: options.sortGroup,
    } : null,
    escapeHtml,
    getDimensionKey: tableFilterKey,
    dimensionHref: filterHref,
    summarizeRows: tableSummary,
    renderSummaryCell,
  });
  setTableInsight(id, options.insight || tableInsight(id, rows, summaryRows));
}

function setTableInsight(tableId, text) {
  const table = document.getElementById(tableId);
  const wrap = table?.closest(".table-wrap");
  if (!wrap) return;
  let insight = wrap.previousElementSibling;
  if (!insight || !insight.classList.contains("table-insight")) {
    insight = document.createElement("p");
    insight.className = "table-insight";
    wrap.parentElement.insertBefore(insight, wrap);
  }
  insight.innerHTML = text ? escapeHtml(text) : "";
  insight.classList.toggle("hidden", !text);
}

function tableInsight(id, rows, summaryRows = rows) {
  if (!rows.length) return "当前筛选下没有可展示数据。";
  const topBy = (key) => [...rows].sort((a, b) => getMetric(b, key) - getMetric(a, key))[0];
  const lowRoas = [...rows].filter((row) => getMetric(row, "spend") > 200).sort((a, b) => getMetric(a, "roas") - getMetric(b, "roas"))[0];
  const bestRoas = [...rows].filter((row) => getMetric(row, "spend") > 100 && getMetric(row, "purchase_times") > 0).sort((a, b) => getMetric(b, "roas") - getMetric(a, "roas"))[0];
  const summary = tableSummary(summaryRows);
  const label = (row, keys) => keys.map((key) => row?.[key]).filter(Boolean).join(" / ") || "-";
  switch (id) {
    case "regionTable": {
      const top = topBy("purchase_value");
      const gap = [...rows].sort((a, b) => Math.abs(getMetric(b, "sales_share") - getMetric(b, "spend_share")) - Math.abs(getMetric(a, "sales_share") - getMetric(a, "spend_share")))[0];
      return `${label(top, ["region"])} 是当前最大贡献地区，GMV ${money(top.purchase_value)}、ROAS ${ratio(top.roas)}。${gap ? `${label(gap, ["region"])} 的 GMV占比与花费占比差异最大，建议继续下钻国家和产品。` : ""}`;
    }
    case "overviewProductTable": {
      const top = topBy("purchase_value");
      return `重点看 ${label(top, ["product_name"])}，贡献 ${money(top.purchase_value)} GMV、ROAS ${ratio(top.roas)}。${bestRoas ? `当前高效产品是 ${label(bestRoas, ["product_name"])}，ROAS ${ratio(bestRoas.roas)}。` : ""}`;
    }
    case "countryTable": {
      const top = topBy("purchase_value");
      return `${label(top, ["country"])} 是当前最大销售国家，GMV ${money(top.purchase_value)}。${lowRoas ? `需关注 ${label(lowRoas, ["country"])}，花费 ${money(lowRoas.spend)} 但 ROAS ${ratio(lowRoas.roas)}。` : ""}`;
    }
    case "countryProductTable": {
      const top = topBy("purchase_value");
      return `最高贡献组合是 ${label(top, ["country", "product_name"])}，GMV ${money(top.purchase_value)}。优先看对应素材是否可复用到同类国家。`;
    }
    case "countryMaterialTable": {
      const top = topBy("purchase_value");
      return `国家素材组合里，${label(top, ["country", "material_name"])} 贡献最高，GMV ${money(top.purchase_value)}、ROAS ${ratio(top.roas)}。`;
    }
    case "materialComparisonTable": {
      const parents = rows.filter((row) => !row.is_child);
      const topSpend = [...parents].sort((a, b) => getMetric(b, "spend") - getMetric(a, "spend"))[0];
      const topEff = [...parents].filter((row) => getMetric(row, "spend") > 100).sort((a, b) => getMetric(b, "roas") - getMetric(a, "roas"))[0];
      return `${label(topSpend, ["material_label"])} 是主要消耗素材，占花费 ${pct(topSpend?.spend_share)}。${topEff ? `${label(topEff, ["material_label"])} 效率最好，ROAS ${ratio(topEff.roas)}。` : ""}`;
    }
    case "creativeProductTable": {
      const top = topBy("spend");
      return `当前素材筛选下，${label(top, ["product_name"])} 花费最高，为 ${money(top.spend)}。${bestRoas ? `${label(bestRoas, ["product_name"])} ROI 最好，ROI ${ratio(bestRoas.roas)}。` : ""}`;
    }
    case "creativeTable": {
      const top = topBy("spend");
      const riskCount = rows.filter((row) => getMetric(row, "spend") > 100 && getMetric(row, "roas") < 1.3).length;
      return `素材明细按花费排序，首位素材花费 ${money(top.spend)}、ROAS ${ratio(top.roas)}。当前有 ${number(riskCount)} 条高花费低 ROAS 素材需复查。`;
    }
    case "landingTypeTable": {
      const top = topBy("spend");
      const best = [...rows].filter((row) => getMetric(row, "spend") > 100).sort((a, b) => getMetric(b, "roas") - getMetric(a, "roas"))[0];
      return `落地页类型里，${label(top, ["landing_type"])} 是主要消耗，花费占比 ${pct(top?.spend_share)}。${best ? `${label(best, ["landing_type"])} 效率最好，ROAS ${ratio(best.roas)}。` : ""}`;
    }
    case "landingProductTable": {
      const top = topBy("spend");
      return `落地页产品细分里，${label(top, ["landing_type", "product_name"])} 花费最高，为 ${money(top.spend)}，ROAS ${ratio(top.roas)}。`;
    }
    case "landingCountryTable": {
      const top = topBy("spend");
      return `落地页国家细分里，${label(top, ["landing_type", "country"])} 花费最高，为 ${money(top.spend)}，ROAS ${ratio(top.roas)}。`;
    }
    case "landingMaterialTable": {
      const top = topBy("purchase_value");
      return `落地页素材中，${label(top, ["landing_type", "material_name"])} 贡献最高，GMV ${money(top.purchase_value)}、ROAS ${ratio(top.roas)}。`;
    }
    case "usChannelProductTable": {
      const top = topBy("channel_sales");
      const topUnit = topBy("channel_units");
      return `${channelMarketLabel()}多渠道里，${label(top, ["channel", "product_name"])} 原始销售额最高，为 ${channelMoney(top.channel_sales, top)}。销量最高是 ${label(topUnit, ["channel", "product_name"])}，共 ${number(topUnit.channel_units)} 件。`;
    }
    case "usChannelSummaryTable": {
      const top = topBy("channel_sales");
      const topUnit = topBy("channel_units");
      return `当前渠道原始销售额最高是 ${label(top, ["channel"])}，销售额 ${channelMoney(top.channel_sales, top)}；销量最高是 ${label(topUnit, ["channel"])}，共 ${number(topUnit.channel_units)} 件。`;
    }
    default:
      return "";
  }
}

function compareKey(row, dims) {
  return dims.map((dim) => row[dim] ?? "Unknown").join("||");
}

function addComparison(rows, previousRows, dims) {
  const previousMap = new Map(aggregate(previousRows, dims).map((row) => [compareKey(row, dims), row]));
  return rows.map((row) => {
    const previous = previousMap.get(compareKey(row, dims)) || baseSummary();
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

function addShareDeltas(rows, previousRows, dims) {
  const previousMap = new Map(previousRows.map((row) => [compareKey(row, dims), row]));
  const totalSpend = rows.reduce((sum, row) => sum + getMetric(row, "spend"), 0);
  const totalSales = rows.reduce((sum, row) => sum + getMetric(row, "purchase_value"), 0);
  const previousTotalSpend = previousRows.reduce((sum, row) => sum + getMetric(row, "spend"), 0);
  const previousTotalSales = previousRows.reduce((sum, row) => sum + getMetric(row, "purchase_value"), 0);
  return rows.map((row) => {
    const previous = previousMap.get(compareKey(row, dims)) || baseSummary();
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
    };
  });
}

function deltaBadge(delta, inverse = false) {
  const cls = inverse && delta.cls !== "flat" ? (delta.cls === "up" ? "down" : "up") : delta.cls;
  return `<span class="${escapeHtml(cls)}">${escapeHtml(delta.text)}</span>`;
}

function metricStack(valueHtml, deltaHtml) {
  return `<span class="metric-stack"><strong>${valueHtml}</strong><small>${deltaHtml}</small></span>`;
}

function metricWithDelta(row, key, formatter, deltaKey, inverse = false) {
  return metricStack(formatter(row[key]), deltaBadge(row[deltaKey], inverse));
}

function metaAovColumn(options = {}) {
  const key = options.key || "aov";
  const deltaKey = options.deltaKey || "aov_delta";
  return {
    key,
    label: options.label || "Meta AOV",
    value: (row) => row,
    format: (row) => options.showDelta === false
      ? money(row[key])
      : metricWithDelta(row, key, money, deltaKey),
    summaryKey: key,
    summaryFormat: money,
    num: true,
  };
}

function tableSummary(rows) {
  const summary = {};
  const sumKeys = [
    "spend",
    "impressions",
    "reach",
    "clicks",
    "purchase_times",
    "purchase_value",
    "meta_purchase_value",
    "meta_purchase_times",
    "shopify_orders",
    "shopify_net_items_sold",
    "shopify_sales",
    "shopify_net_sales",
    "orders",
    "channel_units",
    "channel_sales",
    "net_items_sold",
    "gross_sales",
    "discounts",
    "returns",
    "net_sales",
    "taxes",
    "conversions",
    "platform_gmv",
    "sales_gap",
    "country_count",
    "material_count",
  ];
  for (const key of sumKeys) {
    summary[key] = rows.reduce((sum, row) => sum + getMetric(row, key), 0);
  }
  summary.roas = summary.spend ? summary.purchase_value / summary.spend : 0;
  summary.meta_roas = summary.spend ? summary.meta_purchase_value / summary.spend : 0;
  summary.onsite_roas = summary.spend ? summary.shopify_sales / summary.spend : 0;
  summary.cpa = summary.purchase_times ? summary.spend / summary.purchase_times : 0;
  summary.google_roas = summary.spend ? summary.platform_gmv / summary.spend : null;
  summary.google_cpa = summary.conversions ? summary.spend / summary.conversions : null;
  summary.google_ctr = summary.impressions ? summary.clicks / summary.impressions : null;
  summary.google_cvr = summary.clicks ? summary.conversions / summary.clicks : null;
  summary.ctr = summary.impressions ? summary.clicks / summary.impressions : 0;
  summary.cvr = summary.clicks ? summary.purchase_times / summary.clicks : 0;
  summary.cpm = summary.impressions ? (summary.spend / summary.impressions) * 1000 : 0;
  summary.aov = DashboardMetrics.calculateAovFromRows(rows)
    || DashboardMetrics.calculateAovFromRows(rows, "net_sales", "orders");
  summary.meta_aov = DashboardMetrics.calculateAovFromRows(rows, "meta_purchase_value", "meta_purchase_times");
  summary.unit_value = summary.channel_units ? summary.channel_sales / summary.channel_units : 0;
  summary.shopify_aov = summary.shopify_orders ? summary.shopify_sales / summary.shopify_orders : 0;
  summary.gmv_share = rows.reduce((sum, row) => sum + getMetric(row, "gmv_share"), 0) || (summary.purchase_value ? 1 : 0);
  summary.spend_share = rows.reduce((sum, row) => sum + getMetric(row, "spend_share"), 0) || (summary.spend ? 1 : 0);
  summary.sales_share = rows.reduce((sum, row) => sum + getMetric(row, "sales_share"), 0);
  summary.shopify_sales_share = rows.reduce((sum, row) => sum + getMetric(row, "shopify_sales_share"), 0) || (summary.shopify_sales ? 1 : 0);
  summary.meta_spend_share = rows.reduce((sum, row) => sum + getMetric(row, "meta_spend_share"), 0) || (summary.spend ? 1 : 0);
  summary.share_gap = summary.shopify_sales_share - summary.meta_spend_share;
  summary.efficiency_index = summary.meta_spend_share ? summary.shopify_sales_share / summary.meta_spend_share : 0;
  return summary;
}

function renderSummaryCell(col, summary, index, previousSummary = null) {
  const dataLabel = escapeHtml(col.label);
  if (index === 0) return `<td data-label="${dataLabel}" class="summary-label ${col.sticky ? "sticky-col" : ""}">合计</td>`;
  if (col.summary === false || col.filterKey || col.name) return `<td data-label="${dataLabel}"></td>`;
  const summaryKey = col.summaryKey || col.key;
  const raw = col.summaryValue ? col.summaryValue(summary) : summary[summaryKey];
  if (raw === undefined || raw === null || raw === "") return `<td data-label="${dataLabel}"></td>`;
  const val = col.summaryFormat
    ? (col.summaryFormat.length > 1 ? col.summaryFormat(raw, summary) : col.summaryFormat(raw))
    : (col.format ? (col.format.length > 1 ? col.format(raw, summary) : col.format(raw)) : escapeHtml(raw));
  const previousRaw = previousSummary
    ? (col.summaryValue ? col.summaryValue(previousSummary) : previousSummary[summaryKey])
    : null;
  const shouldShowDelta = col.num && col.summaryDelta !== false && previousRaw !== undefined && previousRaw !== null && previousRaw !== "";
  const content = shouldShowDelta
    ? metricStack(val, deltaBadge(deltaText(Number(raw || 0), Number(previousRaw || 0)), col.summaryInverse || false))
    : val;
  return `<td data-label="${dataLabel}" class="${col.num ? "num" : ""} ${col.sticky ? "sticky-col" : ""}">${content}</td>`;
}

function applyContentFilter(key, value) {
  if (key === "region") {
    state.countryRegion = state.countryRegion === value ? "ALL" : value;
    state.country = state.countryRegion === "ALL" ? [] : countriesForRegion(value);
    syncMultiSelection("country");
    render();
    return;
  }
  const mapping = {
    country: "country",
    product_name: state.view === "channels" ? "channelProduct" : "product",
    standard_product_name: state.view === "channels" ? "channelProduct" : "product",
    product_form: "productForm",
    channel: "channel",
    operator: "operator",
    account_name: "account",
    landing_type: "landingType",
    material_type: "materialType",
    video_source: "videoSource",
    video_subtype: "videoSubtype",
    material_name: "materialName",
    ad_name: "adName",
    googleAdTypes: "googleAdTypes",
    googleProducts: "googleProducts",
    googleCountries: "googleCountries",
  };
  const stateKey = mapping[key];
  if (!stateKey || !value) return;
  if (stateKey === "country") state.countryRegion = "ALL";
  state[stateKey] = [value];
  syncMultiSelection(stateKey);
  if (stateKey.startsWith("google")) {
    renderGoogleAttributionDetail();
    return;
  }
  render();
}

function bindContentFilters() {}

function preserveScroll(callback) {
  const x = window.scrollX;
  const y = window.scrollY;
  callback();
  requestAnimationFrame(() => window.scrollTo(x, y));
}

function hierarchyLabel(row) {
  const chevron = row._expandable
    ? `<span class="tree-chevron" aria-hidden="true">${row._expanded ? "⌄" : "›"}</span>`
    : '<span class="tree-chevron tree-leaf" aria-hidden="true"></span>';
  return `<button type="button" class="tree-node depth-${row._depth}"
    data-tree-node="${row._nodeType}"
    data-tree-value="${escapeHtml(row._nodeValue)}"
    data-tree-parent="${escapeHtml(row._parentValue || "")}"
    aria-expanded="${row._expandable ? String(row._expanded) : "false"}">
    ${chevron}<span>${escapeHtml(row._nodeValue || "未分类")}</span>
  </button>`;
}

function toggleCreativeHierarchy(nodeType, nodeValue, parentValue = "") {
  if (nodeType === "material_type" && nodeValue === "视频") {
    state.creativeExpandedType = state.creativeExpandedType === "视频" ? "" : "视频";
    if (!state.creativeExpandedType) state.creativeExpandedSources.splice(0);
    return;
  }
  if (nodeType === "video_source") {
    const index = state.creativeExpandedSources.indexOf(nodeValue);
    if (index === -1) state.creativeExpandedSources.push(nodeValue);
    else state.creativeExpandedSources.splice(index, 1);
    return;
  }
  const materialType = nodeType === "material_type" ? nodeValue : "视频";
  const hasVideoSubtype = nodeType === "video_subtype";
  const videoSource = hasVideoSubtype ? parentValue : "";
  const videoSubtype = hasVideoSubtype ? nodeValue : "";
  const selected = state.materialType.length === 1
    && state.materialType[0] === materialType
    && state.videoSource.length === (hasVideoSubtype ? 1 : 0)
    && (!hasVideoSubtype || state.videoSource[0] === videoSource)
    && state.videoSubtype.length === (hasVideoSubtype ? 1 : 0)
    && (!hasVideoSubtype || state.videoSubtype[0] === videoSubtype);
  state.materialType.splice(0);
  state.videoSource.splice(0);
  state.videoSubtype.splice(0);
  if (!selected) {
    state.materialType.push(materialType);
    if (hasVideoSubtype) {
      state.videoSource.push(videoSource);
      state.videoSubtype.push(videoSubtype);
    }
  }
}

function toggleCountryHierarchy(nodeType, nodeValue, parentValue = "") {
  state.countryRegion = "ALL";
  if (nodeType === "region") {
    const closing = state.expandedRegions.includes(nodeValue);
    const index = state.expandedRegions.indexOf(nodeValue);
    if (closing) state.expandedRegions.splice(index, 1);
    else state.expandedRegions.push(nodeValue);
    if (closing && state.country.some((country) => countryRegion(country) === nodeValue)) {
      state.country.splice(0);
    }
    return;
  }
  const selected = state.country.length === 1 && state.country[0] === nodeValue;
  state.country.splice(0);
  if (!selected) state.country.push(nodeValue);
  if (!state.expandedRegions.includes(parentValue)) {
    state.expandedRegions.push(parentValue);
  }
}

function renderDrilldownBreadcrumb(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = items.map((item, index) => `${index ? '<span aria-hidden="true">›</span>' : ""}
    <button type="button" data-drilldown-kind="${escapeHtml(item.kind)}" data-drilldown-level="${escapeHtml(item.level)}">${escapeHtml(item.label)}</button>`).join("");
}

function renderCreativeDrilldownBreadcrumb() {
  const items = [];
  if (state.materialType.length) items.push({ kind: "creative", level: "type", label: state.materialType[0] });
  if (state.videoSource.length) items.push({ kind: "creative", level: "source", label: state.videoSource[0] || "未分类来源" });
  if (state.videoSubtype.length) items.push({ kind: "creative", level: "subtype", label: state.videoSubtype[0] || "未分类细分" });
  renderDrilldownBreadcrumb("creativeDrilldownBreadcrumb", items);
}

function renderCountryDrilldownBreadcrumb() {
  const items = state.country.map((country) => ({ kind: "country", level: "country", label: country }));
  renderDrilldownBreadcrumb("countryDrilldownBreadcrumb", items);
}

function clearCreativeDrilldown(level) {
  if (level === "type") {
    state.materialType = [];
    state.videoSource = [];
    state.videoSubtype = [];
    state.creativeExpandedType = "";
    state.creativeExpandedSources = [];
  } else if (level === "source") {
    state.videoSource = [];
    state.videoSubtype = [];
    state.creativeExpandedSources = [];
  } else {
    state.videoSubtype = [];
  }
}

function clearCountryDrilldown(level) {
  if (level === "country") state.country = [];
}

function renderContextFilters() {
  const accounts = accountOptionsForView();
  state.account = state.account.filter((value) => accounts.includes(value));
  setMultiOptions("account", accounts, state.account);
  if (state.view === "channels" || state.view === "attribution") {
    const options = channelOptionsForView();
    state.channel = state.channel.filter((value) => options.includes(value));
    setMultiOptions("channel", options, state.channel);
  }
  let visibleCount = 0;
  const hiddenActive = [];
  document.querySelectorAll(".context-filterbar .multi-select").forEach((el) => {
    const views = (el.dataset.views || "").split(",");
    const isVisible = views.includes(state.view);
    const key = el.dataset.filter;
    if (!isVisible && state[key]?.length) hiddenActive.push(el.querySelector(".filter-label")?.textContent || key);
    if (isVisible) visibleCount += 1;
    el.classList.toggle("hidden", !isVisible);
    if (!isVisible) el.classList.remove("open");
  });
  [
    ["productForm", "单品/套组"],
    ["materialName", "素材"],
    ["adName", "Ad name"],
  ].forEach(([key, labelText]) => {
    if (state[key]?.length) hiddenActive.push(labelText);
  });
  const note = document.getElementById("activeFilterNote");
  note.textContent = hiddenActive.length ? `当前还有隐藏筛选：${hiddenActive.join("、")}` : "";
  note.classList.toggle("hidden", !hiddenActive.length);
  const bar = document.querySelector(".context-filterbar");
  bar.classList.toggle("hidden", visibleCount === 0 && hiddenActive.length === 0);
}

function topCreativeText(rows) {
  const creatives = aggregate(rows.map((row) => ({ ...row, material_name: materialName(row) })), ["material_name"]).sort((a, b) => b.spend - a.spend).slice(0, 3);
  return creatives.length
    ? creatives.map((row, index) => `<div class="creative-line">${index + 1}. ${escapeHtml(row.material_name)}</div>`).join("")
    : "-";
}

function buildCountryProductCreativeRows(factRows) {
  const groups = aggregate(factRows, ["country", "product_name"]).sort((a, b) => b.purchase_value - a.purchase_value);
  const creativeSource = filteredRows(data.ads || []);
  return groups.slice(0, 100).map((group) => {
    const related = creativeSource.filter((row) => row.country === group.country && row.product_name === group.product_name);
    return { ...group, top_creatives: topCreativeText(related) };
  });
}

function buildCountryMaterialRows(factRows, previousRows) {
  const current = factRows.map((row) => ({ ...row, material_name: materialName(row) }));
  const previous = previousRows.map((row) => ({ ...row, material_name: materialName(row) }));
  return addComparison(aggregate(current, ["country", "material_name"]), previous, ["country", "material_name"])
    .filter((row) => row.spend > 0 || row.purchase_value > 0)
    .sort((a, b) => b.purchase_value - a.purchase_value);
}

function materialComparisonRows(factRows, previousRows, inventoryRows = [], previousInventoryRows = []) {
  const currentTotal = aggregate(factRows)[0] || deriveMetrics({ spend: 0, impressions: 0, clicks: 0, purchase_times: 0, purchase_value: 0 });
  const countMaterials = (rows, def) => new Set(rows
    .filter((row) => row.material_type === def.material_type && (!def.video_source || row.video_source === def.video_source))
    .map(materialIdentity)
    .filter(Boolean)).size;
  const rowDefs = [
    { label: "图文", material_type: "图文", video_source: "", rows: factRows.filter((row) => row.material_type === "图文"), previous: previousRows.filter((row) => row.material_type === "图文") },
    { label: "视频汇总", material_type: "视频", video_source: "", rows: factRows.filter((row) => row.material_type === "视频"), previous: previousRows.filter((row) => row.material_type === "视频") },
    { label: "自产素材", material_type: "视频", video_source: "自产素材", child: true, rows: factRows.filter((row) => row.material_type === "视频" && row.video_source === "自产素材"), previous: previousRows.filter((row) => row.material_type === "视频" && row.video_source === "自产素材") },
    { label: "TT搬运", material_type: "视频", video_source: "TT搬运", child: true, rows: factRows.filter((row) => row.material_type === "视频" && row.video_source === "TT搬运"), previous: previousRows.filter((row) => row.material_type === "视频" && row.video_source === "TT搬运") },
    { label: "合创", material_type: "合创", video_source: "", rows: factRows.filter((row) => row.material_type === "合创"), previous: previousRows.filter((row) => row.material_type === "合创") },
  ];
  return rowDefs.map((def) => {
    const current = aggregate(def.rows)[0] || deriveMetrics({ spend: 0, impressions: 0, clicks: 0, purchase_times: 0, purchase_value: 0 });
    const previous = aggregate(def.previous)[0] || deriveMetrics({ spend: 0, impressions: 0, clicks: 0, purchase_times: 0, purchase_value: 0 });
    const materialCount = countMaterials(inventoryRows, def);
    const previousMaterialCount = countMaterials(previousInventoryRows, def);
    return {
      ...current,
      _rowClass: def.child ? "material-child-row" : "",
      is_child: Boolean(def.child),
      material_label: def.label,
      material_type: def.material_type,
      video_source: def.video_source,
      material_count: materialCount,
      material_count_delta: deltaText(materialCount, previousMaterialCount),
      spend_share: currentTotal.spend ? current.spend / currentTotal.spend : 0,
      sales_share: currentTotal.purchase_value ? current.purchase_value / currentTotal.purchase_value : 0,
      spend_delta: deltaText(current.spend, previous.spend),
      sales_delta: deltaText(current.purchase_value, previous.purchase_value),
      conversion_delta: deltaText(current.purchase_times, previous.purchase_times),
      aov_delta: deltaText(current.aov, previous.aov),
      roas_delta: deltaText(current.roas, previous.roas),
      cpa_delta: deltaText(current.cpa, previous.cpa),
      ctr_delta: deltaText(current.ctr, previous.ctr),
      cvr_delta: deltaText(current.cvr, previous.cvr),
    };
  }).filter((row) => row.spend > 0 || row.purchase_value > 0 || row.purchase_times > 0);
}

function renderAlerts(fact) {
  const byProduct = aggregate(fact, ["product_name", "country"]).filter((row) => row.spend > 300);
  const highSpendLowRoas = [...byProduct].sort((a, b) => (b.spend * (1.5 - b.roas)) - (a.spend * (1.5 - a.roas))).find((row) => row.roas < 1.5);
  const highCtrWeakConversion = aggregate(fact, ["product_name", "country"]).filter((row) => row.spend > 200).sort((a, b) => b.ctr - a.ctr).find((row) => row.ctr > 0.025 && row.roas < 1.8);
  const topCpa = [...byProduct].sort((a, b) => b.cpa - a.cpa).find((row) => row.purchase_times >= 3);
  const alerts = [
    highSpendLowRoas && [`高花费低 ROAS`, `${highSpendLowRoas.country} / ${highSpendLowRoas.product_name}，花费 ${money(highSpendLowRoas.spend)}，ROAS ${ratio(highSpendLowRoas.roas)}`],
    highCtrWeakConversion && [`高 CTR 转化弱`, `${highCtrWeakConversion.country} / ${highCtrWeakConversion.product_name}，CTR ${pct(highCtrWeakConversion.ctr)}，ROAS ${ratio(highCtrWeakConversion.roas)}`],
    topCpa && [`CPA 风险`, `${topCpa.country} / ${topCpa.product_name}，CPA ${money(topCpa.cpa)}，转化 ${number(topCpa.purchase_times)}`],
  ].filter(Boolean);
  document.getElementById("alertsList").innerHTML = alerts.length ? alerts.map(([title, body]) => `
    <article class="alert-item">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(body)}</span>
    </article>
  `).join("") : `<p class="empty">当前筛选下没有明显异常。</p>`;
}

function renderLandingInsights(rows) {
  const landingRows = aggregate(rows, ["landing_type"]).filter((row) => row.spend > 100).sort((a, b) => b.spend - a.spend);
  const best = [...landingRows].filter((row) => row.purchase_times > 0).sort((a, b) => b.roas - a.roas)[0];
  const topSpend = landingRows[0];
  const risk = [...landingRows].filter((row) => row.spend > 300 && row.roas < 1.5).sort((a, b) => b.spend - a.spend)[0];
  document.getElementById("landingInsights").innerHTML = [
    topSpend && `<article class="alert-item good-alert"><strong>主要承接</strong><span>${escapeHtml(topSpend.landing_type)} 花费 ${money(topSpend.spend)}，ROAS ${ratio(topSpend.roas)}</span></article>`,
    best && `<article class="alert-item good-alert"><strong>高效承接</strong><span>${escapeHtml(best.landing_type)} ROAS ${ratio(best.roas)}，转化 ${number(best.purchase_times)}</span></article>`,
    risk && `<article class="alert-item"><strong>承接风险</strong><span>${escapeHtml(risk.landing_type)} 花费 ${money(risk.spend)}，ROAS ${ratio(risk.roas)}</span></article>`,
  ].filter(Boolean).join("") || `<p class="empty">当前筛选下没有落地页数据。</p>`;
}

function joinedOnsiteRows(factRows, shopifyRows, dims) {
  const metaRows = aggregate(factRows, dims);
  const shopRows = shopifyAggregate(shopifyRows, dims);
  const joined = new Map();
  for (const row of metaRows) {
    const key = compareKey(row, dims);
    joined.set(key, { ...Object.fromEntries(dims.map((dim) => [dim, row[dim]])), meta: row, shopify: null });
  }
  for (const row of shopRows) {
    const key = compareKey(row, dims);
    if (!joined.has(key)) {
      joined.set(key, { ...Object.fromEntries(dims.map((dim) => [dim, row[dim]])), meta: baseSummary(), shopify: row });
    } else {
      joined.get(key).shopify = row;
    }
  }
  return [...joined.values()].map((item) => {
    const meta = item.meta || baseSummary();
    const shopify = item.shopify || {};
    const shopifySales = getMetric(shopify, "net_sales");
    const metaSales = getMetric(meta, "purchase_value");
    const spend = getMetric(meta, "spend");
    return {
      ...item,
      spend,
      meta_purchase_value: metaSales,
      meta_purchase_times: getMetric(meta, "purchase_times"),
      meta_aov: DashboardMetrics.calculateAov(metaSales, getMetric(meta, "purchase_times")),
      meta_roas: getMetric(meta, "roas"),
      shopify_orders: getMetric(shopify, "orders"),
      shopify_net_items_sold: getMetric(shopify, "net_items_sold"),
      shopify_sales: shopifySales,
      shopify_net_sales: getMetric(shopify, "net_sales"),
      shopify_aov: getMetric(shopify, "aov"),
      onsite_roas: spend ? shopifySales / spend : 0,
      sales_gap: shopifySales - metaSales,
      sales_gap_rate: metaSales ? (shopifySales - metaSales) / metaSales : 0,
    };
  });
}

function addOnsiteShareMetrics(rows) {
  const totalSpend = rows.reduce((sum, row) => sum + getMetric(row, "spend"), 0);
  const totalShopifySales = rows.reduce((sum, row) => sum + getMetric(row, "shopify_sales"), 0);
  return rows.map((row) => {
    const metaSpendShare = totalSpend ? getMetric(row, "spend") / totalSpend : 0;
    const shopifySalesShare = totalShopifySales ? getMetric(row, "shopify_sales") / totalShopifySales : 0;
    return {
      ...row,
      meta_spend_share: metaSpendShare,
      shopify_sales_share: shopifySalesShare,
      share_gap: shopifySalesShare - metaSpendShare,
      efficiency_index: metaSpendShare ? shopifySalesShare / metaSpendShare : (shopifySalesShare ? 99 : 0),
    };
  });
}

function onsiteStatus(row) {
  if (row.meta_spend_share > 0.005 && row.efficiency_index >= 1.2 && row.onsite_roas >= 1.8) return "高效可加";
  if (row.meta_spend_share > 0.01 && row.efficiency_index <= 0.75) return "投放偏重";
  if (row.shopify_sales_share > 0.01 && row.meta_spend_share < row.shopify_sales_share * 0.5) return "站内强广告弱";
  if (row.spend > 200 && row.onsite_roas >= 2.2 && row.shopify_sales >= row.meta_purchase_value) return "可加码";
  if (row.spend > 200 && row.onsite_roas < 1.4) return "承接弱";
  if (row.meta_purchase_value > 500 && row.shopify_sales < row.meta_purchase_value * 0.5) return "Meta高于站内";
  return "观察";
}

function unmatchedShopifyProducts(shopifyRows) {
  const map = new Map();
  for (const row of shopifyRows) {
    if (row.product_name !== "未匹配") continue;
    const key = row.product_title || "Unknown";
    if (!map.has(key)) {
      map.set(key, {
        product_title: key,
        country_count: new Set(),
        orders: 0,
        net_items_sold: 0,
        net_sales: 0,
        total_sales: 0,
      });
    }
    const item = map.get(key);
    item.country_count.add(row.country);
    item.orders += getMetric(row, "orders");
    item.net_items_sold += getMetric(row, "net_items_sold");
    item.net_sales += getMetric(row, "net_sales");
    item.total_sales += getMetric(row, "total_sales");
  }
  return [...map.values()].map((row) => ({ ...row, country_count: row.country_count.size })).sort((a, b) => b.net_sales - a.net_sales);
}

function rawShopifyProductRows(shopifyRows) {
  const rows = shopifyAggregate(shopifyRows, ["country", "product_title", "product_name"]);
  const totalSales = rows.reduce((sum, row) => sum + getMetric(row, "net_sales"), 0);
  return rows
    .map((row) => ({
      ...row,
      sales_share: totalSales ? getMetric(row, "net_sales") / totalSales : 0,
    }))
    .sort((a, b) => b.net_sales - a.net_sales);
}

function productOverviewRows(factRows, previousFactRows, shopifyRows, previousShopifyRows) {
  const rows = addOnsiteShareMetrics(joinedOnsiteRows(factRows, shopifyRows, ["product_name"]));
  const previousRows = new Map(
    joinedOnsiteRows(previousFactRows, previousShopifyRows, ["product_name"])
      .map((row) => [row.product_name || "Unknown", row])
  );
  return rows
    .filter((row) => row.spend > 0 || row.shopify_sales > 0 || row.meta_purchase_value > 0)
    .map((row) => {
      const previous = previousRows.get(row.product_name || "Unknown") || {};
      return {
        ...row,
        shopify_sales_delta: deltaText(row.shopify_sales, previous.shopify_sales),
        spend_delta: deltaText(row.spend, previous.spend),
        meta_aov_delta: deltaText(row.meta_aov, previous.meta_aov),
        onsite_roas_delta: deltaText(row.onsite_roas, previous.onsite_roas),
      };
    })
    .sort((a, b) => (b.shopify_sales + b.spend) - (a.shopify_sales + a.spend));
}

function metaProductRows(factRows, previousFactRows) {
  const totalGmv = factRows.reduce((sum, row) => sum + getMetric(row, "purchase_value"), 0);
  return addComparison(aggregate(factRows, ["product_name"]), previousFactRows, ["product_name"])
    .filter((row) => row.spend > 0 || row.purchase_value > 0)
    .map((row) => ({
      ...row,
      gmv_share: totalGmv ? row.purchase_value / totalGmv : 0,
    }))
    .sort((a, b) => b.purchase_value - a.purchase_value);
}

function productAnalysisRows(currentRows, previousRows, dims, sortKey = "purchase_value") {
  const currentAgg = aggregate(currentRows, dims);
  const previousAgg = aggregate(previousRows, dims);
  return addShareDeltas(addComparison(currentAgg, previousRows, dims), previousAgg, dims)
    .filter((row) => row.spend > 0 || row.purchase_value > 0 || row.purchase_times > 0)
    .sort((a, b) => getMetric(b, sortKey) - getMetric(a, sortKey));
}

function renderProductPage(productModel) {
  const segmentMeta = {
    overall: { label: "整体表现", dimensionLabel: "产品名称" },
    form: { label: "单品套组", dimensionLabel: "单品/套组" },
    material: { label: "素材组合", dimensionLabel: "素材类型" },
  }[productModel.segment];
  DashboardSegments.render(
    document.getElementById("productSegmentControl"),
    [
      { value: "overall", label: "整体表现" },
      { value: "form", label: "单品套组" },
      { value: "material", label: "素材组合" },
    ],
    state.productSegment,
    (segment) => {
      if (segment === state.productSegment) return;
      state.productSegment = segment;
      preserveScroll(render);
    },
  );

  document.getElementById("productTrendTitle").textContent = `${segmentMeta.label}趋势`;
  document.getElementById("productStructureTitle").textContent = `${segmentMeta.label}结构`;
  document.getElementById("productDetailTitle").textContent = `${segmentMeta.label}明细`;
  renderLineChart("productTrend", productModel.trend, "purchase_value");
  renderTrendConclusion("productTrendConclusion", productModel.trend, "purchase_value");
  renderShareCompareBars("productSegmentStructure", productModel.structure, productModel.dimension, { limit: 8 });
  renderHeatmap("productCountryHeatmap", productModel.country, "standard_product_name", "country", { xLimit: 5, yLimit: 6 });

  const leadingColumns = [
    { key: "standard_product_name", label: "产品名称", sticky: true, filterKey: "standard_product_name", format: (value) => `<span class="tag">${escapeHtml(value)}</span>` },
  ];
  if (productModel.segment !== "overall") {
    leadingColumns.push({
      key: productModel.dimension,
      label: segmentMeta.dimensionLabel,
      filterKey: productModel.dimension,
      format: (value) => `<span class="tag ${productModel.segment === "material" ? "material-tag" : ""}">${escapeHtml(value || "未分类")}</span>`,
    });
  }
  const metricColumns = [
    { key: "purchase_value", label: "归因收入", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "sales_share", label: "GMV占比", value: (row) => row, format: (row) => metricWithDelta(row, "sales_share", pct, "sales_share_delta"), summaryValue: (row) => row.sales_share, summaryFormat: pct, summaryDelta: false, num: true },
    { key: "spend", label: "广告花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    metaAovColumn(),
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", value: (row) => row, format: (row) => metricWithDelta(row, "cpa", money, "cpa_delta", true), summaryValue: (row) => row.cpa, summaryFormat: money, num: true },
    { key: "ctr", label: "CTR", value: (row) => row, format: (row) => metricWithDelta(row, "ctr", pct, "ctr_delta"), summaryValue: (row) => row.ctr, summaryFormat: pct, num: true },
    { key: "cvr", label: "CVR", value: (row) => row, format: (row) => metricWithDelta(row, "cvr", pct, "cvr_delta"), summaryValue: (row) => row.cvr, summaryFormat: pct, num: true },
  ];
  const best = productModel.detail[0];
  document.getElementById("productTableConclusion").textContent = best
    ? `${best.standard_product_name} 当前归因收入最高，为 ${money(best.purchase_value)}，ROAS ${ratio(best.roas)}。`
    : "当前筛选下暂无产品数据。";
  renderTable("productSegmentTable", productModel.detail, [...leadingColumns, ...metricColumns], Number.POSITIVE_INFINITY, {
    previousSummaryRows: productModel.previousDetail,
  });
}

function addChannelComparison(rows, previousRows) {
  const totalSales = rows.reduce((sum, row) => sum + getMetric(row, "channel_sales"), 0);
  const previousMap = new Map(previousRows.map((row) => [`${row.channel}||${row.product_name}`, row]));
  return rows.map((row) => {
    const previous = previousMap.get(`${row.channel}||${row.product_name}`) || {};
    return {
      ...row,
      sales_share: totalSales ? getMetric(row, "channel_sales") / totalSales : 0,
      sales_delta: deltaText(row.channel_sales, previous.channel_sales),
      units_delta: deltaText(row.channel_units, previous.channel_units),
      unit_value_delta: deltaText(row.unit_value, previous.unit_value),
    };
  });
}

function renderChannelScopeControls() {
  const marketControl = document.getElementById("channelMarketControl");
  const countryFilters = document.getElementById("channelCountryFilters");
  if (!marketControl || !countryFilters) return;

  DashboardSegments.render(marketControl, [
    { value: "US", label: "美国" },
    { value: "NON_US", label: "非美国" },
  ], state.channelMarket, (value) => {
    if (value === state.channelMarket) return;
    state.channelMarket = value;
    preserveScroll(render);
  });
  countryFilters.hidden = state.channelMarket !== "NON_US";
  if (countryFilters.hidden) {
    countryFilters.innerHTML = "";
    return;
  }

  countryFilters.innerHTML = `
    <div class="multi-select" data-filter="channelCountries">
      <span class="filter-label">国家</span>
      <button type="button" class="multi-trigger" id="channelCountriesFilterButton" aria-expanded="false">全部</button>
      <div class="multi-panel" id="channelCountriesFilterPanel"></div>
    </div>
  `;
  setMultiOptions(
    "channelCountries",
    NON_US_COMPARABLE_COUNTRIES,
    state.channelCountries.length ? state.channelCountries : NON_US_COMPARABLE_COUNTRIES
  );
}

function resetChannelCountryFilters() {
  state.channelCountries = [];
  renderChannelScopeControls();
}

function renderChannels() {
  renderChannelScopeControls();
  document.getElementById("channelTrendTitle").textContent = channelTrendTitle();
  const currentRows = filteredChannelRows();
  const previousRows = comparisonChannelRows();
  const channelDailyRows = channelAggregate(currentRows, ["date_start", "channel"])
    .sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)) || String(a.channel).localeCompare(String(b.channel)));
  renderChannelLineChart("usChannelTrend", channelDailyRows);
  renderChannelConclusion(channelDailyRows);

  const previousSummaryRows = channelAggregate(previousRows, ["channel"]);
  const channelSummaryRows = addChannelComparison(
    channelAggregate(currentRows, ["channel"]).sort((a, b) => b.channel_sales - a.channel_sales),
    previousSummaryRows
  );
  renderTable("usChannelSummaryTable", channelSummaryRows, [
    { key: "channel", label: "渠道", sticky: true, filterKey: "channel" },
    { key: "channel_units", label: "销量", value: (row) => row, format: (row) => metricWithDelta(row, "channel_units", number, "units_delta"), summaryValue: (row) => row.channel_units, summaryFormat: number, num: true },
    { key: "channel_sales", label: "销售额(原始)", value: (row) => row, format: (row) => metricWithDelta(row, "channel_sales", (value) => channelMoney(value, row), "sales_delta"), summary: false, num: true },
    { key: "unit_value", label: "件单价(原始)", value: (row) => row, format: (row) => metricWithDelta(row, "unit_value", (value) => channelMoney(value, row), "unit_value_delta"), summary: false, num: true },
  ], 20, { previousSummaryRows });

  const previousProductRows = channelAggregate(previousRows, ["channel", "sku_code", "product_name"]);
  const channelProductRows = addChannelComparison(
    channelAggregate(currentRows, ["channel", "sku_code", "product_name"]),
    previousProductRows
  ).sort((a, b) => b.channel_units - a.channel_units || b.channel_sales - a.channel_sales);
  renderChannelProductMix("usChannelProductMix", channelProductRows);
  renderBars("usChannelProductBars", channelAggregate(currentRows, ["sku_code", "product_name"]).sort((a, b) => b.channel_units - a.channel_units), "product_name", "channel_units", 10, {
    subText: (row) => `销售额 ${channelMoney(row.channel_sales, row)} / 件单价 ${channelMoney(row.unit_value, row)}`,
  });
  document.getElementById("usChannelProductTable")?.closest(".table-wrap")?.classList.add("channel-detail-scroll");
  renderTable("usChannelProductTable", channelProductRows, [
    { key: "channel", label: "渠道", sticky: true, filterKey: "channel" },
    { key: "sku_code", label: "SKU", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "product_name", label: "产品", filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "channel_units", label: "销量", value: (row) => row, format: (row) => metricWithDelta(row, "channel_units", number, "units_delta"), summaryValue: (row) => row.channel_units, summaryFormat: number, num: true },
    { key: "channel_sales", label: "销售额(原始)", value: (row) => row, format: (row) => metricWithDelta(row, "channel_sales", (value) => channelMoney(value, row), "sales_delta"), summary: false, num: true },
    { key: "unit_value", label: "件单价(原始)", value: (row) => row, format: (row) => metricWithDelta(row, "unit_value", (value) => channelMoney(value, row), "unit_value_delta"), summary: false, num: true },
  ], 160, { previousSummaryRows: previousProductRows });
}

function attributionRowsForWindow(rows) {
  return (rows || []).filter((row) => row.date_start >= state.startDate && row.date_start <= state.endDate);
}

function normalizedAttributionDailyRows() {
  const byDate = new Map((data.attribution_daily || []).map((row) => [row.date_start, { ...row }]));
  (data.attribution_channel || []).forEach((row) => {
    const current = byDate.get(row.date_start) || { date_start: row.date_start };
    const prefix = row.channel === "Meta" ? "meta" : (row.channel === "Google Ads" ? "google" : (row.channel === "Snapchat" ? "snapchat" : ""));
    if (prefix) {
      if (current[`${prefix}_spend`] === null || current[`${prefix}_spend`] === undefined) current[`${prefix}_spend`] = row.spend;
      if (current[`${prefix}_purchases`] === null || current[`${prefix}_purchases`] === undefined) current[`${prefix}_purchases`] = row.platform_purchases;
      if (current[`${prefix}_value`] === null || current[`${prefix}_value`] === undefined) current[`${prefix}_value`] = row.platform_value;
    }
    byDate.set(row.date_start, current);
  });
  (data.shopify_daily || []).forEach((row) => {
    const current = byDate.get(row.date_start) || { date_start: row.date_start };
    if (current.shopify_orders === null || current.shopify_orders === undefined) current.shopify_orders = row.orders;
    if (current.shopify_total_sales === null || current.shopify_total_sales === undefined) current.shopify_total_sales = row.total_sales;
    byDate.set(row.date_start, current);
  });
  return [...byDate.values()].sort((a, b) => a.date_start.localeCompare(b.date_start));
}

function attributionChannelSelected(channel) {
  return !state.channel.length || state.channel.includes(channel);
}

function attributionChannelOptions() {
  const available = new Set((data.attribution_channel || []).map((row) => row.channel));
  return ["Meta", "Google Ads", "Snapchat"].filter((channel) => available.has(channel));
}

function channelOptionsForView() {
  if (state.view === "attribution") return attributionChannelOptions();
  return [...new Set((data.channel_market_product_daily || []).map((row) => row.channel || "Unknown"))].sort();
}

function evidenceBadge(value) {
  const label = value || "待核";
  const cls = label === "财务真值" || label === "可用"
    ? "evidence-good"
    : (label === "部分覆盖" || label === "质量待核" ? "evidence-warn" : "evidence-info");
  return `<span class="evidence-badge ${cls}">${escapeHtml(label)}</span>`;
}

function renderAttributionSourceHealth() {
  const el = document.getElementById("attributionSourceHealth");
  const order = ["Shopify", "Meta", "Google Ads", "GA4", "Snapchat"];
  const rows = [...(data.attribution_source_health || [])].sort((a, b) => order.indexOf(a.source) - order.indexOf(b.source));
  el.innerHTML = rows.map((row) => {
    const tone = row.status === "可用" ? "health-good" : (["部分", "滞后"].includes(row.status) ? "health-warn" : "health-bad");
    return `<article class="source-health-card ${tone}">
      <div><strong>${escapeHtml(row.source)}</strong><span>${escapeHtml(row.status)}</span></div>
      <p>${row.latest_date ? `更新至 ${escapeHtml(row.latest_date)}` : "暂无数据"} · ${escapeHtml(row.grain || "-")}</p>
      <small>${escapeHtml(row.limitation || "")}</small>
    </article>`;
  }).join("") || `<p class="empty">暂无数据源状态。</p>`;
}

function attributionPeriodSummary(rows) {
  const optionalSum = (key) => {
    const available = rows.filter((row) => row[key] !== null && row[key] !== undefined);
    return available.length ? available.reduce((total, row) => total + getMetric(row, key), 0) : null;
  };
  return {
    shopifyOrders: optionalSum("shopify_orders"),
    shopifyTotalSales: optionalSum("shopify_total_sales"),
    meta: {
      spend: optionalSum("meta_spend"),
      value: optionalSum("meta_value"),
      purchases: optionalSum("meta_purchases"),
    },
    google: {
      spend: optionalSum("google_spend"),
      value: optionalSum("google_value"),
      purchases: optionalSum("google_purchases"),
    },
    snapchat: {
      spend: optionalSum("snapchat_spend"),
      value: optionalSum("snapchat_value"),
      purchases: optionalSum("snapchat_purchases"),
    },
  };
}

function selectedAttributionChannel(channel, values) {
  return attributionChannelSelected(channel)
    ? values
    : { spend: null, value: null, purchases: null };
}

function renderAttributionKpis(rows) {
  const summary = attributionPeriodSummary(rows);
  const meta = selectedAttributionChannel("Meta", summary.meta);
  const google = selectedAttributionChannel("Google Ads", summary.google);
  const snapchat = selectedAttributionChannel("Snapchat", summary.snapchat);
  const metaEfficiency = DashboardMetrics.calculateChannelEfficiency(meta);
  const googleEfficiency = DashboardMetrics.calculateChannelEfficiency(google);
  const snapchatEfficiency = DashboardMetrics.calculateChannelEfficiency(snapchat);
  const diagnostics = DashboardMetrics.calculateAttributionDiagnostics(
    meta,
    google,
    summary.shopifyTotalSales,
    attributionChannelSelected("Snapchat") ? [snapchat] : [],
  );
  const availability = (key) => `${rows.filter((row) => row[key] !== null && row[key] !== undefined).length}/${rows.length} 天`;
  const channelCard = (label, channel, efficiency, coverageKey) => `
    <article><span>${escapeHtml(label)}</span><strong>${money(channel.spend)} / ${money(channel.value)}</strong>
      <small>花费 / 平台 GMV · ROAS ${ratio(efficiency.roas)}<br>${number(channel.purchases)} 转化 · CPA ${money(efficiency.cpa)} · AOV ${money(efficiency.aov)} · ${availability(coverageKey)}</small></article>`;
  document.getElementById("attributionKpis").innerHTML = `
    <article><span>Shopify Total Sales</span><strong>${money(summary.shopifyTotalSales)}</strong><small>${number(summary.shopifyOrders)} 订单 · 站内财务基准 · ${availability("shopify_total_sales")}</small></article>
    ${channelCard("Meta", meta, metaEfficiency, "meta_spend")}
    ${channelCard("Google Ads", google, googleEfficiency, "google_spend")}
    ${channelCard("Snapchat", snapchat, snapchatEfficiency, "snapchat_spend")}
    <article><span>广告渠道总览</span><strong>${money(diagnostics.totalSpend)}</strong><small>合计花费 · 混合 MER ${ratio(diagnostics.blendedMer)}<br>总广告投入率 ${pct(diagnostics.adInvestmentRate)}</small></article>
    <article><span>归因溢出</span><strong>${pct(diagnostics.attributionOverflowRate)}</strong><small>平台 GMV ${money(diagnostics.totalValue)} vs Shopify Total Sales<br>仅表示平台认领溢出，不等同投放饱和</small></article>`;
}

function renderAttributionTrend(rows) {
  const series = [];
  const add = (row, label, key) => {
    if (row[key] !== null && row[key] !== undefined && attributionChannelSelected(label)) {
      series.push({ date_start: row.date_start, series: label, value: row[key] });
    }
  };
  rows.forEach((row) => {
    if (state.attributionMetric === "platform_value") {
      add(row, "Meta", "meta_value");
      add(row, "Google Ads", "google_value");
      add(row, "Snapchat", "snapchat_value");
    } else if (state.attributionMetric === "spend") {
      add(row, "Meta", "meta_spend");
      add(row, "Google Ads", "google_spend");
      add(row, "Snapchat", "snapchat_spend");
    } else if (state.attributionMetric === "purchases") {
      add(row, "Meta", "meta_purchases");
      add(row, "Google Ads", "google_purchases");
      add(row, "Snapchat", "snapchat_purchases");
    } else if (state.attributionMetric === "platform_roas") {
      const metaRoas = DashboardMetrics.calculateChannelEfficiency({
        spend: row.meta_spend,
        value: row.meta_value,
        purchases: row.meta_purchases,
      }).roas;
      const googleRoas = DashboardMetrics.calculateChannelEfficiency({
        spend: row.google_spend,
        value: row.google_value,
        purchases: row.google_purchases,
      }).roas;
      const snapchatRoas = DashboardMetrics.calculateChannelEfficiency({
        spend: row.snapchat_spend,
        value: row.snapchat_value,
        purchases: row.snapchat_purchases,
      }).roas;
      if (metaRoas !== null && attributionChannelSelected("Meta")) {
        series.push({ date_start: row.date_start, series: "Meta", value: metaRoas });
      }
      if (googleRoas !== null && attributionChannelSelected("Google Ads")) {
        series.push({ date_start: row.date_start, series: "Google Ads", value: googleRoas });
      }
      if (snapchatRoas !== null && attributionChannelSelected("Snapchat")) {
        series.push({ date_start: row.date_start, series: "Snapchat", value: snapchatRoas });
      }
    } else {
      if (row.shopify_total_sales !== null && row.shopify_total_sales !== undefined) {
        series.push({ date_start: row.date_start, series: "Shopify Total Sales", value: row.shopify_total_sales });
      }
    }
  });
  renderCategoryLineChart("attributionTrend", series, "series", "value", { limit: 4, missingAsGap: true });
}

function attributionEfficiencyRows(summary) {
  const channels = [
    ["Meta", summary.meta],
    ["Google Ads", summary.google],
    ["Snapchat", summary.snapchat],
  ].filter(([channel]) => attributionChannelSelected(channel));
  const diagnostics = DashboardMetrics.calculateAttributionDiagnostics(
    selectedAttributionChannel("Meta", summary.meta),
    selectedAttributionChannel("Google Ads", summary.google),
    summary.shopifyTotalSales,
    attributionChannelSelected("Snapchat") ? [selectedAttributionChannel("Snapchat", summary.snapchat)] : [],
  );
  return channels.map(([channel, values]) => {
    const efficiency = DashboardMetrics.calculateChannelEfficiency(values);
    return {
      channel,
      spend: values.spend,
      spend_share: diagnostics.totalSpend ? values.spend / diagnostics.totalSpend : null,
      purchase_value: values.value,
      sales_share: diagnostics.totalValue ? values.value / diagnostics.totalValue : null,
      purchase_times: values.purchases,
      roas: efficiency.roas,
      cpa: efficiency.cpa,
      aov: efficiency.aov,
    };
  });
}

function renderAttributionDiagnostics(summary) {
  const diagnostics = DashboardMetrics.calculateAttributionDiagnostics(
    selectedAttributionChannel("Meta", summary.meta),
    selectedAttributionChannel("Google Ads", summary.google),
    summary.shopifyTotalSales,
    attributionChannelSelected("Snapchat") ? [selectedAttributionChannel("Snapchat", summary.snapchat)] : [],
  );
  document.getElementById("attributionDiagnostics").innerHTML = `
    <div><span>Shopify Total Sales</span><strong>${money(summary.shopifyTotalSales)}</strong></div>
    <div><span>总广告投入率</span><strong>${pct(diagnostics.adInvestmentRate)}</strong></div>
    <div><span>混合 MER</span><strong>${ratio(diagnostics.blendedMer)}</strong></div>
    <div><span>平台归因溢出率</span><strong>${pct(diagnostics.attributionOverflowRate)}</strong></div>
    <small>溢出率用于观察平台重复认领和归因压力；需结合投入率与混合 MER 判断投放是否趋于饱和。</small>`;
}

function aggregateAttributionChannels(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!attributionChannelSelected(row.channel)) return;
    const current = groups.get(row.channel) || {
      channel: row.channel, metric_basis: row.metric_basis, spend: 0, platform_purchases: 0,
      platform_value: 0, shopify_revenue: 0, coverage_sum: 0, coverage_count: 0,
      evidence_level: row.evidence_level, quality_flag: row.quality_flag || "",
      seen: {},
    };
    ["spend", "platform_purchases", "platform_value", "shopify_revenue"].forEach((key) => {
      if (row[key] !== null && row[key] !== undefined) {
        current[key] += getMetric(row, key);
        current.seen[key] = true;
      }
    });
    if (row.coverage_pct !== null && row.coverage_pct !== undefined) {
      current.coverage_sum += getMetric(row, "coverage_pct");
      current.coverage_count += 1;
    }
    if (row.evidence_level === "部分覆盖" || row.evidence_level === "质量待核") current.evidence_level = row.evidence_level;
    if (row.quality_flag) current.quality_flag = row.quality_flag;
    groups.set(row.channel, current);
  });
  return [...groups.values()].map((row) => ({
    ...row,
    spend: row.seen.spend ? row.spend : null,
    platform_purchases: row.seen.platform_purchases ? row.platform_purchases : null,
    platform_value: row.seen.platform_value ? row.platform_value : null,
    shopify_revenue: row.seen.shopify_revenue ? row.shopify_revenue : null,
    platform_roas: row.seen.spend && row.seen.platform_value && row.spend ? row.platform_value / row.spend : null,
    coverage_pct: row.coverage_count ? row.coverage_sum / row.coverage_count : null,
  })).sort((a, b) => b.spend - a.spend || b.platform_value - a.platform_value);
}

function renderAttributionCoverage(rows) {
  const el = document.getElementById("attributionCoverage");
  if (!rows.length) {
    el.innerHTML = `<p class="empty">暂无覆盖率数据。</p>`;
    return;
  }
  const sum = (key) => rows.reduce((total, row) => total + getMetric(row, key), 0);
  const optionalSum = (key) => {
    const available = rows.filter((row) => row[key] !== null && row[key] !== undefined);
    return available.length ? available.reduce((total, row) => total + getMetric(row, key), 0) : null;
  };
  const rawSpend = sum("raw_meta_spend");
  const rawValue = sum("raw_meta_value");
  const items = [
    { label: "广告花费对账覆盖", value: rawSpend ? sum("recon_meta_spend") / rawSpend : null, threshold: 0.95 },
    { label: "归因收入 对账覆盖", value: rawValue ? sum("recon_meta_value") / rawValue : null, threshold: 0.95 },
  ];
  const coverageHtml = items.map((item) => {
    const value = item.value;
    const width = value === null ? 0 : Math.min(Math.max(value * 100, 0), 100);
    const tone = value !== null && value >= item.threshold ? "coverage-good" : "coverage-risk";
    return `<div class="coverage-item ${tone}"><div><span>${escapeHtml(item.label)}</span><strong>${pct(value)}</strong></div>
      <div class="coverage-track"><i style="width:${width}%"></i></div>
      <small>${value !== null && value >= item.threshold ? "可用于方向性对账" : "覆盖不足，禁止推导全量渠道贡献"}</small></div>`;
  }).join("");
  const comparableShopify = optionalSum("shopify_net_sales");
  const reconShopify = optionalSum("recon_shopify_gmv");
  const difference = comparableShopify !== null && reconShopify !== null ? reconShopify - comparableShopify : null;
  const shopifyComparison = `<div class="coverage-item coverage-definition">
    <div><span>Shopify 主日表净销售</span><strong>${money(comparableShopify)}</strong></div>
    <div><span>对账视图 Shopify GMV</span><strong>${money(reconShopify)}</strong></div>
    <small>差额 ${money(difference)} · 不同口径，不计算覆盖率</small>
  </div>`;
  el.innerHTML = `${coverageHtml}${shopifyComparison}`;
}

function renderAttributionIssues() {
  const rows = data.attribution_issues || [];
  document.getElementById("attributionIssues").innerHTML = rows.map((row) => `
    <article class="issue-card issue-${escapeHtml(row.severity || "medium")}">
      <div><span>${row.severity === "high" ? "高优先级" : "待处理"}</span><strong>${escapeHtml(row.title)}</strong></div>
      <p>${escapeHtml(row.impact)}</p>
      <small><b>暂停输出：</b>${escapeHtml(row.blocked_output)}<br><b>下一步：</b>${escapeHtml(row.action)}</small>
    </article>`).join("") || `<p class="empty">暂无待处理问题。</p>`;
}

function googleRowsForWindow(source, start = state.startDate, end = state.endDate, filters = {}) {
  const selectedGoogleAccounts = state.account.filter((value) => value.startsWith("Google Ads · "));
  return (source || []).filter((row) => {
    if (start && row.date_start < start) return false;
    if (end && row.date_start > end) return false;
    if (selectedGoogleAccounts.length && !selectedGoogleAccounts.includes(googleAccountLabel(row.account_id))) return false;
    if (filters.adType && state.googleAdTypes.length && !state.googleAdTypes.includes(row.ad_type)) return false;
    if (filters.product && state.googleProducts.length && !state.googleProducts.includes(row.product_name)) return false;
    if (filters.country && state.googleCountries.length && !state.googleCountries.includes(row.country_name || row.country_code)) return false;
    return true;
  });
}

function aggregateGoogleDimension(currentRows, previousRows, dimensions) {
  const groupRows = (rows) => {
    const groups = new Map();
    rows.forEach((row) => {
      const key = compareKey(row, dimensions);
      const group = groups.get(key) || { dimensions: Object.fromEntries(dimensions.map((dimension) => [dimension, row[dimension] ?? "Unknown"])), rows: [] };
      group.rows.push(row);
      groups.set(key, group);
    });
    return groups;
  };
  const currentGroups = groupRows(currentRows);
  const previousGroups = groupRows(previousRows);
  return [...currentGroups.entries()].map(([key, group]) => {
    const current = DashboardMetrics.aggregateGoogleMetrics(group.rows);
    const previous = DashboardMetrics.aggregateGoogleMetrics(previousGroups.get(key)?.rows || []);
    return { ...group.dimensions, ...current, delta: DashboardMetrics.compareGoogleMetrics(current, previous) };
  });
}

function googleMetricWithDelta(row, key, formatter, inverse = false) {
  const value = formatter(row[key]);
  const delta = row.delta?.[key];
  if (delta === null || delta === undefined) return metricStack(value, `<span class="flat">上一周期无数据</span>`);
  const sign = delta >= 0 ? "+" : "";
  return metricStack(value, deltaBadge({ text: `${sign}${pct(delta)}`, cls: delta >= 0 ? "up" : "down" }, inverse));
}

function sortGoogleRows(rows, sort) {
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue = left?.[sort.key];
    const rightValue = right?.[sort.key];
    if (typeof leftValue === "string" || typeof rightValue === "string") {
      return direction * String(leftValue || "").localeCompare(String(rightValue || ""), "zh-CN");
    }
    return direction * (getMetric(left, sort.key) - getMetric(right, sort.key));
  });
}

function googleMinimumSpend(rows) {
  return Math.max(100, DashboardMetrics.aggregateGoogleMetrics(rows).spend * 0.05);
}

function googleSummary(id, rows, label, detail = "") {
  const totals = DashboardMetrics.aggregateGoogleMetrics(rows);
  const el = document.getElementById(id);
  el.textContent = rows.length
    ? `${label} ${number(rows.length)} 项 · 花费 ${money(totals.spend)} · Google 平台归因 GMV ${money(totals.platform_gmv)} · ROAS ${ratio(totals.roas)}。${detail}`
    : "当前筛选下暂无数据。";
}

function renderGoogleShareBars(id, rows, key, filterKey) {
  const el = document.getElementById(id);
  if (!rows.length) {
    el.innerHTML = `<p class="empty">当前筛选下暂无数据。</p>`;
    return;
  }
  const visible = [...rows].sort((left, right) => getMetric(right, "spend") - getMetric(left, "spend")).slice(0, 8);
  const totals = DashboardMetrics.aggregateGoogleMetrics(rows);
  el.innerHTML = `<div class="google-share-bars">${visible.map((row) => {
    const value = row[key] || "Unknown";
    const spendShare = totals.spend ? getMetric(row, "spend") / totals.spend : 0;
    const gmvShare = totals.platform_gmv ? getMetric(row, "platform_gmv") / totals.platform_gmv : 0;
    return `<button type="button" class="google-share-row" data-filter-key="${filterKey}" data-filter-value="${escapeHtml(value)}"><span>${escapeHtml(value)}</span><b>花费 ${pct(spendShare)} · GMV ${pct(gmvShare)}</b><i class="google-spend-share" style="width:${spendShare * 100}%"></i><i class="google-gmv-share" style="width:${gmvShare * 100}%"></i></button>`;
  }).join("")}</div>`;
}

function renderGoogleMarketScatter(id, rows) {
  const el = document.getElementById(id);
  if (!rows.length) {
    el.innerHTML = `<p class="empty">当前筛选下暂无数据。</p>`;
    return;
  }
  const width = 860;
  const height = 320;
  const margin = { top: 22, right: 28, bottom: 48, left: 58 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxSpend = Math.max(...rows.map((row) => getMetric(row, "spend")), 1);
  const maxRoas = Math.max(...rows.map((row) => getMetric(row, "roas")), 1);
  const maxGmv = Math.max(...rows.map((row) => getMetric(row, "platform_gmv")), 1);
  const x = (value) => margin.left + (getMetric({ value }, "value") / maxSpend) * plotWidth;
  const y = (value) => margin.top + plotHeight - (getMetric({ value }, "value") / maxRoas) * plotHeight;
  const radius = (value) => 5 + Math.sqrt(getMetric({ value }, "value") / maxGmv) * 18;
  const labelSlots = [205, 150, 180, 254, 224, 105];
  const labels = new Map([...rows]
    .sort((left, right) => getMetric(right, "spend") - getMetric(left, "spend"))
    .slice(0, 6)
    .map((row, index) => [row.country_name || "Unknown", labelSlots[index]]));
  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  el.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Google 市场花费、ROAS 和平台归因 GMV 散点图">
    ${xTicks.map((tick) => `<g class="google-scatter-axis"><line x1="${margin.left + plotWidth * tick}" x2="${margin.left + plotWidth * tick}" y1="${margin.top}" y2="${margin.top + plotHeight}"></line><text x="${margin.left + plotWidth * tick}" y="${height - 22}" text-anchor="middle">${money(maxSpend * tick)}</text></g>`).join("")}
    ${yTicks.map((tick) => `<g class="google-scatter-axis"><line x1="${margin.left}" x2="${margin.left + plotWidth}" y1="${margin.top + plotHeight - plotHeight * tick}" y2="${margin.top + plotHeight - plotHeight * tick}"></line><text x="${margin.left - 8}" y="${margin.top + plotHeight - plotHeight * tick + 4}" text-anchor="end">${ratio(maxRoas * tick)}</text></g>`).join("")}
    <text class="google-scatter-title" x="${margin.left + plotWidth / 2}" y="${height - 4}" text-anchor="middle">花费</text>
    <text class="google-scatter-title" x="14" y="${margin.top + plotHeight / 2}" text-anchor="middle" transform="rotate(-90 14 ${margin.top + plotHeight / 2})">ROAS</text>
    ${rows.map((row) => {
      const country = row.country_name || "Unknown";
      const unknown = country === "Unknown";
      const tooltip = `${country} | 花费 ${money(row.spend)} | ROAS ${ratio(row.roas)} | Google 平台归因 GMV ${money(row.platform_gmv)}`;
      const labelYSlot = labels.get(country);
      const labelX = Math.max(margin.left + 2, Math.min(width - margin.right - 2, x(row.spend)));
      const labelY = labelYSlot === undefined ? 0 : Math.max(margin.top + 13, Math.min(margin.top + plotHeight - 12, labelYSlot));
      const labelAnchor = labelX > width - 150 ? "end" : (labelX < 150 ? "start" : "middle");
      return `<a class="google-scatter-point ${unknown ? "google-scatter-unknown" : ""}" data-filter-key="googleCountries" data-filter-value="${escapeHtml(country)}" href="#googleMarketTable"><title>${escapeHtml(tooltip)}</title><circle cx="${x(row.spend)}" cy="${y(row.roas)}" r="${radius(row.platform_gmv)}"></circle>${labelYSlot === undefined ? "" : `<text x="${labelX}" y="${labelY}" text-anchor="${labelAnchor}">${escapeHtml(country)}</text>`}</a>`;
    }).join("")}
  </svg>`;
}

function renderGoogleDetailFilters(containerId, key, label, values) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<div class="multi-select google-detail-filter" data-filter="${key}"><span class="filter-label">${label}</span><button type="button" class="multi-trigger" id="${key}FilterButton" aria-expanded="false">全部</button><div class="multi-panel" id="${key}FilterPanel"></div></div>`;
  state[key] = state[key].filter((value) => values.includes(value));
  setMultiOptions(key, values, state[key]);
}

function renderGoogleAdTypes(rows, previousRows) {
  const aggregated = sortGoogleRows(aggregateGoogleDimension(rows, previousRows, ["ad_type"]), state.googleSort.adType);
  const minimumSpend = googleMinimumSpend(aggregated);
  const best = [...aggregated].filter((row) => row.spend >= minimumSpend && row.conversions > 0).sort((left, right) => getMetric(right, "roas") - getMetric(left, "roas"))[0];
  googleSummary("googleAdTypeSummary", aggregated, "广告类型", best ? `满足最低花费 ${money(minimumSpend)} 的最高 ROAS 类型为 ${best.ad_type}（${ratio(best.roas)}）。` : `最低花费门槛为 ${money(minimumSpend)}，暂无满足门槛的类型。`);
  renderGoogleShareBars("googleAdTypeChart", aggregated, "ad_type", "googleAdTypes");
  renderTable("googleAdTypeTable", aggregated, googleColumns("ad_type", "广告类型", "googleAdTypes"), 30, { sortGroup: "adType", previousSummaryRows: aggregateGoogleDimension(previousRows, [], ["ad_type"]) });
}

function renderGoogleProducts(rows, previousRows) {
  const aggregated = sortGoogleRows(aggregateGoogleDimension(rows, previousRows, ["product_name", "ad_type"]), state.googleSort.product);
  const minimumSpend = googleMinimumSpend(aggregated);
  const topGmv = [...aggregated].sort((left, right) => getMetric(right, "platform_gmv") - getMetric(left, "platform_gmv"))[0];
  const best = [...aggregated].filter((row) => row.spend >= minimumSpend && row.conversions > 0).sort((left, right) => getMetric(right, "roas") - getMetric(left, "roas"))[0];
  const topText = topGmv ? `最高平台 GMV 产品为 ${topGmv.product_name}（${money(topGmv.platform_gmv)}）。` : "";
  const bestText = best ? `效率最高的达标产品为 ${best.product_name}（ROAS ${ratio(best.roas)}）。` : `最低花费门槛为 ${money(minimumSpend)}，暂无达标产品。`;
  googleSummary("googleProductSummary", aggregated, "产品 / 广告类型", `${topText}${bestText}`);
  renderTable("googleProductTable", aggregated, googleColumns("product_name", "产品", "googleProducts", true), 100, { sortGroup: "product", previousSummaryRows: aggregateGoogleDimension(previousRows, [], ["product_name", "ad_type"]) });
}

function renderGoogleMarkets(rows, previousRows) {
  const aggregated = sortGoogleRows(aggregateGoogleDimension(rows, previousRows, ["country_name"]), state.googleSort.market);
  const totals = DashboardMetrics.aggregateGoogleMetrics(aggregated);
  const minimumSpend = googleMinimumSpend(aggregated);
  const eligible = aggregated.filter((row) => row.spend >= minimumSpend);
  const strong = [...eligible].filter((row) => row.roas > totals.roas).sort((left, right) => getMetric(right, "spend") - getMetric(left, "spend"))[0];
  const weak = [...eligible].filter((row) => row.roas < totals.roas).sort((left, right) => getMetric(right, "spend") - getMetric(left, "spend"))[0];
  const detail = `加权 ROAS 基准 ${ratio(totals.roas)}；${strong ? `高花费高 ROAS 国家为 ${strong.country_name}（${ratio(strong.roas)}）` : "暂无高花费高 ROAS 国家"}；${weak ? `高花费低 ROAS 国家为 ${weak.country_name}（${ratio(weak.roas)}）` : "暂无高花费低 ROAS 国家"}。`;
  googleSummary("googleMarketSummary", aggregated, "市场", detail);
  renderGoogleMarketScatter("googleMarketChart", aggregated);
  renderTable("googleMarketTable", aggregated, googleColumns("country_name", "国家", "googleCountries"), 100, { sortGroup: "market", previousSummaryRows: aggregateGoogleDimension(previousRows, [], ["country_name"]) });
}

function googleColumns(dimension, label, filterKey, includeAdType = false) {
  const columns = [
    { key: dimension, label, sticky: true, filterKey, format: (value) => `<span class="tag">${escapeHtml(value)}</span>` },
  ];
  if (includeAdType) columns.push({ key: "ad_type", label: "广告类型", filterKey: "googleAdTypes", format: (value) => `<span class="tag">${escapeHtml(value)}</span>` });
  return columns.concat([
    { key: "spend", label: "花费", value: (row) => row, format: (row) => googleMetricWithDelta(row, "spend", money), summaryKey: "spend", summaryFormat: money, num: true },
    { key: "platform_gmv", label: "Google 平台归因 GMV", value: (row) => row, format: (row) => googleMetricWithDelta(row, "platform_gmv", money), summaryKey: "platform_gmv", summaryFormat: money, num: true },
    { key: "conversions", label: "转化", value: (row) => row, format: (row) => googleMetricWithDelta(row, "conversions", number), summaryKey: "conversions", summaryFormat: number, num: true },
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => googleMetricWithDelta(row, "roas", ratio), summaryKey: "google_roas", summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", value: (row) => row, format: (row) => googleMetricWithDelta(row, "cpa", money, true), summaryKey: "google_cpa", summaryFormat: money, num: true },
    { key: "ctr", label: "CTR", value: (row) => row, format: (row) => googleMetricWithDelta(row, "ctr", pct), summaryKey: "google_ctr", summaryFormat: pct, num: true },
    { key: "cvr", label: "CVR", value: (row) => row, format: (row) => googleMetricWithDelta(row, "cvr", pct), summaryKey: "google_cvr", summaryFormat: pct, num: true },
  ]);
}

function renderGoogleAttributionDetail() {
  const period = comparisonWindow();
  const adTypeSource = state.googleCountries.length ? data.google_market_daily : data.google_ad_type_daily;
  const adTypeFilters = { adType: true, country: state.googleCountries.length > 0 };
  const productFilters = { adType: true, product: true };
  const marketFilters = { adType: true, country: true };
  const currentAdTypes = googleRowsForWindow(adTypeSource, state.startDate, state.endDate, adTypeFilters);
  const previousAdTypes = googleRowsForWindow(adTypeSource, period.start, period.end, adTypeFilters);
  const productSource = (data.google_product_daily || []).map((row) => ({ ...row, product_name: row.product_name || "未识别产品" }));
  const marketSource = (data.google_market_daily || []).map((row) => ({ ...row, country_name: row.country_name || row.country_code || "Unknown" }));
  const currentProducts = googleRowsForWindow(productSource, state.startDate, state.endDate, productFilters)
    .filter((row) => row.ad_type !== "Search");
  const previousProducts = googleRowsForWindow(productSource, period.start, period.end, productFilters)
    .filter((row) => row.ad_type !== "Search");
  const currentMarkets = googleRowsForWindow(marketSource, state.startDate, state.endDate, marketFilters);
  const previousMarkets = googleRowsForWindow(marketSource, period.start, period.end, marketFilters);
  const adTypes = [...new Set([
    ...(data.google_ad_type_daily || []),
    ...(data.google_product_daily || []),
    ...(data.google_market_daily || []),
  ].map((row) => row.ad_type).filter(Boolean))].sort();
  const products = [...new Set(productSource.filter((row) => row.ad_type !== "Search").map((row) => row.product_name))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  const countries = [...new Set(marketSource.map((row) => row.country_name))].sort((a, b) => a.localeCompare(b));
  renderGoogleDetailFilters("googleAdTypeFilters", "googleAdTypes", "广告类型", adTypes);
  renderGoogleDetailFilters("googleProductFilters", "googleProducts", "产品", products);
  renderGoogleDetailFilters("googleMarketFilters", "googleCountries", "国家", countries);
  const active = [
    ...state.googleAdTypes.map((value) => `广告类型：${value}`),
    ...state.googleProducts.map((value) => `产品：${value}`),
    ...state.googleCountries.map((value) => `国家：${value}`),
  ];
  document.getElementById("googleActiveFilters").innerHTML = active.length
    ? `${escapeHtml(active.join("；"))} <button type="button" class="ghost-button" data-google-reset-filters>重置明细筛选</button>`
    : "";
  document.getElementById("googleActiveFilters").classList.toggle("hidden", !active.length);
  renderGoogleAdTypes(currentAdTypes, previousAdTypes);
  renderGoogleProducts(currentProducts, previousProducts);
  renderGoogleMarkets(currentMarkets, previousMarkets);
}

function renderAttribution() {
  const dailyRows = attributionRowsForWindow(normalizedAttributionDailyRows());
  const coverageRows = attributionRowsForWindow(data.attribution_coverage_daily || []);
  const summary = attributionPeriodSummary(dailyRows);
  const efficiencyRows = attributionEfficiencyRows(summary);
  renderAttributionSourceHealth();
  renderAttributionKpis(dailyRows);
  renderAttributionTrend(dailyRows);
  renderAttributionCoverage(coverageRows);
  renderGoogleAttributionDetail();
  renderTable("attributionEfficiencyTable", efficiencyRows, [
    { key: "channel", label: "渠道", sticky: true, filterKey: "channel" },
    {
      key: "spend",
      label: "花费 / 占比",
      value: (row) => row,
      format: (row) => metricStack(money(row.spend), pct(row.spend_share)),
      summaryKey: "spend",
      summaryFormat: (value, totals) => metricStack(money(value), pct(totals.spend_share)),
      num: true,
    },
    {
      key: "purchase_value",
      label: "平台 GMV / 占比",
      value: (row) => row,
      format: (row) => metricStack(money(row.purchase_value), pct(row.sales_share)),
      summaryKey: "purchase_value",
      summaryFormat: (value, totals) => metricStack(money(value), pct(totals.sales_share)),
      num: true,
    },
    { key: "purchase_times", label: "转化数", format: number, num: true },
    { key: "roas", label: "ROAS", format: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "aov", label: "AOV", format: money, num: true },
  ], 3, {
    insight: "对比各广告渠道的花费结构、平台归因结构与效率；平台 GMV 不与 Shopify Total Sales 相加为总收入。",
  });
  renderAttributionDiagnostics(summary);
  renderAttributionIssues();
}

function renderCountryPage(countryModel) {
  const scope = state.countryRegion === "ALL"
    ? (state.country.length ? `已选 ${state.country.length} 个国家` : "全部地区")
    : state.countryRegion;
  document.getElementById("countryTrendScope").textContent = scope;
  document.getElementById("countryRegionScope").textContent = state.countryRegion === "ALL" ? "全部地区" : `当前：${state.countryRegion}`;

  renderLineChart("countryTrend", countryModel.trend, "purchase_value");
  renderCountryTrendConclusion(countryModel.countries);

  const hierarchyRows = DashboardCountry.buildRegionHierarchy(
    countryModel.hierarchyCurrentRows,
    countryModel.hierarchyPreviousRows,
    state.expandedRegions,
  ).map((row) => ({
    ...row,
    _rowClass: [
      `tree-row-depth-${row._depth}`,
      row._nodeType === "country" && state.country.includes(row.country) ? "is-active-drilldown" : "",
    ].filter(Boolean).join(" "),
  }));
  renderCountryDrilldownBreadcrumb();
  renderShareCompareBars("regionShareBars", countryModel.regions, "region", { limit: 4 });
  renderTable("regionTable", hierarchyRows, [
    { key: "region", label: "地区", sticky: true, filterKey: false, format: (_value, row) => hierarchyLabel(row) },
    { key: "country_count", label: "国家数", value: (row) => row, format: (row) => metricWithDelta(row, "country_count", number, "country_count_delta"), summaryValue: (row) => row.country_count, summaryFormat: number, num: true },
    { key: "purchase_value", label: "归因收入", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "sales_share", label: "GMV占比", value: (row) => row, format: (row) => metricWithDelta(row, "sales_share", pct, "sales_share_delta"), summaryValue: (row) => row.sales_share, summaryFormat: pct, num: true },
    { key: "spend", label: "广告花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "spend_share", label: "花费占比", value: (row) => row, format: (row) => metricWithDelta(row, "spend_share", pct, "spend_share_delta"), summaryValue: (row) => row.spend_share, summaryFormat: pct, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    metaAovColumn(),
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", value: (row) => row, format: (row) => metricWithDelta(row, "cpa", money, "cpa_delta", true), summaryValue: (row) => row.cpa, summaryFormat: money, num: true },
  ], Number.POSITIVE_INFINITY, {
    summaryRows: countryModel.regions,
    previousSummaryRows: countryModel.previousRegions,
  });

  renderTable("countryDetailTable", countryModel.countries, [
    { key: "country", label: "国家", sticky: true, filterKey: "country" },
    { key: "standard_product_name", label: "标准产品", filterKey: "standard_product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "purchase_value", label: "归因收入", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "spend", label: "广告花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    metaAovColumn(),
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", value: (row) => row, format: (row) => metricWithDelta(row, "cpa", money, "cpa_delta", true), summaryValue: (row) => row.cpa, summaryFormat: money, num: true },
    { key: "ctr", label: "CTR", value: (row) => row, format: (row) => metricWithDelta(row, "ctr", pct, "ctr_delta"), summaryValue: (row) => row.ctr, summaryFormat: pct, num: true },
    { key: "cvr", label: "CVR", value: (row) => row, format: (row) => metricWithDelta(row, "cvr", pct, "cvr_delta"), summaryValue: (row) => row.cvr, summaryFormat: pct, num: true },
  ], 100, { previousSummaryRows: countryModel.previousCountries });
}

function creativeSegmentMeta(model) {
  return {
    type: { label: "素材类型", dimension: "material_type" },
    source: { label: "视频来源", dimension: "video_source" },
    subtype: { label: "视频细分", dimension: "video_subtype" },
  }[model.segment];
}

function renderCreativePage(creativeModel, currentRows, previousRows) {
  const meta = creativeSegmentMeta(creativeModel);
  document.getElementById("creativeTrendTitle").textContent = `${meta.label}趋势`;
  document.getElementById("creativeStructureTitle").textContent = `${meta.label}结构`;
  document.getElementById("creativeProductMaterialTitle").textContent = `产品 x ${meta.label}`;
  renderLineChart("creativeTrend", creativeModel.trend, "purchase_value");
  renderTrendConclusion("creativeTrendConclusion", creativeModel.trend, "purchase_value");
  renderDonutChart("creativeStructureDonut", creativeModel.structure, "spend", `${meta.label}花费结构`, {
    labelKey: creativeModel.dimension,
    limit: 8,
  });
  renderShareCompareBars("creativeStructureShares", creativeModel.structure, creativeModel.dimension, { limit: 8 });

  const hierarchyRows = DashboardCreative.buildHierarchy(
    currentRows,
    previousRows,
    state.creativeExpandedType,
    state.creativeExpandedSources,
  ).map((row) => ({ ...row, _rowClass: `tree-row-depth-${row._depth}` }));
  renderCreativeDrilldownBreadcrumb();
  const segmentColumn = {
    key: "material_type",
    label: "素材类型",
    sticky: true,
    filterKey: false,
    format: (_value, row) => hierarchyLabel(row),
  };
  const productMaterialSegmentColumn = {
    key: creativeModel.dimension,
    label: meta.label,
    filterKey: creativeModel.dimension,
    format: (value) => `<span class="tag">${escapeHtml(value)}</span>`,
  };
  const performanceColumns = [
    { key: "spend", label: "广告花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "spend_share", label: "花费占比", value: (row) => row, format: (row) => metricWithDelta(row, "spend_share", pct, "spend_share_delta"), summaryValue: (row) => row.spend_share, summaryFormat: pct, summaryDelta: false, num: true },
    { key: "purchase_value", label: "归因收入", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "sales_share", label: "销售占比", value: (row) => row, format: (row) => metricWithDelta(row, "sales_share", pct, "sales_share_delta"), summaryValue: (row) => row.sales_share, summaryFormat: pct, summaryDelta: false, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    metaAovColumn(),
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", value: (row) => row, format: (row) => metricWithDelta(row, "cpa", money, "cpa_delta", true), summaryValue: (row) => row.cpa, summaryFormat: money, num: true },
    { key: "ctr", label: "CTR", value: (row) => row, format: (row) => metricWithDelta(row, "ctr", pct, "ctr_delta"), summaryValue: (row) => row.ctr, summaryFormat: pct, num: true },
    { key: "cvr", label: "CVR", value: (row) => row, format: (row) => metricWithDelta(row, "cvr", pct, "cvr_delta"), summaryValue: (row) => row.cvr, summaryFormat: pct, num: true },
  ];
  renderTable("creativeStructureTable", hierarchyRows, [segmentColumn, ...performanceColumns], Number.POSITIVE_INFINITY, {
    summaryRows: creativeModel.structure,
    previousSummaryRows: creativeModel.previousStructure,
  });

  renderTable("creativeProductMaterialTable", creativeModel.productMaterial, [
    { key: "standard_product_name", label: "标准产品", sticky: true, filterKey: "standard_product_name", format: (value) => `<span class="tag">${escapeHtml(value)}</span>` },
    productMaterialSegmentColumn,
    ...performanceColumns,
  ], Number.POSITIVE_INFINITY, { previousSummaryRows: creativeModel.previousProductMaterial });

  const detailDimensions = [
    "ad_name",
    "material_name",
    "standard_product_name",
    "material_type",
    "video_source",
    "video_subtype",
    "operator",
    "country",
  ];
  const detailRows = aggregate(creativeModel.detail, detailDimensions).sort((left, right) => right.spend - left.spend);
  const previousDetailRows = aggregate(creativeModel.previousDetail, detailDimensions);
  renderTable("creativeDetailTable", detailRows, [
    { key: "ad_name", label: "Ad name", name: true, sticky: true, format: escapeHtml },
    { key: "material_name", label: "素材", name: true, filterKey: "material_name", format: (value) => `<span class="tag material-tag">${escapeHtml(value)}</span>` },
    { key: "standard_product_name", label: "标准产品", filterKey: "standard_product_name", format: (value) => `<span class="tag">${escapeHtml(value)}</span>` },
    { key: "material_type", label: "素材类型", filterKey: "material_type", format: (value) => `<span class="tag material-tag">${escapeHtml(value || "未分类")}</span>` },
    { key: "video_source", label: "视频来源", filterKey: "video_source", format: (value) => value ? `<span class="tag">${escapeHtml(value)}</span>` : "-" },
    { key: "video_subtype", label: "视频细分", filterKey: "video_subtype", format: (value) => value ? `<span class="tag">${escapeHtml(value)}</span>` : "-" },
    { key: "operator", label: "投手", filterKey: "operator" },
    { key: "country", label: "国家", filterKey: "country" },
    { key: "spend", label: "广告花费", format: money, num: true },
    { key: "purchase_value", label: "归因收入", format: money, num: true },
    { key: "purchase_times", label: "转化", format: number, num: true },
    metaAovColumn({ showDelta: false }),
    { key: "roas", label: "ROAS", format: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
    { key: "cvr", label: "CVR", format: pct, num: true },
  ], Number.POSITIVE_INFINITY, { previousSummaryRows: previousDetailRows });
}

function render() {
  updateStickyOffsets();
  const page = DashboardPages.get(state.view) || DashboardPages.get("overview");
  document.getElementById("viewTitle").textContent = page.title;
  document.getElementById("viewSubtitle").textContent = page.subtitle;
  document.getElementById("periodBadge").textContent = `${daysBetween(state.startDate, state.endDate)} 天`;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === state.view));
  document.querySelectorAll("[id$='View']").forEach((section) => section.classList.add("hidden"));
  document.getElementById(`${state.view}View`).classList.remove("hidden");
  DashboardPageShell.apply(document.getElementById(`${state.view}View`), page.modules);
  renderContextFilters();
  renderPeriodHint();
  const attributionOnly = state.view === "attribution";
  ["insightSummary", "kpis", "comparison", "actionInsights"].forEach((id) => {
    const compactPage = ["country", "creative"].includes(state.view) && (id === "comparison" || id === "actionInsights");
    document.getElementById(id).classList.toggle("hidden", attributionOnly || compactPage);
  });

  const fact = pageFactRows(data.fact);
  const previousFact = pageComparisonRows(data.fact);
  const countryModel = countryPageModel();
  const adRows = filteredRows(data.ads || []).map((row) => ({ ...row, video_source: row.video_source || "", video_subtype: row.video_subtype || "", material_name: materialName(row) }));
  const previousAdRows = comparisonRows(data.ads || []).map((row) => ({ ...row, video_source: row.video_source || "", video_subtype: row.video_subtype || "", material_name: materialName(row) }));
  const creativeModel = creativePageModel(adRows, previousAdRows);
  const productModel = productPageModel(fact, previousFact, adRows, previousAdRows);
  const materialInventoryRows = filteredMaterialInventoryRows();
  const previousMaterialInventoryRows = comparisonMaterialInventoryRows();
  const landingRows = adRows.map((row) => ({ ...row, landing_type: landingPageType(row) }));
  const previousLandingRows = previousAdRows.map((row) => ({ ...row, landing_type: landingPageType(row) }));
  renderInsightSummary(fact, previousFact, { creativeModel });
  renderKpis(fact, previousFact, { landingRows, previousLandingRows, creativeModel, productModel });
  renderComparison(fact, previousFact);
  renderActionInsights(fact, previousFact, { landingRows, previousLandingRows });

  const daily = aggregate(fact, ["date_start"]).sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)));
  renderLineChart("trendChart", daily, state.trendMetric);
  renderTrendConclusion("trendConclusion", daily, state.trendMetric);
  renderBars("countryBars", aggregate(fact, ["country"]), "country", "purchase_value", 80);
  renderBars("productBars", aggregate(fact, ["product_name"]), "product_name", "purchase_value", 80);
  renderBars("materialBars", aggregate(adRows, ["material_name"]), "material_name", "spend", 120, { clickable: false });
  renderBars("overviewOperatorBars", aggregate(fact, ["operator"]), "operator", "spend", 8);
  renderAlerts(fact);

  renderProductPage(productModel);

  renderCountryPage(countryModel);
  renderCreativePage(creativeModel, adRows, previousAdRows);

  const landingTypeRows = aggregate(landingRows, ["landing_type"]).sort((a, b) => b.spend - a.spend);
  renderDonutChart("landingTypeDonut", landingTypeRows, "spend", "落地页花费结构", { labelKey: "landing_type", limit: 8 });
  renderLandingInsights(landingRows);
  const previousLandingTypeRows = aggregate(previousLandingRows, ["landing_type"]);
  const landingTypeComparisonRows = addShareDeltas(
    addComparison(landingTypeRows, previousLandingRows, ["landing_type"]),
    previousLandingTypeRows,
    ["landing_type"],
  ).sort((a, b) => b.spend - a.spend);
  renderLandingTypeBars("landingTypeBars", landingTypeComparisonRows);
  renderCategoryLineChart("landingTypeTrend", aggregate(landingRows, ["date_start", "landing_type"]).sort((a, b) => String(a.date_start).localeCompare(String(b.date_start))), "landing_type", "purchase_value", { limit: 3 });
  renderTable("landingTypeTable", landingTypeComparisonRows, [
    { key: "landing_type", label: "落地页类型", sticky: true, filterKey: "landing_type", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "spend", label: "广告花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "spend_share", label: "花费占比", value: (row) => row, format: (row) => metricWithDelta(row, "spend_share", pct, "spend_share_delta"), summaryValue: (row) => row.spend_share || 1, summaryFormat: pct, summaryDelta: false, num: true },
    { key: "purchase_value", label: "归因收入", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "sales_share", label: "GMV占比", value: (row) => row, format: (row) => metricWithDelta(row, "sales_share", pct, "sales_share_delta"), summaryValue: (row) => row.sales_share || 1, summaryFormat: pct, summaryDelta: false, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    metaAovColumn(),
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
    { key: "cvr", label: "CVR", format: pct, num: true },
  ], 40, { previousSummaryRows: previousLandingTypeRows });
  const landingProductRows = addComparison(aggregate(landingRows, ["landing_type", "product_name"]), previousLandingRows, ["landing_type", "product_name"]).sort((a, b) => b.spend - a.spend);
  renderTable("landingProductTable", landingProductRows, [
    { key: "landing_type", label: "落地页类型", sticky: true, filterKey: "landing_type", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "product_name", label: "产品", filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "spend", label: "广告花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_value", label: "归因收入", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    metaAovColumn(),
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
    { key: "cvr", label: "CVR", format: pct, num: true },
  ], 120, { previousSummaryRows: aggregate(previousLandingRows, ["landing_type", "product_name"]) });
  const landingCountryRows = addComparison(aggregate(landingRows, ["landing_type", "country"]), previousLandingRows, ["landing_type", "country"]).sort((a, b) => b.spend - a.spend);
  renderTable("landingCountryTable", landingCountryRows, [
    { key: "landing_type", label: "落地页类型", sticky: true, filterKey: "landing_type", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "country", label: "国家", filterKey: "country" },
    { key: "spend", label: "广告花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_value", label: "归因收入", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    metaAovColumn(),
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
    { key: "cvr", label: "CVR", format: pct, num: true },
  ], 120, { previousSummaryRows: aggregate(previousLandingRows, ["landing_type", "country"]) });
  const landingMaterialRows = addComparison(aggregate(landingRows, ["landing_type", "material_name"]), previousLandingRows, ["landing_type", "material_name"]).sort((a, b) => b.purchase_value - a.purchase_value);
  renderTable("landingMaterialTable", landingMaterialRows, [
    { key: "landing_type", label: "落地页类型", sticky: true, filterKey: "landing_type", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "material_name", label: "素材", name: true, format: (v) => `<span class="tag material-tag">${escapeHtml(v)}</span>` },
    { key: "spend", label: "广告花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_value", label: "归因收入", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    metaAovColumn(),
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
    { key: "cvr", label: "CVR", format: pct, num: true },
  ], 120, { previousSummaryRows: aggregate(previousLandingRows, ["landing_type", "material_name"]) });
  renderAttribution();
  renderChannels();
  bindContentFilters();
}

function updateStickyOffsets() {
  const topbar = document.querySelector(".topbar");
  const height = Math.ceil(topbar?.getBoundingClientRect().height || 132);
  document.documentElement.style.setProperty("--topbar-height", `${height}px`);
}

function bindEvents() {
  document.body.dataset.eventsBound = "true";
  window.addEventListener("resize", updateStickyOffsets);
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tree-node]");
    if (!button) return;
    event.preventDefault();
    const nodeType = button.dataset.treeNode;
    const nodeValue = button.dataset.treeValue;
    const parentValue = button.dataset.treeParent;
    if (["material_type", "video_source", "video_subtype"].includes(nodeType)) {
      preserveScroll(() => toggleCreativeHierarchy(nodeType, nodeValue, parentValue));
    } else {
      preserveScroll(() => toggleCountryHierarchy(nodeType, nodeValue, parentValue));
      syncMultiSelection("country");
    }
    render();
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-drilldown-level]");
    if (!button) return;
    event.preventDefault();
    if (button.dataset.drilldownKind === "creative") {
      preserveScroll(() => clearCreativeDrilldown(button.dataset.drilldownLevel));
    } else {
      preserveScroll(() => clearCountryDrilldown(button.dataset.drilldownLevel));
      syncMultiSelection("country");
    }
    render();
  });
  document.addEventListener("click", (event) => {
    const source = event.target.nodeType === 1 ? event.target : event.target.parentElement;
    const target = source?.closest("[data-filter-key][data-filter-value]");
    if (!target) return;
    event.preventDefault();
    preserveScroll(() => applyContentFilter(target.dataset.filterKey, target.dataset.filterValue));
  }, true);
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.view = tab.dataset.view;
      initFilters();
      render();
    });
  });
  document.querySelectorAll("[data-range-preset]").forEach((button) => {
    button.addEventListener("click", () => applyPendingDatePreset(button.dataset.rangePreset));
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".multi-trigger");
    if (!button) return;
    const wrapper = button.closest(".multi-select");
    const isOpen = wrapper.classList.contains("open");
    document.querySelectorAll(".multi-select.open").forEach((el) => {
      el.classList.remove("open");
      el.querySelector(".multi-trigger").setAttribute("aria-expanded", "false");
    });
    if (!isOpen) {
      wrapper.classList.add("open");
      button.setAttribute("aria-expanded", "true");
    }
  });
  DashboardFilters.bindInteractions(document, {
    onChange(key, selected) {
      if (key === "country") state.countryRegion = "ALL";
      state[key] = selected;
      updateMultiButton(key);
    },
    preserveScroll,
    render(key) {
      if (key.startsWith("google")) {
        renderGoogleAttributionDetail();
        return;
      }
      render();
    },
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".multi-select")) return;
    document.querySelectorAll(".multi-select.open").forEach((el) => {
      el.classList.remove("open");
      el.querySelector(".multi-trigger").setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-action='clear']");
    if (!button) return;
    const key = button.dataset.filter;
    if (key === "channelCountries") {
      resetChannelCountryFilters();
      preserveScroll(render);
      return;
    }
    if (key === "country") state.countryRegion = "ALL";
    state[key] = [];
    document.querySelectorAll(`#${key}FilterPanel input[type='checkbox']`).forEach((input) => {
      input.checked = false;
    });
    updateMultiButton(key);
    if (key.startsWith("google")) {
      preserveScroll(renderGoogleAttributionDetail);
      return;
    }
    preserveScroll(render);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-google-reset-filters]")) return;
    state.googleAdTypes = [];
    state.googleProducts = [];
    state.googleCountries = [];
    preserveScroll(renderGoogleAttributionDetail);
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-google-sort]");
    if (!button) return;
    const group = button.dataset.googleSort;
    const key = button.dataset.googleSortKey;
    const current = state.googleSort[group];
    state.googleSort[group] = {
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    };
    preserveScroll(renderGoogleAttributionDetail);
  });
  document.getElementById("startDateFilter").addEventListener("change", (event) => {
    pendingTime.startDate = event.target.value;
    if (pendingTime.endDate < pendingTime.startDate) {
      pendingTime.endDate = pendingTime.startDate;
      document.getElementById("endDateFilter").value = pendingTime.endDate;
    }
    initFilters();
  });
  document.getElementById("endDateFilter").addEventListener("change", (event) => {
    pendingTime.endDate = event.target.value;
    if (pendingTime.startDate > pendingTime.endDate) {
      pendingTime.startDate = pendingTime.endDate;
      document.getElementById("startDateFilter").value = pendingTime.startDate;
    }
    initFilters();
  });
  document.getElementById("compareModeFilter").addEventListener("change", (event) => {
    pendingTime.compareMode = event.target.value;
    if (pendingTime.compareMode === "custom" && (!pendingTime.compareStartDate || !pendingTime.compareEndDate)) {
      const fallback = pendingComparisonWindow();
      pendingTime.compareStartDate = pendingTime.compareStartDate || fallback.start;
      pendingTime.compareEndDate = pendingTime.compareEndDate || fallback.end;
    }
    initFilters();
  });
  document.getElementById("compareStartDateFilter").addEventListener("change", (event) => {
    pendingTime.compareStartDate = event.target.value;
    if (pendingTime.compareEndDate && pendingTime.compareEndDate < pendingTime.compareStartDate) {
      pendingTime.compareEndDate = pendingTime.compareStartDate;
      document.getElementById("compareEndDateFilter").value = pendingTime.compareEndDate;
    }
    updateApplyTimeButton();
  });
  document.getElementById("compareEndDateFilter").addEventListener("change", (event) => {
    pendingTime.compareEndDate = event.target.value;
    if (pendingTime.compareStartDate && pendingTime.compareStartDate > pendingTime.compareEndDate) {
      pendingTime.compareStartDate = pendingTime.compareEndDate;
      document.getElementById("compareStartDateFilter").value = pendingTime.compareStartDate;
    }
    updateApplyTimeButton();
  });
  document.getElementById("applyTimeFilter").addEventListener("click", () => {
    state.startDate = pendingTime.startDate;
    state.endDate = pendingTime.endDate;
    state.compareMode = pendingTime.compareMode;
    state.compareStartDate = pendingTime.compareMode === "custom" ? pendingTime.compareStartDate : "";
    state.compareEndDate = pendingTime.compareMode === "custom" ? pendingTime.compareEndDate : "";
    syncPendingTimeFromState();
    preserveScroll(() => {
      initFilters();
      render();
    });
  });
  document.getElementById("trendMetric").addEventListener("change", (event) => {
    state.trendMetric = event.target.value;
    preserveScroll(render);
  });
  document.getElementById("attributionTrendMetric").addEventListener("change", (event) => {
    state.attributionMetric = event.target.value;
    preserveScroll(render);
  });
  document.getElementById("resetFilters").addEventListener("click", () => {
    state.country = [];
    state.countryRegion = "ALL";
    state.creativeExpandedType = "";
    state.creativeExpandedSources = [];
    state.expandedRegions = [];
    state.account = [];
    state.product = [];
    state.channelProduct = [];
    state.productForm = [];
    state.channel = [];
    state.operator = [];
    state.landingType = [];
    state.materialType = [];
    state.videoSource = [];
    state.videoSubtype = [];
    state.materialName = [];
    state.adName = [];
    state.channelMarket = "US";
    state.channelCountries = [];
    state.googleAdTypes = [];
    state.googleProducts = [];
    state.googleCountries = [];
    renderChannelScopeControls();
    initFilters();
    preserveScroll(render);
  });
}

function boot() {
  if (!data) return;
  const params = new URLSearchParams(location.search);
  {
    const view = params.get("view");
    state.view = view && DashboardPages.get(view) ? view : state.view;
  }
  state.startDate = params.get("start") || "";
  state.endDate = params.get("end") || "";
  {
    const compareMode = params.get("compareMode");
    state.compareMode = ["previous", "lastMonth", "custom"].includes(compareMode) ? compareMode : "lastMonth";
  }
  state.compareStartDate = params.get("compareStart") || "";
  state.compareEndDate = params.get("compareEnd") || "";
  state.country = params.getAll("country").filter((value) => value && value !== "全部");
  state.account = params.getAll("account").filter((value) => value && value !== "全部");
  state.product = params.getAll("product").filter((value) => value && value !== "全部");
  state.channelProduct = params.getAll("channelProduct").filter((value) => value && value !== "全部");
  state.productForm = params.getAll("productForm").filter((value) => value && value !== "全部");
  state.channel = params.getAll("channel").filter((value) => value && value !== "全部");
  state.operator = params.getAll("operator").filter((value) => value && value !== "全部");
  state.landingType = params.getAll("landingType").filter((value) => value && value !== "全部");
  state.materialType = params.getAll("materialType").filter((value) => value && value !== "全部");
  state.videoSource = params.getAll("videoSource").filter((value) => value && value !== "全部");
  state.videoSubtype = params.getAll("videoSubtype").filter((value) => value && value !== "全部");
  state.materialName = params.getAll("materialName").filter((value) => value && value !== "全部");
  state.adName = params.getAll("adName").filter((value) => value && value !== "全部");
  document.getElementById("dateRange").textContent = `${data.summary.min_date} 至 ${data.summary.max_date}`;
  document.getElementById("generatedAt").textContent = `更新于 ${data.generated_at}`;
  initFilters();
  syncPendingTimeFromState();
  initFilters();
  bindEvents();
  render();
}

boot();
