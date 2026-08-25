(function attachCreativeDecision(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardCreativeDecision = api;
})(typeof window !== "undefined" ? window : globalThis, function createCreativeDecision() {
  const additiveFields = [
    "spend",
    "purchase_value",
    "purchase_times",
    "impressions",
    "clicks",
    "inline_link_clicks",
    "outbound_clicks",
  ];

  function validMaterialCode(value) {
    const code = String(value ?? "").trim();
    return code && code !== "Unknown" && code !== "-" ? code : "";
  }

  function normalizeName(value) {
    return String(value ?? "")
      .trim()
      .replace(/[\s_\-–—]*(?:广告副本|copy)(?:[\s_\-]*\d+)?\s*$/i, "")
      .replace(/[\s_]+/g, " ")
      .trim()
      .toLowerCase();
  }

  function creativeIdentity(row = {}) {
    const code = validMaterialCode(row.material_code);
    if (code) return { id: code, key: `code:${code}`, source: "material_code" };
    const name = normalizeName(row.material_name || row.ad_name);
    if (name) return { id: name, key: `name:${name}`, source: "normalized_name" };
    const adId = String(row.ad_id ?? "").trim() || "unknown";
    return { id: adId, key: `ad:${adId}`, source: "ad_id" };
  }

  function productName(row = {}) {
    return String(row.standard_product_name || row.product_name || "未识别产品");
  }

  function groupKey(row = {}) {
    return [
      row.country || "Unknown",
      productName(row),
      row.material_type || "未分类",
    ].join("||");
  }

  function ratio(numerator, denominator, empty = 0) {
    return Number(denominator || 0) ? Number(numerator || 0) / Number(denominator) : empty;
  }

  function deriveMetrics(row) {
    return {
      ...row,
      roas: ratio(row.purchase_value, row.spend),
      cpa: row.purchase_times ? ratio(row.spend, row.purchase_times) : null,
      ctr: ratio(row.inline_link_clicks, row.impressions),
      cvr: ratio(row.purchase_times, row.outbound_clicks),
      cpm: row.impressions ? ratio(row.spend * 1000, row.impressions) : 0,
      aov: row.purchase_times ? ratio(row.purchase_value, row.purchase_times) : null,
    };
  }

  function aggregateCreatives(rows = []) {
    const groups = new Map();
    for (const source of rows || []) {
      const identity = creativeIdentity(source);
      const key = [identity.key, groupKey(source)].join("||");
      if (!groups.has(key)) {
        groups.set(key, {
          material_id: identity.id,
          creative_key: identity.key,
          identity_source: identity.source,
          material_code: validMaterialCode(source.material_code),
          material_name: source.material_name || source.ad_name || "",
          ad_id: source.ad_id || "",
          country: source.country || "Unknown",
          standard_product_name: productName(source),
          product_name: productName(source),
          material_type: source.material_type || "未分类",
          video_source: source.video_source || "",
          video_subtype: source.video_subtype || "",
          account_name: source.account_name || "",
          operator: source.operator || "",
          dates: new Set(),
          ...Object.fromEntries(additiveFields.map((field) => [field, 0])),
        });
      }
      const target = groups.get(key);
      if (source.date_start) target.dates.add(source.date_start);
      additiveFields.forEach((field) => {
        target[field] += Number(source[field] || 0);
      });
    }
    return [...groups.values()].map((row) => deriveMetrics({
      ...row,
      active_days: row.dates.size,
      first_date: [...row.dates].sort()[0] || "",
      last_date: [...row.dates].sort().at(-1) || "",
      dates: undefined,
    }));
  }

  function quantile(values, fraction) {
    const sorted = (values || []).filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (!sorted.length) return null;
    if (sorted.length === 1) return sorted[0];
    const position = (sorted.length - 1) * fraction;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  }

  function percentileRank(values, value) {
    const sorted = (values || []).filter((entry) => Number.isFinite(entry)).sort((a, b) => a - b);
    if (!sorted.length || !Number.isFinite(value)) return null;
    const below = sorted.filter((entry) => entry < value).length;
    const equal = sorted.filter((entry) => entry === value).length;
    return (below + equal * 0.5) / sorted.length;
  }

  function evidenceStatus(row, medianCpa) {
    const activity = row.active_days >= 3 && row.impressions >= 3000;
    const conversion = row.purchase_times >= 3
      || (Number.isFinite(medianCpa) && medianCpa > 0 && row.spend >= medianCpa * 2);
    return activity && conversion ? "sufficient" : "insufficient";
  }

  function benchmarkStatus(eligibleCount) {
    if (eligibleCount >= 8) return "formal";
    if (eligibleCount >= 4) return "directional";
    return "insufficient";
  }

  function buildGroupBenchmarks(creatives) {
    const grouped = new Map();
    creatives.forEach((row) => {
      const key = groupKey(row);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });

    return [...grouped.entries()].map(([key, rows]) => {
      const medianCpa = quantile(rows.map((row) => row.cpa), 0.5);
      rows.forEach((row) => {
        row.evidence_status = evidenceStatus(row, medianCpa);
      });
      const eligible = rows.filter((row) => row.evidence_status === "sufficient");
      const metricValues = Object.fromEntries(["roas", "cpa", "ctr", "cvr", "cpm", "aov"].map((metric) => [
        metric,
        eligible.map((row) => row[metric]).filter((value) => Number.isFinite(value)),
      ]));
      const quartiles = Object.fromEntries(Object.entries(metricValues).map(([metric, values]) => [metric, {
        p25: quantile(values, 0.25),
        p50: quantile(values, 0.5),
        p75: quantile(values, 0.75),
      }]));
      return {
        group_key: key,
        country: rows[0]?.country || "Unknown",
        standard_product_name: rows[0]?.standard_product_name || "未识别产品",
        material_type: rows[0]?.material_type || "未分类",
        creative_count: rows.length,
        eligible_count: eligible.length,
        benchmark_status: benchmarkStatus(eligible.length),
        median_cpa: medianCpa,
        quartiles,
        metric_values: metricValues,
      };
    });
  }

  function change(current, previous) {
    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
    return (current - previous) / previous;
  }

  function trendFor(current, previous) {
    if (!previous) return {
      spend_change: null,
      roas_change: null,
      ctr_change: null,
      cvr_change: null,
      cpa_change: null,
    };
    return {
      spend_change: change(current.spend, previous.spend),
      roas_change: change(current.roas, previous.roas),
      ctr_change: change(current.ctr, previous.ctr),
      cvr_change: change(current.cvr, previous.cvr),
      cpa_change: change(current.cpa, previous.cpa),
    };
  }

  function atLeast(value, threshold) {
    return Number.isFinite(value) && Number.isFinite(threshold) && value >= threshold;
  }

  function atMost(value, threshold) {
    return Number.isFinite(value) && Number.isFinite(threshold) && value <= threshold;
  }

  function classify(row, benchmark, previous, previousBenchmark) {
    const notes = [];
    const trend = trendFor(row, previous);
    const formal = benchmark?.benchmark_status === "formal";
    const sufficient = row.evidence_status === "sufficient";
    const previousQualified = previous?.evidence_status === "sufficient"
      && atLeast(previous.roas, previousBenchmark?.quartiles?.roas?.p50);
    const spendComparable = trend.spend_change === null || trend.spend_change >= -0.3;
    const conversionDecline = (trend.ctr_change !== null && trend.ctr_change <= -0.15)
      || (trend.cvr_change !== null && trend.cvr_change <= -0.15);
    const fatigue = previousQualified
      && sufficient
      && spendComparable
      && trend.roas_change !== null
      && trend.roas_change <= -0.25
      && conversionDecline;

    if (fatigue) {
      notes.push("近周期 ROAS 与点击或转化效率同步下降，且花费保持可比");
      return { decision: "fatigue", notes, trend };
    }

    const stable = trend.roas_change === null || trend.roas_change > -0.25;
    if (formal && sufficient
      && atLeast(row.roas, benchmark.quartiles.roas.p75)
      && atMost(row.cpa, benchmark.quartiles.cpa.p50)
      && stable) {
      notes.push("样本充分，ROAS 位于同组前四分位且 CPA 不高于中位数");
      return { decision: "scale", notes, trend };
    }

    const poorEfficiency = formal && sufficient
      && atMost(row.roas, benchmark.quartiles.roas.p25)
      && ((row.cpa === null && row.purchase_times === 0)
        || atLeast(row.cpa, benchmark.quartiles.cpa.p75));
    if (poorEfficiency) {
      notes.push("样本充分，但 ROAS 位于同组后四分位且转化成本偏高");
      return { decision: "pause", notes, trend };
    }

    const potential = formal && !sufficient && (
      atLeast(row.roas, benchmark.quartiles.roas.p75)
      || atLeast(row.ctr, benchmark.quartiles.ctr.p75)
      || atLeast(row.cvr, benchmark.quartiles.cvr.p75)
    );
    if (potential) {
      notes.push("效率信号达到同组前四分位，但花费、曝光或订单样本不足");
      return { decision: "potential", notes, trend };
    }

    const clickConversionMismatch = formal && sufficient && (
      (atLeast(row.ctr, benchmark.quartiles.ctr.p75) && atMost(row.cvr, benchmark.quartiles.cvr.p25))
      || (atMost(row.ctr, benchmark.quartiles.ctr.p25) && atLeast(row.cvr, benchmark.quartiles.cvr.p75))
    );
    if (clickConversionMismatch) {
      notes.push("点击与转化信号不一致，适合重做 Hook、证据或承接表达");
      return { decision: "remake", notes, trend };
    }

    notes.push(benchmark?.benchmark_status === "formal" ? "表现处于同组中间区间" : "同组样本不足，仅保留观察");
    return { decision: "observe", notes, trend };
  }

  function contentKey(row, tag) {
    return [
      row.material_type,
      tag.content_direction_l1 || "unclear",
      tag.content_direction_l2 || "unclear",
      tag.proof_type || "none",
      row.material_type === "视频" ? (tag.hook_type || "unclear") : "",
      row.material_type === "视频" ? (tag.script_structure || "unclear") : "",
    ].join("||");
  }

  function buildContentInsights(creatives, contentTags = {}) {
    const groups = new Map();
    creatives.forEach((row) => {
      const tag = contentTags[row.material_id] || contentTags[row.creative_key];
      if (!tag) return;
      const key = contentKey(row, tag);
      if (!groups.has(key)) {
        groups.set(key, {
          material_type: row.material_type,
          media_type: tag.media_type || (row.material_type === "视频" ? "video" : "image"),
          content_direction_l1: tag.content_direction_l1 || "unclear",
          content_direction_l2: tag.content_direction_l2 || "unclear",
          proof_type: tag.proof_type || "none",
          hook_type: tag.hook_type || "",
          script_structure: tag.script_structure || "",
          creative_count: 0,
          matched_asset_count: 0,
          confidence_mix: { high: 0, medium: 0, low: 0 },
          material_ids: [],
          ...Object.fromEntries(additiveFields.map((field) => [field, 0])),
        });
      }
      const target = groups.get(key);
      target.creative_count += 1;
      target.matched_asset_count += row.asset ? 1 : 0;
      target.material_ids.push(row.material_id);
      const confidence = ["high", "medium", "low"].includes(tag.confidence) ? tag.confidence : "low";
      target.confidence_mix[confidence] += 1;
      additiveFields.forEach((field) => {
        target[field] += Number(row[field] || 0);
      });
    });
    return [...groups.values()].map((row) => ({
      ...deriveMetrics(row),
      conclusion_status: row.creative_count >= 3 ? "supported" : "example_only",
    })).sort((left, right) => right.spend - left.spend);
  }

  function buildDecisionModel(currentRows = [], previousRows = [], assetIndex = {}, contentTags = {}) {
    const creatives = aggregateCreatives(currentRows);
    const previousCreatives = aggregateCreatives(previousRows);
    const groups = buildGroupBenchmarks(creatives);
    const previousGroups = buildGroupBenchmarks(previousCreatives);
    const groupMap = new Map(groups.map((group) => [group.group_key, group]));
    const previousGroupMap = new Map(previousGroups.map((group) => [group.group_key, group]));
    const previousMap = new Map(previousCreatives.map((row) => [[row.creative_key, groupKey(row)].join("||"), row]));

    const enriched = creatives.map((row) => {
      const benchmark = groupMap.get(groupKey(row));
      const previous = previousMap.get([row.creative_key, groupKey(row)].join("||"));
      const result = classify(row, benchmark, previous, previousGroupMap.get(groupKey(row)));
      const asset = assetIndex[row.material_id] || assetIndex[row.creative_key] || null;
      const contentTag = contentTags[row.material_id] || contentTags[row.creative_key] || null;
      return {
        ...row,
        benchmark_status: benchmark?.benchmark_status || "insufficient",
        peer_group_size: benchmark?.eligible_count || 0,
        peer_quartiles: benchmark?.quartiles || {},
        peer_percentiles: Object.fromEntries(["roas", "cpa", "ctr", "cvr", "aov"].map((metric) => [
          metric,
          percentileRank(benchmark?.metric_values?.[metric] || [], row[metric]),
        ])),
        decision: result.decision,
        evidence_notes: result.notes,
        trend: result.trend,
        asset,
        content_tag: contentTag,
      };
    });

    const decisionOrder = { scale: 0, potential: 1, fatigue: 2, pause: 3, remake: 4, observe: 5 };
    enriched.sort((left, right) => (
      decisionOrder[left.decision] - decisionOrder[right.decision]
      || right.spend - left.spend
    ));
    const lists = Object.fromEntries(["scale", "potential", "fatigue", "pause", "remake", "observe"].map((decision) => [
      decision,
      enriched.filter((row) => row.decision === decision),
    ]));
    return {
      creatives: enriched,
      groups,
      lists,
      content_insights: buildContentInsights(enriched, contentTags),
      match_audit: {
        total_creatives: enriched.length,
        matched_assets: enriched.filter((row) => row.asset).length,
        unmatched_assets: enriched.filter((row) => !row.asset).length,
        matched_tags: enriched.filter((row) => row.content_tag).length,
        unmatched_tags: enriched.filter((row) => !row.content_tag).length,
      },
    };
  }

  return {
    aggregateCreatives,
    benchmarkStatus,
    buildContentInsights,
    buildDecisionModel,
    creativeIdentity,
    evidenceStatus,
    percentileRank,
    quantile,
  };
});
