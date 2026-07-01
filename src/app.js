const data = window.META_DASHBOARD_DATA;

const state = {
  view: "overview",
  startDate: "",
  endDate: "",
  country: [],
  account: [],
  product: [],
  channel: [],
  operator: [],
  materialType: [],
  videoSource: [],
  compareMode: "lastMonth",
  compareStartDate: "",
  compareEndDate: "",
  trendMetric: "spend",
};

const pendingTime = {
  startDate: "",
  endDate: "",
  compareMode: "lastMonth",
  compareStartDate: "",
  compareEndDate: "",
};

const titles = {
  overview: ["总览", "投放规模、效率和趋势"],
  country: ["国家", "国家层面的产品承接和素材贡献"],
  creative: ["素材", "高花费、高回报和风险素材分层"],
  operator: ["投手", "投手、产品和国家组合表现"],
  landing: ["落地页", "活动专题页、详情页和集合页承接表现"],
  onsite: ["站内", "Meta 投放与 Shopify 实际销售承接"],
  channels: ["三渠道", "美国 Shopify、Amazon 和 TikTok 销售趋势"],
};

const metricLabels = {
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

function money(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `$${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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
  return {
    country: "country",
    product_name: "product",
    operator: "operator",
    account_name: "account",
    channel: "channel",
    material_type: "materialType",
    video_source: "videoSource",
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
  appendValues(params, "country", key === "country" ? [value] : state.country);
  appendValues(params, "account", key === "account_name" ? [value] : state.account);
  appendValues(params, "product", key === "product_name" ? [value] : state.product);
  appendValues(params, "channel", key === "channel" ? [value] : state.channel);
  appendValues(params, "operator", key === "operator" ? [value] : state.operator);
  appendValues(params, "materialType", key === "material_type" ? [value] : state.materialType);
  appendValues(params, "videoSource", key === "video_source" ? [value] : state.videoSource);
  return `?${params.toString()}`;
}

function getMetric(row, key) {
  return Number(row?.[key] || 0);
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
  return {
    ...row,
    product_name: inferShopifyProductName(row.product_title),
  };
}

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
  const map = new Map();
  for (const row of rows) {
    const key = dims.map((dim) => row[dim] ?? "Unknown").join("||") || "all";
    if (!map.has(key)) {
      const seed = Object.fromEntries(dims.map((dim) => [dim, row[dim] ?? "Unknown"]));
      Object.assign(seed, {
        spend: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        purchase_times: 0,
        purchase_value: 0,
      });
      map.set(key, seed);
    }
    const item = map.get(key);
    item.spend += getMetric(row, "spend");
    item.impressions += getMetric(row, "impressions");
    item.reach += getMetric(row, "reach");
    item.clicks += getMetric(row, "clicks");
    item.purchase_times += getMetric(row, "purchase_times");
    item.purchase_value += getMetric(row, "purchase_value");
  }
  return [...map.values()].map(deriveMetrics);
}

function deriveMetrics(row) {
  row.roas = row.spend ? row.purchase_value / row.spend : 0;
  row.cpa = row.purchase_times ? row.spend / row.purchase_times : 0;
  row.ctr = row.impressions ? row.clicks / row.impressions : 0;
  row.cvr = row.clicks ? row.purchase_times / row.clicks : 0;
  row.cpm = row.impressions ? (row.spend / row.impressions) * 1000 : 0;
  row.aov = row.purchase_times ? row.purchase_value / row.purchase_times : 0;
  return row;
}

function passesCommonFilters(row) {
  if (state.country.length && !state.country.includes(row.country)) return false;
  if (state.account.length && !state.account.includes(row.account_name)) return false;
  if (state.product.length && !state.product.includes(row.product_name)) return false;
  if (state.operator.length && !state.operator.includes(row.operator)) return false;
  if (state.materialType.length && !state.materialType.includes(row.material_type)) return false;
  if (state.videoSource.length && !state.videoSource.includes(row.video_source)) return false;
  return true;
}

function rowsForWindow(source, start, end) {
  return source.filter((row) => {
    if (start && row.date_start < start) return false;
    if (end && row.date_start > end) return false;
    return passesCommonFilters(row);
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

function shopifyRowsForWindow(source, start, end) {
  return (source || []).map(enrichShopifyRow).filter((row) => {
    if (start && row.date_start < start) return false;
    if (end && row.date_start > end) return false;
    if (state.country.length && !state.country.includes(row.country)) return false;
    if (state.product.length && !state.product.includes(row.product_name)) return false;
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
  if (String(row?.channel || "").startsWith("Shopify")) return inferShopifyProductName(row.product_name);
  return row?.product_name || "Unknown";
}

function channelRowsForWindow(source, start, end) {
  return (source || []).map((row) => ({
    ...row,
    product_name: normalizeChannelProduct(row),
    channel_sales: getMetric(row, "sales"),
    channel_units: getMetric(row, "units"),
  })).filter((row) => {
    if (start && row.date_start < start) return false;
    if (end && row.date_start > end) return false;
    if (state.channel.length && !state.channel.includes(row.channel)) return false;
    if (state.product.length && !state.product.includes(row.product_name)) return false;
    return true;
  });
}

function filteredChannelRows(source = data.us_channel_product_daily, start = state.startDate, end = state.endDate) {
  return channelRowsForWindow(source, start, end);
}

function comparisonChannelRows(source = data.us_channel_product_daily) {
  const period = comparisonWindow();
  if (!period.start || !period.end) return [];
  return channelRowsForWindow(source, period.start, period.end);
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
  const selectedSet = new Set(selected);
  const search = values.length > 5 ? `
    <div class="multi-search">
      <input type="search" placeholder="搜索选项" data-filter-search="${key}" aria-label="搜索${key}筛选项" />
    </div>
  ` : "";
  panel.innerHTML = `
    <div class="multi-actions">
      <button type="button" data-filter-action="clear" data-filter="${key}">清空</button>
      <span>${values.length} 项</span>
    </div>
    ${search}
    <div class="multi-options">
      ${values.map((value, index) => {
        const id = `${key}_${index}`;
        return `
          <label class="check-option" for="${id}">
            <input id="${id}" type="checkbox" value="${escapeHtml(value)}" ${selectedSet.has(value) ? "checked" : ""} data-filter="${key}" />
            <span>${escapeHtml(value)}</span>
          </label>
        `;
      }).join("")}
    </div>
  `;
  updateMultiButton(key);
}

function filterMultiOptions(input) {
  const keyword = input.value.trim().toLowerCase();
  const panel = input.closest(".multi-panel");
  panel.querySelectorAll(".check-option").forEach((option) => {
    const text = option.textContent.trim().toLowerCase();
    option.classList.toggle("hidden", keyword && !text.includes(keyword));
  });
}

function getSelectedValues(key) {
  return [...document.querySelectorAll(`#${key}FilterPanel input[type="checkbox"]:checked`)].map((input) => input.value);
}

function updateMultiButton(key) {
  const button = document.getElementById(`${key}FilterButton`);
  const values = state[key];
  if (!values.length) {
    button.textContent = "全部";
    button.classList.remove("has-selection");
    return;
  }
  button.textContent = values.length === 1 ? values[0] : `已选 ${values.length} 项`;
  button.classList.add("has-selection");
}

function syncPendingTimeFromState() {
  pendingTime.startDate = state.startDate;
  pendingTime.endDate = state.endDate;
  pendingTime.compareMode = state.compareMode;
  pendingTime.compareStartDate = state.compareStartDate;
  pendingTime.compareEndDate = state.compareEndDate;
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
  button.classList.toggle("has-pending", hasPendingTimeChanges());
  renderPeriodHint();
}

function initFilters() {
  const countries = [...new Set(data.fact.map((row) => row.country || "Unknown"))].sort();
  const accounts = [...new Set(data.fact.map((row) => row.account_name || "Unknown"))].sort((a, b) => a.localeCompare(b));
  const products = [...new Set([
    ...data.fact.map((row) => row.product_name || "Unknown"),
    ...(data.shopify_fact || []).map((row) => inferShopifyProductName(row.product_title)),
    ...(data.us_channel_product_daily || []).map((row) => normalizeChannelProduct(row)),
  ])].sort((a, b) => a.localeCompare(b, "zh-CN"));
  const operators = [...new Set(data.fact.map((row) => row.operator || "Unknown"))].sort();
  const channels = [...new Set((data.us_channel_product_daily || []).map((row) => row.channel || "Unknown"))].sort();
  const materialTypes = ["图文", "视频", "合创"].filter((value) => data.fact.some((row) => row.material_type === value));
  const videoSources = ["自产素材", "TT搬运"].filter((value) => data.fact.some((row) => row.video_source === value));
  setMultiOptions("country", countries, state.country);
  setMultiOptions("account", accounts, state.account);
  setMultiOptions("product", products, state.product);
  setMultiOptions("channel", channels, state.channel);
  setMultiOptions("operator", operators, state.operator);
  setMultiOptions("materialType", materialTypes, state.materialType);
  setMultiOptions("videoSource", videoSources, state.videoSource);

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
  return aggregate(rows)[0] || baseSummary();
}

function insightTone(value, inverse = false) {
  if (Math.abs(value) < 0.03) return "neutral";
  const good = inverse ? value < 0 : value > 0;
  return good ? "positive" : "negative";
}

function renderActionInsights(fact, previousFact) {
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
    operator: [
      {
        label: "主要投手",
        title: topOperator ? `${topOperator.operator} 贡献 ${pct(current.purchase_value ? topOperator.purchase_value / current.purchase_value : 0)}` : "暂无投手数据",
        body: topOperator ? `销售额 ${money(topOperator.purchase_value)}，ROAS ${ratio(topOperator.roas)}，CPA ${money(topOperator.cpa)}。` : "当前筛选下没有投手数据。",
        tone: "neutral",
      },
      {
        label: "可复制组合",
        title: bestCombo ? `${bestCombo.country} / ${bestCombo.product_name}` : "暂无可复制组合",
        body: bestCombo ? `ROAS ${ratio(bestCombo.roas)}，转化 ${number(bestCombo.purchase_times)}，可看对应投手组合。` : "需要更多转化量后判断。",
        tone: bestCombo ? "positive" : "neutral",
      },
      {
        label: "组合风险",
        title: operatorRisk ? `${operatorRisk.operator} / ${operatorRisk.product_name}` : "暂无组合风险",
        body: operatorRisk ? `${operatorRisk.country} 花费 ${money(operatorRisk.spend)}，ROAS ${ratio(operatorRisk.roas)}，优先复盘。` : "当前投手组合没有明显风险。",
        tone: operatorRisk ? "negative" : "neutral",
      },
      overviewCards[0],
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
  const pendingText = hasPendingTimeChanges()
    ? `<span class="pending-period">待应用：${escapeHtml(pendingTime.startDate)} 至 ${escapeHtml(pendingTime.endDate)} / 对比 ${escapeHtml(pendingPeriod.label)}</span>`
    : "";
  document.getElementById("periodHint").innerHTML = `
    <span>已应用：${escapeHtml(state.startDate)} 至 ${escapeHtml(state.endDate)}</span>
    <span>对比：${escapeHtml(period.label)}</span>
    ${pendingText}
  `;
}

function renderKpis(rows, previousRows) {
  const summary = summaryOf(rows);
  const previous = summaryOf(previousRows);
  const items = [
    ["花费", summary.spend, previous.spend, money, `${number(summary.impressions)} 展示`],
    ["销售额", summary.purchase_value, previous.purchase_value, money, `${number(summary.purchase_times)} 转化`],
    ["ROAS", summary.roas, previous.roas, ratio, "销售额 / 花费"],
    ["CPA", summary.cpa, previous.cpa, money, "花费 / 转化", true],
    ["CTR", summary.ctr, previous.ctr, pct, `${number(summary.clicks)} 点击`],
    ["CPM", summary.cpm, previous.cpm, money, "每千次展示成本", true],
  ];
  document.getElementById("kpis").innerHTML = items.map(([label, now, before, format, hint, inverse]) => {
    const delta = deltaText(now, before);
    const cls = inverse && delta.cls !== "flat" ? (delta.cls === "up" ? "down" : "up") : delta.cls;
    return `
    <article class="kpi">
      <span>${label}</span>
      <strong>${format(now)}</strong>
      <small class="${cls}">${delta.text} 环比</small>
      <em>${hint}</em>
    </article>
  `;
  }).join("");
}

function renderComparison(currentRows, previousRows) {
  document.getElementById("comparison").innerHTML = "";
}

function renderInsightSummary(fact, previousFact) {
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

function renderLineChart(id, rows, metric) {
  const el = document.getElementById(id);
  if (!rows.length) {
    el.innerHTML = "";
    return;
  }
  const width = Math.max(960, rows.length * 34);
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
  const tickStep = rows.length <= 31 ? 2 : Math.ceil(rows.length / 14);
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
    <svg viewBox="0 0 ${width} ${height}" style="min-width:${width}px" role="img" aria-label="${metricLabels[metric]}趋势">
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

function renderCountryTrendConclusion(factRows) {
  const el = document.getElementById("countryTrendConclusion");
  if (!el) return;
  const countryProducts = aggregate(factRows, ["country", "product_name"]).filter((row) => row.spend > 50);
  if (!countryProducts.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有国家产品数据。</p>`;
    return;
  }
  const topSales = [...countryProducts].sort((a, b) => b.purchase_value - a.purchase_value)[0];
  const best = [...countryProducts].filter((row) => row.purchase_times >= 3).sort((a, b) => b.roas - a.roas)[0];
  const weak = [...countryProducts].filter((row) => row.spend > 200 && row.purchase_times > 0).sort((a, b) => a.roas - b.roas)[0];
  el.innerHTML = `
    <strong>国家产品结论</strong>
    <p>贡献最高是 ${escapeHtml(topSales.country)} / ${escapeHtml(topSales.product_name)}，GMV ${money(topSales.purchase_value)}，ROAS ${ratio(topSales.roas)}。</p>
    ${best ? `<p>效率最好是 ${escapeHtml(best.country)} / ${escapeHtml(best.product_name)}，ROAS ${ratio(best.roas)}，可优先看素材复用。</p>` : ""}
    ${weak ? `<p>表现偏弱是 ${escapeHtml(weak.country)} / ${escapeHtml(weak.product_name)}，花费 ${money(weak.spend)}，ROAS ${ratio(weak.roas)}。</p>` : ""}
  `;
}

function renderCountryQuickFilters(factRows) {
  const el = document.getElementById("countryTrendQuickFilters");
  if (!el) return;
  const topCountries = aggregate(factRows, ["country"]).sort((a, b) => b.purchase_value - a.purchase_value).slice(0, 6);
  const topProducts = aggregate(factRows, ["product_name"]).sort((a, b) => b.purchase_value - a.purchase_value).slice(0, 6);
  const buttons = [
    `<span>国家</span>`,
    ...topCountries.map((row) => `<button data-filter-key="country" data-filter-value="${escapeHtml(row.country)}">${escapeHtml(row.country)}</button>`),
    `<span>产品</span>`,
    ...topProducts.map((row) => `<button data-filter-key="product_name" data-filter-value="${escapeHtml(row.product_name)}">${escapeHtml(row.product_name)}</button>`),
  ];
  el.innerHTML = buttons.join("");
}

function renderDualLineChart(id, rows, leftMetric, rightMetric) {
  const el = document.getElementById(id);
  if (!rows.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有趋势数据。</p>`;
    return;
  }
  const width = Math.max(940, rows.length * 31);
  const height = 370;
  const pad = { top: 18, right: 24, bottom: 76, left: 64 };
  const leftValues = rows.map((row) => Number(row[leftMetric] || 0));
  const rightValues = rows.map((row) => Number(row[rightMetric] || 0));
  const max = Math.max(...leftValues, ...rightValues, 1);
  const x = (index) => pad.left + (index * (width - pad.left - pad.right)) / Math.max(rows.length - 1, 1);
  const y = (value) => height - pad.bottom - (value * (height - pad.top - pad.bottom)) / max;
  const points = (metric) => rows.map((row, index) => `${x(index)},${y(Number(row[metric] || 0))}`).join(" ");
  const grid = [0, 0.25, 0.5, 0.75, 1].map((step) => {
    const yy = pad.top + step * (height - pad.top - pad.bottom);
    const val = max - step * max;
    return `<line class="grid-line" x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}" />
      <text x="8" y="${yy + 4}">${money(val)}</text>`;
  }).join("");
  const tickStep = rows.length <= 31 ? 2 : Math.ceil(rows.length / 14);
  const ticks = rows.filter((_, index) => index === 0 || index === rows.length - 1 || index % tickStep === 0).map((row) => {
    const originalIndex = rows.indexOf(row);
    return `<text class="x-tick" x="${x(originalIndex)}" y="${height - 28}" text-anchor="end" transform="rotate(-35 ${x(originalIndex)} ${height - 28})">${row.date_start.slice(5)}</text>`;
  }).join("");
  const hoverPoints = rows.map((row, index) => {
    const metaValue = Number(row[leftMetric] || 0);
    const shopifyValue = Number(row[rightMetric] || 0);
    const cx = x(index);
    const cy = y(Math.max(metaValue, shopifyValue));
    return `
      <g class="chart-point" tabindex="0">
        <line class="hover-guide" x1="${cx}" x2="${cx}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
        <circle class="point-hit" cx="${cx}" cy="${y(metaValue)}" r="13"></circle>
        <circle class="point-hit" cx="${cx}" cy="${y(shopifyValue)}" r="13"></circle>
        <circle class="point-dot meta-point" cx="${cx}" cy="${y(metaValue)}" r="3.5"></circle>
        <circle class="point-dot shopify-point" cx="${cx}" cy="${y(shopifyValue)}" r="3.5"></circle>
        <g class="chart-tooltip" transform="translate(${Math.min(Math.max(cx - 82, 8), width - 172)} ${cy > 84 ? cy - 66 : cy + 18})">
          <rect width="164" height="56" rx="6"></rect>
          <text x="10" y="17">${escapeHtml(row.date_start)}</text>
          <text x="10" y="33">Meta ${escapeHtml(money(metaValue))}</text>
          <text x="10" y="48">Shopify ${escapeHtml(money(shopifyValue))}</text>
        </g>
        <title>${escapeHtml(`${row.date_start} · Meta ${money(metaValue)} · Shopify ${money(shopifyValue)}`)}</title>
      </g>
    `;
  }).join("");
  el.innerHTML = `
    <div class="dual-legend">
      <span><i class="legend-dot meta-dot"></i>Meta GMV</span>
      <span><i class="legend-dot shopify-dot"></i>Shopify 净销售</span>
    </div>
    <svg viewBox="0 0 ${width} ${height}" style="min-width:${width}px" role="img" aria-label="Meta GMV 和 Shopify 净销售趋势">
      <g class="axis">${grid}${ticks}</g>
      <polyline class="line meta-line" points="${points(leftMetric)}"></polyline>
      <polyline class="line shopify-line" points="${points(rightMetric)}"></polyline>
      ${hoverPoints}
    </svg>
  `;
}

function renderChannelLineChart(id, rows) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有美国三渠道销售数据。</p>`;
    return;
  }
  const channelOrder = ["Shopify US", "Amazon US", "TikTok Shop"];
  const channels = channelOrder.filter((channel) => rows.some((row) => row.channel === channel));
  const colors = {
    "Shopify US": "#047857",
    "Amazon US": "#a16207",
    "TikTok Shop": "#2563eb",
  };
  const dates = [...new Set(rows.map((row) => row.date_start))].sort();
  const byKey = new Map(rows.map((row) => [`${row.date_start}||${row.channel}`, row]));
  const series = channels.map((channel) => ({
    channel,
    values: dates.map((date) => ({
      date_start: date,
      channel,
      value: getMetric(byKey.get(`${date}||${channel}`), "channel_sales"),
    })),
  }));
  const width = Math.max(980, dates.length * 32);
  const height = 380;
  const pad = { top: 18, right: 24, bottom: 76, left: 64 };
  const max = Math.max(...series.flatMap((line) => line.values.map((point) => point.value)), 1);
  const x = (index) => pad.left + (index * (width - pad.left - pad.right)) / Math.max(dates.length - 1, 1);
  const y = (value) => height - pad.bottom - (value * (height - pad.top - pad.bottom)) / max;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((step) => {
    const yy = pad.top + step * (height - pad.top - pad.bottom);
    const val = max - step * max;
    return `<line class="grid-line" x1="${pad.left}" x2="${width - pad.right}" y1="${yy}" y2="${yy}" />
      <text x="8" y="${yy + 4}">${money(val)}</text>`;
  }).join("");
  const tickStep = dates.length <= 31 ? 2 : Math.ceil(dates.length / 14);
  const ticks = dates.filter((_, index) => index === 0 || index === dates.length - 1 || index % tickStep === 0).map((date) => {
    const index = dates.indexOf(date);
    return `<text class="x-tick" x="${x(index)}" y="${height - 28}" text-anchor="end" transform="rotate(-35 ${x(index)} ${height - 28})">${date.slice(5)}</text>`;
  }).join("");
  const lines = series.map((line) => {
    const points = line.values.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
    return `<polyline class="line" style="stroke:${colors[line.channel]}" points="${points}"></polyline>`;
  }).join("");
  const hoverPoints = dates.map((date, index) => {
    const values = channels.map((channel) => ({
      channel,
      value: getMetric(byKey.get(`${date}||${channel}`), "channel_sales"),
    }));
    const cx = x(index);
    const topValue = Math.max(...values.map((item) => item.value), 0);
    const cy = y(topValue);
    return `
      <g class="chart-point" tabindex="0">
        <line class="hover-guide" x1="${cx}" x2="${cx}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
        ${values.map((item) => `<circle class="point-hit" cx="${cx}" cy="${y(item.value)}" r="13"></circle>
          <circle class="point-dot" style="stroke:${colors[item.channel]}" cx="${cx}" cy="${y(item.value)}" r="3.5"></circle>`).join("")}
        <g class="chart-tooltip channel-tooltip" transform="translate(${Math.min(Math.max(cx - 96, 8), width - 200)} ${cy > 104 ? cy - 86 : cy + 18})">
          <rect width="192" height="76" rx="6"></rect>
          <text x="10" y="17">${escapeHtml(date)}</text>
          ${values.map((item, lineIndex) => `<text x="10" y="${35 + lineIndex * 15}">${escapeHtml(item.channel)} ${escapeHtml(money(item.value))}</text>`).join("")}
        </g>
        <title>${escapeHtml(`${date} · ${values.map((item) => `${item.channel} ${money(item.value)}`).join(" · ")}`)}</title>
      </g>
    `;
  }).join("");
  el.innerHTML = `
    <div class="dual-legend">
      ${channels.map((channel) => `<span><i class="legend-dot" style="background:${colors[channel]}"></i>${escapeHtml(channel)}</span>`).join("")}
    </div>
    <svg viewBox="0 0 ${width} ${height}" style="min-width:${width}px" role="img" aria-label="美国三渠道每日销售趋势">
      <g class="axis">${grid}${ticks}</g>
      ${lines}
      ${hoverPoints}
    </svg>
  `;
}

function renderUsChannelConclusion(rows) {
  const el = document.getElementById("usChannelTrendConclusion");
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有美国三渠道销售数据。</p>`;
    return;
  }
  const channelRows = channelAggregate(rows, ["channel"]).sort((a, b) => b.channel_sales - a.channel_sales);
  const latestByChannel = channelRows.map((row) => {
    const latest = rows.filter((item) => item.channel === row.channel && getMetric(item, "channel_sales") > 0)
      .sort((a, b) => String(b.date_start).localeCompare(String(a.date_start)))[0];
    return `${row.channel} ${latest?.date_start || "无数据"}`;
  }).join("；");
  const top = channelRows[0];
  const total = channelRows.reduce((sum, row) => sum + getMetric(row, "channel_sales"), 0);
  el.innerHTML = `
    <strong>三渠道结论</strong>
    <p>${escapeHtml(top.channel)} 当前销售额最高，为 ${money(top.channel_sales)}，三渠道均统一为美元口径。</p>
    <p>最后有数据日期：${escapeHtml(latestByChannel)}。Amazon/TikTok 已按 2026-06-03 参考值校准，TikTok 按 6.96 汇率换算美元。</p>
  `;
}

function renderOnsiteTrendConclusion(rows) {
  const el = document.getElementById("onsiteTrendConclusion");
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = `<p class="empty">当前筛选下没有站内趋势数据。</p>`;
    return;
  }
  const totals = rows.reduce((sum, row) => ({
    meta_sales: sum.meta_sales + getMetric(row, "meta_sales"),
    shopify_sales: sum.shopify_sales + getMetric(row, "shopify_sales"),
  }), { meta_sales: 0, shopify_sales: 0 });
  const gapRows = rows.map((row) => ({
    ...row,
    gap: getMetric(row, "shopify_sales") - getMetric(row, "meta_sales"),
  }));
  const strongest = [...gapRows].sort((a, b) => b.gap - a.gap)[0];
  const weakest = [...gapRows].sort((a, b) => a.gap - b.gap)[0];
  const ratioToMeta = totals.meta_sales ? totals.shopify_sales / totals.meta_sales : 0;
  const tone = ratioToMeta >= 1 ? "up" : "down";
  el.innerHTML = `
    <strong>站内趋势结论</strong>
    <p>本周期 Shopify 净销售 / Meta GMV 为 <span class="${tone}">${ratio(ratioToMeta)}</span>，用于判断站内承接是否跟上投放端。</p>
    <p>站内跑赢最明显是 ${escapeHtml(strongest.date_start)}，差额 ${money(strongest.gap)}；偏弱日期是 ${escapeHtml(weakest.date_start)}，差额 ${money(weakest.gap)}。</p>
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
        <div class="bar-sub">ROAS ${ratio(row.roas)} / CPA ${money(row.cpa)} / 转化 ${number(row.purchase_times)}</div>
      </div>
    `;
  }).join("") || `<p class="empty">当前筛选下暂无排行数据。</p>`;
}

function renderRankTable(id, rows, labelKey, metric = "spend", options = {}) {
  const limit = options.limit || 80;
  const top = [...rows]
    .filter((row) => getMetric(row, metric) > 0)
    .sort((a, b) => getMetric(b, metric) - getMetric(a, metric))
    .slice(0, limit);
  if (!top.length) {
    document.getElementById(id).innerHTML = `<p class="empty">当前筛选下暂无排行数据。</p>`;
    return;
  }
  const clickable = options.clickable !== false;
  document.getElementById(id).innerHTML = `
    <div class="rank-table-wrap">
      <table class="rank-table">
        <thead>
          <tr>
            <th>排名</th>
            <th>${escapeHtml(options.label || "名称")}</th>
            <th class="num">${escapeHtml(metricLabels[metric] || metric)}</th>
            <th class="num">ROAS</th>
            <th class="num">转化</th>
            <th class="num">CPA</th>
          </tr>
        </thead>
        <tbody>
          ${top.map((row, index) => {
            const label = row[labelKey] || "Unknown";
            const labelHtml = clickable
              ? `<a class="link-filter" data-filter-key="${labelKey}" data-filter-value="${escapeHtml(label)}" href="${filterHref(labelKey, label)}">${escapeHtml(label)}</a>`
              : `<span>${escapeHtml(label)}</span>`;
            return `
              <tr>
                <td>${index + 1}</td>
                <td class="name-cell">${labelHtml}</td>
                <td class="num">${formatMetric(metric, getMetric(row, metric))}</td>
                <td class="num">${ratio(row.roas)}</td>
                <td class="num">${number(row.purchase_times)}</td>
                <td class="num">${money(row.cpa)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function statusClass(row) {
  if (row.roas >= 2.2) return "good";
  if (row.roas < 1.2 && row.spend > 300) return "bad";
  return "warn";
}

function renderTable(id, rows, columns, limit = 80, options = {}) {
  const visible = rows.slice(0, limit);
  const head = columns.map((col) => `<th class="${col.num ? "num" : ""} ${col.sticky ? "sticky-col" : ""}">${col.label}</th>`).join("");
  const body = visible.map((row) => `
    <tr class="${escapeHtml(row._rowClass || "")}">
      ${columns.map((col) => {
        const raw = col.value ? col.value(row) : row[col.key];
        const val = col.format ? (col.format.length > 1 ? col.format(raw, row) : col.format(raw)) : escapeHtml(raw);
        const dataLabel = escapeHtml(col.label);
        const filterAttrs = col.filterKey && raw ? ` data-filter-key="${col.filterKey}" data-filter-value="${escapeHtml(raw)}"` : "";
        const content = col.filterKey && raw ? `<a class="cell-filter-button"${filterAttrs} href="${filterHref(col.filterKey, raw)}">${val}</a>` : val;
        return `<td data-label="${dataLabel}" class="${col.num ? "num" : ""} ${col.name ? "name-cell" : ""} ${col.sticky ? "sticky-col" : ""} ${col.filterKey ? "click-cell" : ""}">${content}</td>`;
      }).join("")}
    </tr>
  `).join("");
  const summaryRows = options.summaryRows || rows;
  const previousSummaryRows = options.previousSummaryRows || [];
  const summaryData = tableSummary(summaryRows);
  const previousSummaryData = previousSummaryRows.length ? tableSummary(previousSummaryRows) : null;
  const summary = summaryRows.length ? `<tfoot><tr>${columns.map((col, index) => renderSummaryCell(col, summaryData, index, previousSummaryData)).join("")}</tr></tfoot>` : "";
  document.getElementById(id).innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>${summary}`;
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
    case "operatorProductTable": {
      const top = topBy("spend");
      return `投手产品组合里，${label(top, ["operator", "product_name"])} 花费最高，为 ${money(top.spend)}。${bestRoas ? `高效组合为 ${label(bestRoas, ["operator", "product_name"])}，ROAS ${ratio(bestRoas.roas)}。` : ""}`;
    }
    case "operatorCountryTable": {
      const top = topBy("spend");
      return `投手国家组合里，${label(top, ["operator", "country"])} 花费最高，为 ${money(top.spend)}。${bestRoas ? `高效组合为 ${label(bestRoas, ["operator", "country"])}，ROAS ${ratio(bestRoas.roas)}。` : ""}`;
    }
    case "landingTable": {
      const top = topBy("spend");
      return `落地页组合里，${label(top, ["landing_type", "product_name", "country"])} 花费最高，为 ${money(top.spend)}，ROAS ${ratio(top.roas)}。`;
    }
    case "landingMaterialTable": {
      const top = topBy("purchase_value");
      return `落地页素材中，${label(top, ["landing_type", "material_name"])} 贡献最高，GMV ${money(top.purchase_value)}、ROAS ${ratio(top.roas)}。`;
    }
    case "onsiteCountryTable": {
      const gap = [...rows].sort((a, b) => Math.abs(getMetric(b, "share_gap")) - Math.abs(getMetric(a, "share_gap")))[0];
      return `站内净销售合计 ${money(summary.shopify_sales)}，Meta 花费合计 ${money(summary.spend)}。占比偏差最大的是 ${label(gap, ["country"])}，需判断是否加码或降投。`;
    }
    case "onsiteProductComparisonTable": {
      const top = topBy("shopify_sales");
      return `站内产品销售最高是 ${label(top, ["product_name"])}，净销售 ${money(top.shopify_sales)}。重点看净销售占比和 Meta 花费占比是否匹配。`;
    }
    case "onsiteProductTable": {
      const top = topBy("shopify_sales");
      return `国家 x 产品层面，${label(top, ["country", "product_name"])} 站内净销售最高。效率指数高于 1 代表站内占比跑赢投放占比。`;
    }
    case "usChannelProductTable": {
      const top = topBy("channel_sales");
      const topUnit = topBy("channel_units");
      return `美国三渠道里，${label(top, ["channel", "product_name"])} 销售额最高，为 ${money(top.channel_sales)}。销量最高是 ${label(topUnit, ["channel", "product_name"])}，共 ${number(topUnit.channel_units)} 件。`;
    }
    case "usChannelSummaryTable": {
      const top = topBy("channel_sales");
      const topUnit = topBy("channel_units");
      return `当前渠道销售额最高是 ${label(top, ["channel"])}，销售额 ${money(top.channel_sales)}；销量最高是 ${label(topUnit, ["channel"])}，共 ${number(topUnit.channel_units)} 件。`;
    }
    case "onsiteRawProductTable": {
      const top = topBy("net_sales");
      return `原始商品用于校验映射，当前最高商品是 ${label(top, ["product_title"])}，净销售 ${money(top.net_sales)}。`;
    }
    case "onsiteUnmatchedTable":
      return `未匹配商品用于后续补产品映射；若净销售额较高，应优先补充映射规则。`;
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
    "sales_gap",
    "country_count",
  ];
  for (const key of sumKeys) {
    summary[key] = rows.reduce((sum, row) => sum + getMetric(row, key), 0);
  }
  summary.roas = summary.spend ? summary.purchase_value / summary.spend : 0;
  summary.meta_roas = summary.spend ? summary.meta_purchase_value / summary.spend : 0;
  summary.onsite_roas = summary.spend ? summary.shopify_sales / summary.spend : 0;
  summary.cpa = summary.purchase_times ? summary.spend / summary.purchase_times : 0;
  summary.ctr = summary.impressions ? summary.clicks / summary.impressions : 0;
  summary.cvr = summary.clicks ? summary.purchase_times / summary.clicks : 0;
  summary.cpm = summary.impressions ? (summary.spend / summary.impressions) * 1000 : 0;
  summary.aov = summary.purchase_times ? summary.purchase_value / summary.purchase_times : (summary.orders ? summary.net_sales / summary.orders : 0);
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
  const mapping = {
    country: "country",
    product_name: "product",
    channel: "channel",
    operator: "operator",
    account_name: "account",
    material_type: "materialType",
    video_source: "videoSource",
  };
  const stateKey = mapping[key];
  if (!stateKey || !value) return;
  state[stateKey] = [value];
  updateMultiButton(stateKey);
  render();
}

function bindContentFilters() {}

function preserveScroll(callback) {
  const x = window.scrollX;
  const y = window.scrollY;
  callback();
  requestAnimationFrame(() => window.scrollTo(x, y));
}

function renderContextFilters() {
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

function materialComparisonRows(factRows, previousRows) {
  const currentTotal = aggregate(factRows)[0] || deriveMetrics({ spend: 0, impressions: 0, clicks: 0, purchase_times: 0, purchase_value: 0 });
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
    return {
      ...current,
      _rowClass: def.child ? "material-child-row" : "",
      is_child: Boolean(def.child),
      material_label: def.label,
      material_type: def.material_type,
      video_source: def.video_source,
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

function creativeCard(row) {
  return `
    <article class="creative-card ${statusClass(row)}">
      <div class="creative-card-head">
        <div class="tag-row">
          <span class="tag">${escapeHtml(row.product_name)}</span>
          <span class="tag material-tag">${escapeHtml(row.material_name || materialName(row))}</span>
          ${row.video_source ? `<span class="tag">${escapeHtml(row.video_source)}</span>` : ""}
        </div>
        <strong>${ratio(row.roas)} ROAS</strong>
      </div>
      <p>${escapeHtml(row.ad_name)}</p>
      <div class="creative-metrics">
        <span>${money(row.spend)} 花费</span>
        <span>${number(row.purchase_times)} 转化</span>
        <span>${pct(row.ctr)} CTR</span>
        <span>${pct(row.cvr)} CVR</span>
        <span>${money(row.cpa)} CPA</span>
      </div>
    </article>
  `;
}

function renderCreativeGroups(rows) {
  const eligible = rows.filter((row) => row.spend > 100);
  const highSpend = [...eligible].sort((a, b) => b.spend - a.spend).slice(0, 5);
  const highRoas = [...eligible].filter((row) => row.purchase_times >= 3).sort((a, b) => b.roas - a.roas).slice(0, 5);
  const risk = [...eligible].filter((row) => row.roas < 1.3 || (row.ctr > 0.025 && row.roas < 1.8)).sort((a, b) => b.spend - a.spend).slice(0, 5);
  document.getElementById("highSpendCreatives").innerHTML = highSpend.map(creativeCard).join("");
  document.getElementById("highRoasCreatives").innerHTML = highRoas.map(creativeCard).join("");
  document.getElementById("riskCreatives").innerHTML = risk.map(creativeCard).join("") || `<p class="empty">当前筛选下没有明显风险素材。</p>`;
}

function renderOperatorAlerts(rows) {
  const combos = aggregate(rows, ["operator", "product_name", "country"]).filter((row) => row.spend > 200);
  const risks = combos.filter((row) => row.roas < 1.4).sort((a, b) => b.spend - a.spend).slice(0, 5);
  const wins = combos.filter((row) => row.roas >= 2 && row.purchase_times >= 5).sort((a, b) => b.purchase_value - a.purchase_value).slice(0, 3);
  document.getElementById("operatorAlerts").innerHTML = [
    ...wins.map((row) => `<article class="alert-item good-alert"><strong>可放量组合</strong><span>${escapeHtml(row.operator)} / ${escapeHtml(row.product_name)} / ${escapeHtml(row.country)}，ROAS ${ratio(row.roas)}</span></article>`),
    ...risks.map((row) => `<article class="alert-item"><strong>需复盘组合</strong><span>${escapeHtml(row.operator)} / ${escapeHtml(row.product_name)} / ${escapeHtml(row.country)}，花费 ${money(row.spend)}，ROAS ${ratio(row.roas)}</span></article>`),
  ].join("") || `<p class="empty">当前筛选下没有明显组合提醒。</p>`;
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

function statusTag(value) {
  const cls = {
    "高效可加": "status-good",
    "投放偏重": "status-bad",
    "可加码": "status-good",
    "承接弱": "status-bad",
    "站内强广告弱": "status-blue",
    "Meta高于站内": "status-warn",
  }[value] || "status-neutral";
  return `<span class="status-tag ${cls}">${escapeHtml(value)}</span>`;
}

function salesGapBadge(value) {
  const cls = value >= 0 ? "up" : "down";
  const sign = value >= 0 ? "+" : "";
  return `<span class="${cls}">${sign}${money(value)}</span>`;
}

function shareGapBadge(value) {
  const cls = Math.abs(value) < 0.005 ? "flat" : (value > 0 ? "up" : "down");
  const sign = value > 0 ? "+" : "";
  return `<span class="${cls}">${sign}${pct(value)}</span>`;
}

function efficiencyBadge(value) {
  const cls = value >= 1.2 ? "up" : (value && value < 0.8 ? "down" : "flat");
  const text = value >= 99 ? "仅站内" : ratio(value);
  return `<span class="${cls}">${text}</span>`;
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

function renderChannels() {
  const currentRows = filteredChannelRows(data.us_channel_product_daily);
  const previousRows = comparisonChannelRows(data.us_channel_product_daily);
  const channelDailyRows = channelAggregate(currentRows, ["date_start", "channel"])
    .sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)) || String(a.channel).localeCompare(String(b.channel)));
  renderChannelLineChart("usChannelTrend", channelDailyRows);
  renderUsChannelConclusion(channelDailyRows);

  const previousSummaryRows = channelAggregate(previousRows, ["channel"]);
  const channelSummaryRows = addChannelComparison(
    channelAggregate(currentRows, ["channel"]).sort((a, b) => b.channel_sales - a.channel_sales),
    previousSummaryRows
  );
  renderTable("usChannelSummaryTable", channelSummaryRows, [
    { key: "channel", label: "渠道", sticky: true, filterKey: "channel" },
    { key: "channel_units", label: "销量", value: (row) => row, format: (row) => metricWithDelta(row, "channel_units", number, "units_delta"), summaryValue: (row) => row.channel_units, summaryFormat: number, num: true },
    { key: "channel_sales", label: "销售额", value: (row) => row, format: (row) => metricWithDelta(row, "channel_sales", money, "sales_delta"), summaryValue: (row) => row.channel_sales, summaryFormat: money, num: true },
    { key: "sales_share", label: "销售占比", format: pct, num: true },
    { key: "unit_value", label: "件单价", value: (row) => row, format: (row) => metricWithDelta(row, "unit_value", money, "unit_value_delta"), summaryValue: (row) => row.unit_value, summaryFormat: money, num: true },
  ], 20, { previousSummaryRows });

  const previousProductRows = channelAggregate(previousRows, ["channel", "product_name"]);
  const channelProductRows = addChannelComparison(
    channelAggregate(currentRows, ["channel", "product_name"]),
    previousProductRows
  ).sort((a, b) => b.channel_units - a.channel_units || b.channel_sales - a.channel_sales);
  renderTable("usChannelProductTable", channelProductRows, [
    { key: "channel", label: "渠道", sticky: true, filterKey: "channel" },
    { key: "product_name", label: "产品", filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "channel_units", label: "销量", value: (row) => row, format: (row) => metricWithDelta(row, "channel_units", number, "units_delta"), summaryValue: (row) => row.channel_units, summaryFormat: number, num: true },
    { key: "channel_sales", label: "销售额", value: (row) => row, format: (row) => metricWithDelta(row, "channel_sales", money, "sales_delta"), summaryValue: (row) => row.channel_sales, summaryFormat: money, num: true },
    { key: "sales_share", label: "销售占比", format: pct, num: true },
    { key: "unit_value", label: "件单价", value: (row) => row, format: (row) => metricWithDelta(row, "unit_value", money, "unit_value_delta"), summaryValue: (row) => row.unit_value, summaryFormat: money, num: true },
  ], 160, { previousSummaryRows: previousProductRows });
}

function renderOnsiteSummary(factRows, shopifyRows, previousFact, previousShopify) {
  const meta = summaryOf(factRows);
  const period = comparisonWindow();
  const exactDaily = !state.product.length
    ? filteredShopifyDailyRows(state.country.length ? data.shopify_country_daily : data.shopify_daily)
    : shopifyRows;
  const exactPreviousDaily = !state.product.length
    ? filteredShopifyDailyRows(state.country.length ? data.shopify_country_daily : data.shopify_daily, period.start, period.end)
    : previousShopify;
  const shopify = shopifyAggregate(exactDaily)[0] || {};
  const prevShopify = shopifyAggregate(exactPreviousDaily)[0] || {};
  const onsiteRoas = meta.spend ? getMetric(shopify, "net_sales") / meta.spend : 0;
  const previousOnsiteRoas = summaryOf(previousFact).spend ? getMetric(prevShopify, "net_sales") / summaryOf(previousFact).spend : 0;
  const allShopifyRows = shopifyRowsForWindow(data.shopify_fact, state.startDate, state.endDate);
  const unmatchedSales = allShopifyRows.filter((row) => row.product_name === "未匹配").reduce((sum, row) => sum + getMetric(row, "net_sales"), 0);
  const totalShopifySales = allShopifyRows.reduce((sum, row) => sum + getMetric(row, "net_sales"), 0);
  const matchedRate = totalShopifySales ? 1 - (unmatchedSales / totalShopifySales) : 1;
  const ignoredFilters = [state.account.length && "账户", state.operator.length && "投手", state.materialType.length && "素材类型", state.videoSource.length && "视频来源"].filter(Boolean);
  document.getElementById("onsiteSummary").innerHTML = `
    <article>
      <span>Shopify 净销售额</span>
      <strong>${money(shopify.net_sales)}</strong>
      <small class="${deltaText(shopify.net_sales, prevShopify.net_sales).cls}">${deltaText(shopify.net_sales, prevShopify.net_sales).text}</small>
    </article>
    <article>
      <span>站内 ROAS</span>
      <strong>${ratio(onsiteRoas)}</strong>
      <small class="${deltaText(onsiteRoas, previousOnsiteRoas).cls}">${deltaText(onsiteRoas, previousOnsiteRoas).text}</small>
    </article>
    <article>
      <span>订单 / 净销量</span>
      <strong>${number(shopify.orders)} / ${number(shopify.net_items_sold)}</strong>
      <small>AOV ${money(shopify.aov)}</small>
    </article>
    <article>
      <span>Meta 与站内差额</span>
      <strong>${money(getMetric(shopify, "net_sales") - meta.purchase_value)}</strong>
      <small>Meta GMV ${money(meta.purchase_value)} / Shopify净销售 ${money(shopify.net_sales)}</small>
    </article>
    <article>
      <span>产品匹配覆盖</span>
      <strong>${pct(matchedRate)}</strong>
      <small>未匹配销售 ${money(unmatchedSales)}</small>
    </article>
    ${ignoredFilters.length ? `<p class="onsite-note">提示：Shopify 只能响应日期、国家、产品筛选；当前站内数据未应用 ${ignoredFilters.join("、")} 筛选。</p>` : ""}
  `;
}

function renderOnsite(factRows, previousFact) {
  const shopifyRows = filteredShopifyRows();
  const previousShopify = comparisonShopifyRows();
  renderOnsiteSummary(factRows, shopifyRows, previousFact, previousShopify);

  const metaDaily = aggregate(factRows, ["date_start"]);
  const shopDaily = (!state.country.length && !state.product.length)
    ? shopifyAggregate(filteredShopifyDailyRows(data.shopify_daily), ["date_start"])
    : shopifyAggregate(shopifyRows, ["date_start"]);
  const dates = [...new Set([...metaDaily.map((row) => row.date_start), ...shopDaily.map((row) => row.date_start)])].sort();
  const metaByDate = new Map(metaDaily.map((row) => [row.date_start, row]));
  const shopByDate = new Map(shopDaily.map((row) => [row.date_start, row]));
  const onsiteTrendRows = dates.map((date) => ({
    date_start: date,
    meta_sales: getMetric(metaByDate.get(date), "purchase_value"),
    shopify_sales: getMetric(shopByDate.get(date), "net_sales"),
  }));
  renderDualLineChart("onsiteTrend", onsiteTrendRows, "meta_sales", "shopify_sales");
  renderOnsiteTrendConclusion(onsiteTrendRows);

  const countryShopifyRows = !state.product.length
    ? filteredShopifyDailyRows(data.shopify_country_daily)
    : shopifyRows;
  const countryRows = addOnsiteShareMetrics(joinedOnsiteRows(factRows, countryShopifyRows, ["country"]))
    .sort((a, b) => b.shopify_sales - a.shopify_sales);
  renderTable("onsiteCountryTable", countryRows, [
    { key: "country", label: "国家", sticky: true, filterKey: "country" },
    { key: "status", label: "判断", value: onsiteStatus, format: statusTag },
    { key: "shopify_sales", label: "Shopify净销售", format: money, num: true },
    { key: "shopify_sales_share", label: "净销售占比", format: pct, num: true },
    { key: "meta_spend_share", label: "Meta花费占比", format: pct, num: true },
    { key: "share_gap", label: "占比差", format: shareGapBadge, num: true },
    { key: "efficiency_index", label: "效率指数", format: efficiencyBadge, num: true },
    { key: "meta_purchase_value", label: "Meta GMV", format: money, num: true },
    { key: "sales_gap", label: "销售差额", format: salesGapBadge, num: true },
    { key: "spend", label: "Meta花费", format: money, num: true },
    { key: "onsite_roas", label: "站内ROAS", format: ratio, num: true },
    { key: "meta_roas", label: "Meta ROAS", format: ratio, num: true },
    { key: "shopify_orders", label: "订单", format: number, num: true },
    { key: "shopify_net_items_sold", label: "净销量", format: number, num: true },
    { key: "shopify_aov", label: "AOV", format: money, num: true },
  ], 60, {
    previousSummaryRows: addOnsiteShareMetrics(joinedOnsiteRows(previousFact, !state.product.length
      ? filteredShopifyDailyRows(data.shopify_country_daily, comparisonWindow().start, comparisonWindow().end)
      : previousShopify, ["country"])),
  });

  const productComparisonRows = productOverviewRows(factRows, previousFact, shopifyRows, previousShopify);
  const previousProductComparisonRows = addOnsiteShareMetrics(joinedOnsiteRows(previousFact, previousShopify, ["product_name"]));
  renderTable("onsiteProductComparisonTable", productComparisonRows, [
    { key: "product_name", label: "产品", sticky: true, filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "status", label: "判断", value: onsiteStatus, format: statusTag },
    { key: "shopify_sales", label: "Shopify净销售", value: (row) => row, format: (row) => metricWithDelta(row, "shopify_sales", money, "shopify_sales_delta"), summaryValue: (row) => row.shopify_sales, summaryFormat: money, num: true },
    { key: "shopify_sales_share", label: "净销售占比", format: pct, num: true },
    { key: "spend", label: "Meta花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "meta_spend_share", label: "花费占比", format: pct, num: true },
    { key: "share_gap", label: "占比差", format: shareGapBadge, num: true },
    { key: "efficiency_index", label: "效率指数", format: efficiencyBadge, num: true },
    { key: "meta_purchase_value", label: "Meta GMV", format: money, num: true },
    { key: "onsite_roas", label: "站内ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "onsite_roas", ratio, "onsite_roas_delta"), summaryValue: (row) => row.onsite_roas, summaryFormat: ratio, num: true },
    { key: "meta_roas", label: "Meta ROAS", format: ratio, num: true },
    { key: "shopify_orders", label: "订单", format: number, num: true },
    { key: "shopify_net_items_sold", label: "净销量", format: number, num: true },
  ], 80, { previousSummaryRows: previousProductComparisonRows });

  const productRows = addOnsiteShareMetrics(joinedOnsiteRows(factRows, shopifyRows, ["country", "product_name"]))
    .filter((row) => row.spend > 0 || row.shopify_sales > 0)
    .sort((a, b) => (b.shopify_sales + b.meta_purchase_value) - (a.shopify_sales + a.meta_purchase_value));
  renderTable("onsiteProductTable", productRows, [
    { key: "country", label: "国家", sticky: true, filterKey: "country" },
    { key: "product_name", label: "产品归类", filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "status", label: "判断", value: onsiteStatus, format: statusTag },
    { key: "shopify_sales", label: "Shopify净销售", format: money, num: true },
    { key: "shopify_sales_share", label: "净销售占比", format: pct, num: true },
    { key: "meta_spend_share", label: "Meta花费占比", format: pct, num: true },
    { key: "share_gap", label: "占比差", format: shareGapBadge, num: true },
    { key: "efficiency_index", label: "效率指数", format: efficiencyBadge, num: true },
    { key: "meta_purchase_value", label: "Meta GMV", format: money, num: true },
    { key: "sales_gap", label: "销售差额", format: salesGapBadge, num: true },
    { key: "spend", label: "Meta花费", format: money, num: true },
    { key: "onsite_roas", label: "站内ROAS", format: ratio, num: true },
    { key: "meta_roas", label: "Meta ROAS", format: ratio, num: true },
    { key: "shopify_orders", label: "订单", format: number, num: true },
    { key: "shopify_net_items_sold", label: "净销量", format: number, num: true },
  ], 160, {
    previousSummaryRows: addOnsiteShareMetrics(joinedOnsiteRows(previousFact, previousShopify, ["country", "product_name"])),
  });

  renderTable("onsiteRawProductTable", rawShopifyProductRows(shopifyRows), [
    { key: "country", label: "国家", sticky: true, filterKey: "country" },
    { key: "product_title", label: "Shopify商品名", name: true, format: escapeHtml },
    { key: "product_name", label: "归类产品", filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "net_sales", label: "净销售额", format: money, num: true },
    { key: "sales_share", label: "净销售占比", format: pct, num: true },
    { key: "orders", label: "订单", format: number, num: true },
    { key: "net_items_sold", label: "净销量", format: number, num: true },
    { key: "aov", label: "AOV", format: money, num: true },
  ], 200, { previousSummaryRows: rawShopifyProductRows(previousShopify) });

  renderTable("onsiteUnmatchedTable", unmatchedShopifyProducts(shopifyRows), [
    { key: "product_title", label: "Shopify商品名", sticky: true, name: true, format: escapeHtml },
    { key: "net_sales", label: "净销售额", format: money, num: true },
    { key: "orders", label: "订单", format: number, num: true },
    { key: "net_items_sold", label: "净销量", format: number, num: true },
    { key: "country_count", label: "国家数", format: number, num: true },
  ], 80, { previousSummaryRows: unmatchedShopifyProducts(previousShopify) });
}

function render() {
  updateStickyOffsets();
  const [title, subtitle] = titles[state.view];
  document.getElementById("viewTitle").textContent = title;
  document.getElementById("viewSubtitle").textContent = subtitle;
  document.getElementById("periodBadge").textContent = `${daysBetween(state.startDate, state.endDate)} 天`;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === state.view));
  document.querySelectorAll("[id$='View']").forEach((section) => section.classList.add("hidden"));
  document.getElementById(`${state.view}View`).classList.remove("hidden");
  renderContextFilters();
  renderPeriodHint();

  const fact = filteredRows(data.fact);
  const previousFact = comparisonRows(data.fact);
  const adRows = filteredRows(data.ads || []).map((row) => ({ ...row, video_source: row.video_source || "", material_name: materialName(row) }));
  const previousAdRows = comparisonRows(data.ads || []).map((row) => ({ ...row, video_source: row.video_source || "", material_name: materialName(row) }));
  const landingRows = adRows.map((row) => ({ ...row, landing_type: landingPageType(row) }));
  const previousLandingRows = previousAdRows.map((row) => ({ ...row, landing_type: landingPageType(row) }));
  renderInsightSummary(fact, previousFact);
  renderKpis(fact, previousFact);
  renderComparison(fact, previousFact);
  renderActionInsights(fact, previousFact);

  const daily = aggregate(fact, ["date_start"]).sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)));
  renderLineChart("trendChart", daily, state.trendMetric);
  renderTrendConclusion("trendConclusion", daily, state.trendMetric);
  renderRankTable("countryBars", aggregate(fact, ["country"]), "country", "purchase_value", { label: "国家", limit: 80 });
  renderRankTable("productBars", aggregate(fact, ["product_name"]), "product_name", "purchase_value", { label: "产品", limit: 80 });
  renderRankTable("materialBars", aggregate(adRows, ["material_name"]), "material_name", "spend", { label: "素材编号", limit: 120, clickable: false });
  renderBars("overviewOperatorBars", aggregate(fact, ["operator"]), "operator", "spend", 8);
  renderAlerts(fact);
  renderTable("overviewProductTable", metaProductRows(fact, previousFact), [
    { key: "product_name", label: "产品", sticky: true, filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "purchase_value", label: "Meta GMV", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "gmv_share", label: "GMV占比", format: pct, num: true },
    { key: "spend", label: "Meta花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    { key: "aov", label: "客单", value: (row) => row, format: (row) => metricWithDelta(row, "aov", money, "aov_delta"), summaryValue: (row) => row.aov, summaryFormat: money, num: true },
    { key: "cvr", label: "CVR", value: (row) => row, format: (row) => metricWithDelta(row, "cvr", pct, "cvr_delta"), summaryValue: (row) => row.cvr, summaryFormat: pct, num: true },
    { key: "roas", label: "Meta ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", value: (row) => row, format: (row) => metricWithDelta(row, "cpa", money, "cpa_delta", true), summaryValue: (row) => row.cpa, summaryFormat: money, num: true },
    { key: "ctr", label: "CTR", value: (row) => row, format: (row) => metricWithDelta(row, "ctr", pct, "ctr_delta"), summaryValue: (row) => row.ctr, summaryFormat: pct, num: true },
  ], 80, { previousSummaryRows: aggregate(previousFact, ["product_name"]) });

  const countries = addComparison(aggregate(fact, ["country"]), previousFact, ["country"]).sort((a, b) => b.purchase_value - a.purchase_value);
  renderTable("countryTable", countries, [
    { key: "country", label: "国家", sticky: true, filterKey: "country" },
    { key: "purchase_value", label: "销售额", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "spend", label: "花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", format: number, num: true },
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
  ], 40, { previousSummaryRows: aggregate(previousFact, ["country"]) });

  const countryTrendRows = aggregate(fact, ["date_start"]).sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)));
  renderLineChart("countryTrend", countryTrendRows, "purchase_value");
  renderCountryQuickFilters(fact);
  renderCountryTrendConclusion(fact);
  const countryProductRows = addComparison(aggregate(fact, ["country", "product_name"]), previousFact, ["country", "product_name"]).sort((a, b) => b.purchase_value - a.purchase_value);
  renderTable("countryProductTable", countryProductRows, [
    { key: "country", label: "国家", sticky: true, filterKey: "country" },
    { key: "product_name", label: "产品", filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "purchase_value", label: "销售额", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "spend", label: "花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
    { key: "cvr", label: "CVR", format: pct, num: true },
  ], 100, { previousSummaryRows: aggregate(previousFact, ["country", "product_name"]) });
  const creativeSource = adRows;
  const creativeRows = aggregate(creativeSource, ["product_name", "material_name", "material_code", "material_type", "video_source", "ad_id", "ad_name", "campaign_name", "operator", "country"]).sort((a, b) => b.spend - a.spend);
  const materialRows = materialComparisonRows(fact, previousFact);
  renderDonutChart("materialSpendDonut", materialRows, "spend", "素材花费结构");
  renderDonutChart("materialSalesDonut", materialRows, "purchase_value", "素材销售结构");
  renderTable("materialComparisonTable", materialRows, [
    { key: "material_label", label: "素材类型", sticky: true, format: (v, row) => `<span class="material-label ${row.is_child ? "child-material-label" : ""}"><span class="tag material-tag">${escapeHtml(v)}</span></span>` },
    { key: "material_type", label: "归类", filterKey: "material_type", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "video_source", label: "视频来源", filterKey: "video_source", format: (v) => v ? `<span class="tag">${escapeHtml(v)}</span>` : "-" },
    { key: "spend", label: "花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "spend_share", label: "花费占比", format: pct, num: true },
    { key: "purchase_value", label: "销售额", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "sales_share", label: "销售占比", format: pct, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    { key: "aov", label: "客单", value: (row) => row, format: (row) => metricWithDelta(row, "aov", money, "aov_delta"), summaryValue: (row) => row.aov, summaryFormat: money, num: true },
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", value: (row) => row, format: (row) => metricWithDelta(row, "cpa", money, "cpa_delta", true), summaryValue: (row) => row.cpa, summaryFormat: money, num: true },
    { key: "ctr", label: "CTR", value: (row) => row, format: (row) => metricWithDelta(row, "ctr", pct, "ctr_delta"), summaryValue: (row) => row.ctr, summaryFormat: pct, num: true },
    { key: "cvr", label: "CVR", value: (row) => row, format: (row) => metricWithDelta(row, "cvr", pct, "cvr_delta"), summaryValue: (row) => row.cvr, summaryFormat: pct, num: true },
  ], 10, {
    summaryRows: materialRows.filter((row) => !row.is_child),
    previousSummaryRows: materialComparisonRows(previousFact, []).filter((row) => !row.is_child),
  });
  renderCreativeGroups(creativeRows);

  const creativeProductRows = addComparison(
    aggregate(adRows, ["product_name", "material_name", "material_type", "video_source"]),
    previousAdRows,
    ["product_name", "material_name", "material_type", "video_source"]
  ).sort((a, b) => b.purchase_value - a.purchase_value);
  renderTable("creativeProductTable", creativeProductRows, [
    { key: "product_name", label: "产品", sticky: true, filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "material_name", label: "素材", name: true, format: (v) => `<span class="tag material-tag">${escapeHtml(v)}</span>` },
    { key: "material_type", label: "类型", filterKey: "material_type", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "video_source", label: "视频来源", filterKey: "video_source", format: (v) => v ? `<span class="tag">${escapeHtml(v)}</span>` : "-" },
    { key: "spend", label: "花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_value", label: "销售额", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "roas", label: "ROI", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "purchase_times", label: "转化数", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    { key: "ctr", label: "CTR", value: (row) => row, format: (row) => metricWithDelta(row, "ctr", pct, "ctr_delta"), summaryValue: (row) => row.ctr, summaryFormat: pct, num: true },
    { key: "cvr", label: "CVR", value: (row) => row, format: (row) => metricWithDelta(row, "cvr", pct, "cvr_delta"), summaryValue: (row) => row.cvr, summaryFormat: pct, num: true },
  ], 120, { previousSummaryRows: aggregate(previousAdRows, ["product_name", "material_name", "material_type", "video_source"]) });

  const previousCreativeRows = aggregate(previousAdRows, ["product_name", "material_name", "material_code", "material_type", "video_source", "ad_id", "ad_name", "campaign_name", "operator", "country"]).sort((a, b) => b.spend - a.spend);
  renderTable("creativeTable", creativeRows, [
    { key: "ad_name", label: "Ad name", name: true, sticky: true, format: escapeHtml },
    { key: "material_name", label: "素材", name: true, format: (v) => `<span class="tag material-tag">${escapeHtml(v)}</span>` },
    { key: "product_name", label: "产品", filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "material_type", label: "素材类型", filterKey: "material_type", format: (v) => `<span class="tag material-tag">${escapeHtml(v || "未分类")}</span>` },
    { key: "video_source", label: "视频来源", filterKey: "video_source", format: (v) => v ? `<span class="tag">${escapeHtml(v)}</span>` : "-" },
    { key: "operator", label: "投手", filterKey: "operator" },
    { key: "country", label: "国家", filterKey: "country" },
    { key: "spend", label: "花费", format: money, num: true },
    { key: "purchase_value", label: "销售额", format: money, num: true },
    { key: "purchase_times", label: "转化", format: number, num: true },
    { key: "roas", label: "ROAS", format: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
    { key: "cvr", label: "CVR", format: pct, num: true },
  ], 100, { previousSummaryRows: previousCreativeRows });

  const operatorRows = aggregate(fact, ["operator"]).sort((a, b) => b.spend - a.spend);
  renderDonutChart("operatorShareDonut", operatorRows, "spend", "投手花费占比", { labelKey: "operator", limit: 8 });
  renderOperatorAlerts(fact);
  const opProductRows = addComparison(aggregate(fact, ["operator", "product_name"]), previousFact, ["operator", "product_name"]).sort((a, b) => b.spend - a.spend);
  renderTable("operatorProductTable", opProductRows, [
    { key: "operator", label: "投手", sticky: true, filterKey: "operator" },
    { key: "product_name", label: "产品", filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "spend", label: "花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_value", label: "销售额", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", format: number, num: true },
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
    { key: "cvr", label: "CVR", format: pct, num: true },
  ], 100, { previousSummaryRows: aggregate(previousFact, ["operator", "product_name"]) });
  const opCountryRows = addComparison(aggregate(fact, ["operator", "country"]), previousFact, ["operator", "country"]).sort((a, b) => b.spend - a.spend);
  renderTable("operatorCountryTable", opCountryRows, [
    { key: "operator", label: "投手", sticky: true, filterKey: "operator" },
    { key: "country", label: "国家", filterKey: "country" },
    { key: "spend", label: "花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_value", label: "销售额", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", format: number, num: true },
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
    { key: "cvr", label: "CVR", format: pct, num: true },
  ], 100, { previousSummaryRows: aggregate(previousFact, ["operator", "country"]) });

  const landingTypeRows = aggregate(landingRows, ["landing_type"]).sort((a, b) => b.spend - a.spend);
  renderDonutChart("landingTypeDonut", landingTypeRows, "spend", "落地页花费结构", { labelKey: "landing_type", limit: 8 });
  renderLandingInsights(landingRows);
  const landingComboRows = addComparison(aggregate(landingRows, ["landing_type", "product_name", "country"]), previousLandingRows, ["landing_type", "product_name", "country"]).sort((a, b) => b.spend - a.spend);
  renderTable("landingTable", landingComboRows, [
    { key: "landing_type", label: "落地页类型", sticky: true, format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "product_name", label: "产品", filterKey: "product_name", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "country", label: "国家", filterKey: "country" },
    { key: "spend", label: "花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_value", label: "销售额", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
    { key: "cvr", label: "CVR", format: pct, num: true },
  ], 120, { previousSummaryRows: aggregate(previousLandingRows, ["landing_type", "product_name", "country"]) });
  const landingMaterialRows = addComparison(aggregate(landingRows, ["landing_type", "material_name", "material_type", "video_source"]), previousLandingRows, ["landing_type", "material_name", "material_type", "video_source"]).sort((a, b) => b.purchase_value - a.purchase_value);
  renderTable("landingMaterialTable", landingMaterialRows, [
    { key: "landing_type", label: "落地页类型", sticky: true, format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "material_name", label: "素材", name: true, format: (v) => `<span class="tag material-tag">${escapeHtml(v)}</span>` },
    { key: "material_type", label: "类型", filterKey: "material_type", format: (v) => `<span class="tag">${escapeHtml(v)}</span>` },
    { key: "video_source", label: "视频来源", filterKey: "video_source", format: (v) => v ? `<span class="tag">${escapeHtml(v)}</span>` : "-" },
    { key: "spend", label: "花费", value: (row) => row, format: (row) => metricWithDelta(row, "spend", money, "spend_delta"), summaryValue: (row) => row.spend, summaryFormat: money, num: true },
    { key: "purchase_value", label: "销售额", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_value", money, "sales_delta"), summaryValue: (row) => row.purchase_value, summaryFormat: money, num: true },
    { key: "purchase_times", label: "转化", value: (row) => row, format: (row) => metricWithDelta(row, "purchase_times", number, "conversion_delta"), summaryValue: (row) => row.purchase_times, summaryFormat: number, num: true },
    { key: "roas", label: "ROAS", value: (row) => row, format: (row) => metricWithDelta(row, "roas", ratio, "roas_delta"), summaryValue: (row) => row.roas, summaryFormat: ratio, num: true },
    { key: "cpa", label: "CPA", format: money, num: true },
    { key: "ctr", label: "CTR", format: pct, num: true },
    { key: "cvr", label: "CVR", format: pct, num: true },
  ], 120, { previousSummaryRows: aggregate(previousLandingRows, ["landing_type", "material_name", "material_type", "video_source"]) });
  renderOnsite(fact, previousFact);
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
    const source = event.target.nodeType === 1 ? event.target : event.target.parentElement;
    const target = source?.closest("[data-filter-key][data-filter-value]");
    if (!target) return;
    event.preventDefault();
    preserveScroll(() => applyContentFilter(target.dataset.filterKey, target.dataset.filterValue));
  }, true);
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.view = tab.dataset.view;
      render();
    });
  });
  document.querySelectorAll(".multi-trigger").forEach((button) => {
    button.addEventListener("click", () => {
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
  });
  document.addEventListener("change", (event) => {
    if (!event.target.matches(".multi-panel input[type='checkbox']")) return;
    const key = event.target.dataset.filter;
    state[key] = getSelectedValues(key);
    updateMultiButton(key);
    preserveScroll(render);
  });
  document.addEventListener("input", (event) => {
    if (!event.target.matches("[data-filter-search]")) return;
    filterMultiOptions(event.target);
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
    state[key] = [];
    document.querySelectorAll(`#${key}FilterPanel input[type='checkbox']`).forEach((input) => {
      input.checked = false;
    });
    updateMultiButton(key);
    preserveScroll(render);
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
    initFilters();
    preserveScroll(render);
  });
  document.getElementById("trendMetric").addEventListener("change", (event) => {
    state.trendMetric = event.target.value;
    preserveScroll(render);
  });
  document.getElementById("resetFilters").addEventListener("click", () => {
    state.country = [];
    state.account = [];
    state.product = [];
    state.channel = [];
    state.operator = [];
    state.materialType = [];
    state.videoSource = [];
    initFilters();
    preserveScroll(render);
  });
}

function boot() {
  if (!data) return;
  const params = new URLSearchParams(location.search);
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
  state.channel = params.getAll("channel").filter((value) => value && value !== "全部");
  state.operator = params.getAll("operator").filter((value) => value && value !== "全部");
  state.materialType = params.getAll("materialType").filter((value) => value && value !== "全部");
  state.videoSource = params.getAll("videoSource").filter((value) => value && value !== "全部");
  document.getElementById("dateRange").textContent = `${data.summary.min_date} 至 ${data.summary.max_date}`;
  document.getElementById("generatedAt").textContent = `更新于 ${data.generated_at}`;
  initFilters();
  syncPendingTimeFromState();
  initFilters();
  bindEvents();
  render();
}

boot();
