(function attachDashboardLifecycle(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardLifecycle = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardLifecycle() {
  const priorityRank = {
    tracking_problem: 0,
    high_confidence_fatigue: 1,
    audience_fatigue: 2,
    competition_change: 3,
    monitor: 4,
  };

  function text(value) {
    return String(value ?? "").trim();
  }

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function sorted(values) {
    return [...values].sort((left, right) => text(left).localeCompare(text(right), "en"));
  }

  function lifecycleHealth(payload = {}) {
    const health = payload.health || {};
    const coverage = payload.coverage || {};
    const gaps = Array.isArray(health.gaps) ? [...health.gaps] : [];
    return {
      isOk: health.status === "ok" && coverage.status === "complete" && gaps.length === 0,
      status: text(health.status) || "unknown",
      coverageStatus: text(coverage.status) || "unknown",
      coverageStart: coverage.start ?? null,
      coverageEnd: coverage.end ?? null,
      generatedAt: payload.generated_at ?? null,
      gaps,
    };
  }

  function emptyIds() {
    return { productIds: [], materialTypeIds: [], creativeIds: [], scopeIds: [] };
  }

  function option(value, id, label = value) {
    return { value, id, label };
  }

  function selectLifecycleModel(payload = {}, filters = {}) {
    const health = lifecycleHealth(payload);
    const allProducts = Array.isArray(payload.products) ? payload.products : [];
    const allMaterialTypes = Array.isArray(payload.material_types) ? payload.material_types : [];
    const allCreatives = Array.isArray(payload.creatives) ? payload.creatives : [];
    const allScopes = Array.isArray(payload.scopes) ? payload.scopes : [];

    if (!health.isOk) {
      return {
        payload,
        filters: { ...filters },
        health,
        readOnly: true,
        breadcrumb: [],
        options: { products: [], materialTypes: [], creatives: [], diagnoses: [], stages: [] },
        filteredIds: emptyIds(),
        creatives: [],
        scopes: [],
        emptyReason: "health_not_ok",
      };
    }

    const requestedProducts = (Array.isArray(filters.product) ? filters.product : [filters.product])
      .map(text)
      .filter(Boolean);
    const hasProductFilter = requestedProducts.length > 0;
    const selectedProducts = allProducts.filter((product) => requestedProducts.length === 0
      || requestedProducts.includes(product.product_id)
      || requestedProducts.includes(product.product_name));
    const selectedProductIds = new Set(selectedProducts.map((product) => product.product_id));
    const selectedMaterialType = text(filters.material_type);
    const availableMaterialTypes = allMaterialTypes.filter((material) => !hasProductFilter
      || selectedProductIds.has(material.product_id));
    const upstreamCreatives = allCreatives.filter((creative) => (
      (!hasProductFilter || selectedProductIds.has(creative.product_id))
      && (!selectedMaterialType || creative.material_type === selectedMaterialType)
    ));
    const requestedCreativeId = text(filters.creative_id);
    const diagnosis = text(filters.diagnosis);
    const stage = text(filters.stage);
    const creatives = upstreamCreatives.filter((creative) => (
      (!requestedCreativeId || creative.creative_id === requestedCreativeId)
      && (!diagnosis || creative.diagnosis === diagnosis)
      && (!stage || creative.lifecycle_stage === stage)
    ));
    const creativeIds = new Set(creatives.map((creative) => creative.creative_id));
    const scopes = allScopes.filter((scope) => creativeIds.has(scope.creative_id));
    const productIds = new Set(creatives.map((creative) => creative.product_id));
    const materialTypeIds = new Set(creatives.map((creative) => creative.material_type_id));
    const breadcrumb = [];
    if (selectedProducts.length === 1 && requestedProducts.length) {
      breadcrumb.push({
        level: "product",
        id: selectedProducts[0].product_id,
        label: selectedProducts[0].product_name,
      });
      if (selectedMaterialType) {
        const selectedType = availableMaterialTypes.find((item) => item.material_type === selectedMaterialType);
        if (selectedType) {
          breadcrumb.push({
            level: "material_type",
            id: selectedType.material_type_id,
            label: selectedType.material_type,
          });
        }
      }
    }
    if (requestedCreativeId) {
      const selectedCreative = upstreamCreatives.find((item) => item.creative_id === requestedCreativeId);
      if (selectedCreative) {
        breadcrumb.push({ level: "creative", id: requestedCreativeId, label: requestedCreativeId });
      }
    }

    let emptyReason = null;
    if (allCreatives.length === 0) emptyReason = "no_data";
    else if (creatives.length === 0) emptyReason = "no_matching_creatives";
    else if (creatives.every((creativeItem) => creativeItem.diagnosis === "insufficient_evidence")) {
      emptyReason = "insufficient_evidence";
    }

    return {
      payload,
      filters: { ...filters },
      health,
      readOnly: false,
      breadcrumb,
      options: {
        products: [...allProducts]
          .sort((left, right) => text(left.product_name).localeCompare(text(right.product_name), "en"))
          .map((product) => option(product.product_name, product.product_id, product.product_name)),
        materialTypes: [...availableMaterialTypes]
          .sort((left, right) => text(left.material_type).localeCompare(text(right.material_type), "en"))
          .map((material) => option(material.material_type, material.material_type_id, material.material_type)),
        creatives: [...upstreamCreatives]
          .sort((left, right) => text(left.creative_id).localeCompare(text(right.creative_id), "en"))
          .map((creativeItem) => option(creativeItem.creative_id, creativeItem.creative_id, creativeItem.creative_id)),
        diagnoses: sorted(new Set(upstreamCreatives.map((creativeItem) => creativeItem.diagnosis).filter(Boolean))),
        stages: sorted(new Set(upstreamCreatives.map((creativeItem) => creativeItem.lifecycle_stage).filter(Boolean))),
      },
      filteredIds: {
        productIds: sorted(productIds),
        materialTypeIds: sorted(materialTypeIds),
        creativeIds: sorted(creativeIds),
        scopeIds: sorted(scopes.map((scope) => scope.scope_id)),
      },
      creatives,
      scopes,
      emptyReason,
    };
  }

  function rate(count, denominator) {
    return denominator ? count / denominator : null;
  }

  function lifecycleKpis(model) {
    if (!model || model.readOnly) return null;
    const active = model.creatives.filter((creative) => number(creative.active_days) > 0);
    const activeCount = active.length;
    const diagnostic = active.filter((creative) => ![
      "tracking_problem", "insufficient_evidence",
    ].includes(creative.diagnosis));
    const denominator = diagnostic.length;
    const count = (diagnosis) => active.filter((creative) => creative.diagnosis === diagnosis).length;
    const refreshCount = count("creative_fatigue");
    const audienceCount = count("audience_fatigue");
    const competitionCount = count("competition_change");
    const trackingCount = count("tracking_problem");
    return {
      active: { count: activeCount, denominator: activeCount, rate: activeCount ? 1 : null },
      refreshCreative: { count: refreshCount, denominator, rate: rate(refreshCount, denominator) },
      expandAudience: { count: audienceCount, denominator, rate: rate(audienceCount, denominator) },
      competitionChange: { count: competitionCount, denominator, rate: rate(competitionCount, denominator) },
      trackingRisk: { count: trackingCount, denominator: activeCount, rate: rate(trackingCount, activeCount) },
    };
  }

  function spendByCreative(model) {
    const totals = new Map();
    model.scopes.forEach((scope) => {
      totals.set(scope.creative_id, (totals.get(scope.creative_id) || 0) + number(scope.summary?.spend));
    });
    return totals;
  }

  function diagnosisCounts(creatives) {
    const counts = {};
    creatives.forEach((creative) => {
      counts[creative.diagnosis] = (counts[creative.diagnosis] || 0) + 1;
    });
    return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, "en")));
  }

  function rowSort(left, right) {
    return right.spend - left.spend || text(left.id).localeCompare(text(right.id), "en");
  }

  function lifecycleHierarchy(model) {
    if (!model || model.readOnly) return { level: "alert", rows: [] };
    const spends = spendByCreative(model);
    const selectedProduct = model.breadcrumb.find((item) => item.level === "product");
    const selectedType = model.breadcrumb.find((item) => item.level === "material_type");
    if (selectedType) {
      return {
        level: "creative",
        rows: model.creatives.map((creative) => ({
          id: creative.creative_id,
          label: creative.creative_id,
          spend: spends.get(creative.creative_id) || 0,
          diagnosis: creative.diagnosis,
          confidence: creative.confidence,
          stage: creative.lifecycle_stage,
          calendarDays: creative.calendar_days,
          activeDays: creative.active_days,
          recommendedAction: creative.recommended_action,
        })).sort(rowSort),
      };
    }

    const key = selectedProduct ? "material_type_id" : "product_id";
    const groups = new Map();
    model.creatives.forEach((creative) => {
      const id = creative[key];
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(creative);
    });
    const rows = [...groups.entries()].map(([id, creatives]) => {
      const first = creatives[0];
      const base = {
        id,
        label: selectedProduct ? first.material_type : first.product_name,
      };
      if (selectedProduct) base.productId = first.product_id;
      return {
        ...base,
        creativeCount: creatives.length,
        spend: creatives.reduce((sum, creative) => sum + (spends.get(creative.creative_id) || 0), 0),
        diagnosisCounts: diagnosisCounts(creatives),
      };
    }).sort(rowSort);
    return { level: selectedProduct ? "material_type" : "product", rows };
  }

  function actionPriority(creative) {
    if (creative.diagnosis === "tracking_problem") return "tracking_problem";
    if (creative.diagnosis === "creative_fatigue" && number(creative.confidence) >= 0.8) {
      return "high_confidence_fatigue";
    }
    if (creative.diagnosis === "audience_fatigue") return "audience_fatigue";
    if (creative.diagnosis === "competition_change") return "competition_change";
    return "monitor";
  }

  function lifecycleActionQueue(model) {
    if (!model || model.readOnly) return [];
    const spends = spendByCreative(model);
    return model.creatives.map((creative) => ({
      creativeId: creative.creative_id,
      productId: creative.product_id,
      productName: creative.product_name,
      materialType: creative.material_type,
      stage: creative.lifecycle_stage,
      calendarDays: creative.calendar_days,
      diagnosis: creative.diagnosis,
      confidence: creative.confidence,
      recommendedAction: creative.recommended_action,
      evidence: [...(creative.evidence || [])],
      spend: spends.get(creative.creative_id) || 0,
      priority: actionPriority(creative),
    })).sort((left, right) => (
      priorityRank[left.priority] - priorityRank[right.priority]
      || right.spend - left.spend
      || text(left.creativeId).localeCompare(text(right.creativeId), "en")
    ));
  }

  function lifecycleCreativeDetail(model, creativeId) {
    if (!model || model.readOnly) return null;
    const creative = model.creatives.find((item) => item.creative_id === creativeId);
    if (!creative) return null;
    const scopes = model.scopes.filter((scope) => scope.creative_id === creativeId);
    return {
      creative,
      scopes,
      spend: scopes.reduce((sum, scope) => sum + number(scope.summary?.spend), 0),
    };
  }

  function metricValue(point, metric) {
    if (!point) return null;
    if (metric === "ctr") return point.i ? point.c / point.i : null;
    if (metric === "cpm") return point.i ? (point.s / point.i) * 1000 : null;
    if (metric === "frequency") return point.r ? point.i / point.r : null;
    if (metric === "roas") return point.s ? point.v / point.s : null;
    return null;
  }

  function metricWindow(points, metric) {
    if (!points.length) return null;
    const fields = { ctr: ["c", "i"], cpm: ["s", "i"], frequency: ["i", "r"], roas: ["v", "s"] }[metric];
    if (!fields || points.some((point) => fields.some((field) => !Number.isFinite(Number(point[field]))))) {
      return null;
    }
    const aggregate = points.reduce((sum, point) => {
      Object.keys(sum).forEach((field) => { sum[field] += Number(point[field]); });
      return sum;
    }, { i: 0, r: 0, s: 0, c: 0, p: 0, v: 0 });
    return metricValue(aggregate, metric);
  }

  function metricChange(creative, metric, days) {
    const curve = creative?.curve || [];
    if (curve.length < days * 2) return null;
    const current = metricWindow(curve.slice(-days), metric);
    const previous = metricWindow(curve.slice(-days * 2, -days), metric);
    if (current === null || previous === null || previous === 0) return null;
    return (current - previous) / Math.abs(previous);
  }

  function lifecycleActionPresentation(model, metric = "ctr") {
    const creativeById = new Map((model?.creatives || []).map((creative) => [
      creative.creative_id,
      creative,
    ]));
    return lifecycleActionQueue(model).map((row) => {
      const creative = creativeById.get(row.creativeId);
      return {
        ...row,
        activeDays: creative?.active_days ?? null,
        change3d: metricChange(creative, metric, 3),
        change7d: metricChange(creative, metric, 7),
      };
    });
  }

  function lifecycleHierarchyPresentation(model, metric = "ctr") {
    const hierarchy = lifecycleHierarchy(model);
    if (!model || model.readOnly || hierarchy.level === "alert") return hierarchy;
    const spends = spendByCreative(model);
    if (hierarchy.level === "creative") {
      const creativeById = new Map(model.creatives.map((creative) => [creative.creative_id, creative]));
      return {
        ...hierarchy,
        rows: hierarchy.rows.map((row) => {
          const creative = creativeById.get(row.id);
          return {
            ...row,
            change3d: metricChange(creative, metric, 3),
            change7d: metricChange(creative, metric, 7),
          };
        }),
      };
    }

    return {
      ...hierarchy,
      rows: hierarchy.rows.map((row) => {
        const descendants = model.creatives.filter((creative) => (
          hierarchy.level === "product"
            ? creative.product_id === row.id
            : creative.material_type_id === row.id
        )).sort((left, right) => (
          (spends.get(right.creative_id) || 0) - (spends.get(left.creative_id) || 0)
          || text(left.creative_id).localeCompare(text(right.creative_id), "en")
        ));
        const creative = descendants[0];
        return {
          ...row,
          representative: creative ? {
            semantics: "highest_spend_creative",
            semanticsLabel: "最高花费代表素材",
            creativeId: creative.creative_id,
            stage: creative.lifecycle_stage,
            calendarDays: creative.calendar_days,
            activeDays: creative.active_days,
            change3d: metricChange(creative, metric, 3),
            change7d: metricChange(creative, metric, 7),
            diagnosis: creative.diagnosis,
            confidence: creative.confidence,
            recommendedAction: creative.recommended_action,
            spend: spends.get(creative.creative_id) || 0,
          } : null,
        };
      }),
    };
  }

  function percentText(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    return `${Math.round(Number(value) * 10000) / 100}%`;
  }

  function moneyText(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    return `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }

  function changeText(change3d, change7d) {
    const signed = (value) => {
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
      return `${Number(value) > 0 ? "+" : ""}${percentText(value)}`;
    };
    return `${signed(change3d)} / ${signed(change7d)}`;
  }

  function lifecycleRowDetailFields(row, { kind = "action" } = {}) {
    const diagnosis = row.diagnosisLabel || row.diagnosis || "—";
    const action = row.recommendedActionLabel || row.recommendedAction || "—";
    const confidence = percentText(row.confidence);
    if (kind === "aggregate") {
      const representative = row.representative;
      if (!representative) {
        return [
          { label: "聚合范围", value: `${number(row.creativeCount)} 个素材` },
          { label: "代表口径", value: "暂无可用代表素材" },
          { label: "聚合 Spend", value: moneyText(row.spend) },
        ];
      }
      return [
        { label: "聚合范围", value: `${number(row.creativeCount)} 个素材` },
        { label: "代表口径", value: representative.semanticsLabel },
        { label: "代表素材", value: representative.creativeId },
        { label: "阶段 / 上线", value: `${representative.stage || "—"} · 第 ${number(representative.calendarDays)} 天` },
        { label: "近3日 vs 前3日 / 近7日 vs 前7日", value: changeText(representative.change3d, representative.change7d) },
        { label: "诊断 / 置信度", value: `${representative.diagnosisLabel || representative.diagnosis || "—"} · 置信度 ${percentText(representative.confidence)}` },
        { label: "建议", value: representative.recommendedActionLabel || representative.recommendedAction || "—" },
        { label: "代表素材 Spend", value: moneyText(representative.spend) },
        { label: "聚合 Spend", value: moneyText(row.spend) },
      ];
    }
    return [
      { label: "产品 / 类型", value: `${row.productName || "—"} / ${row.materialType || "—"}` },
      { label: "阶段 / 上线", value: `${row.stage || "—"} · 第 ${number(row.calendarDays)} 天` },
      { label: "近3日 vs 前3日 / 近7日 vs 前7日", value: changeText(row.change3d, row.change7d) },
      { label: "诊断 / 置信度", value: `${diagnosis} · 置信度 ${confidence}` },
      { label: "建议", value: action },
      { label: "Spend", value: moneyText(row.spend) },
    ];
  }

  function escapeMarkup(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
    })[character]);
  }

  function renderLifecycleRowDetails(fields, accessibleLabel) {
    return `<details class="lifecycle-inline-detail"><summary aria-label="展开${escapeMarkup(accessibleLabel)}">详情</summary><dl>${fields.map((field) => `<div><dt>${escapeMarkup(field.label)}</dt><dd>${escapeMarkup(field.value)}</dd></div>`).join("")}</dl></details>`;
  }

  function list(value, fallback) {
    const values = Array.isArray(value) ? value.map(text).filter(Boolean) : [];
    return values.length ? values : [fallback];
  }

  function lifecycleExplanation(creative = {}, ruleVersion = "") {
    return [
      { key: "observed", label: "观察到什么", items: list(creative.evidence, "暂无可用证据") },
      { key: "excluded", label: "排除了什么", items: list(creative.exclusions, "暂无可排除项") },
      {
        key: "rationale",
        label: "为什么建议",
        items: [`${text(creative.diagnosis) || "unknown"} → ${text(creative.recommended_action) || "continue_observing"}`],
      },
      { key: "gaps", label: "数据缺口", items: list(creative.gaps, "无已知数据缺口") },
      { key: "rule_version", label: "规则版本", items: [text(ruleVersion) || "unknown"] },
    ];
  }

  function cleanNavigationValues(value) {
    return (Array.isArray(value) ? value : [value]).map(text).filter(Boolean);
  }

  function creativeTargetFilters(creative = {}) {
    const materialType = text(creative.material_type);
    const creativeId = text(creative.creative_id);
    return {
      account: [],
      productForm: [],
      operator: [],
      materialType: materialType ? [materialType] : [],
      videoSource: [],
      videoSubtype: [],
      materialName: [],
      adName: [],
      lifecycleCreativeId: creativeId ? [creativeId] : [],
    };
  }

  function lifecycleNavigationTarget(kind, state = {}, creative = {}) {
    const view = kind === "attribution" ? "attribution" : "creative";
    const preserve = {
      startDate: text(state.startDate),
      endDate: text(state.endDate),
      country: cleanNavigationValues(state.country),
      product: cleanNavigationValues(state.product),
    };
    if (view === "creative") {
      Object.assign(preserve, creativeTargetFilters(creative));
    }
    const params = new URLSearchParams({ view });
    if (preserve.startDate) params.set("start", preserve.startDate);
    if (preserve.endDate) params.set("end", preserve.endDate);
    preserve.country.forEach((value) => params.append("country", value));
    preserve.product.forEach((value) => params.append("product", value));
    preserve.materialType?.forEach((value) => params.append("materialType", value));
    preserve.lifecycleCreativeId?.forEach((value) => params.append("lifecycleCreativeId", value));
    return { view, preserve, href: `?${params.toString()}` };
  }

  function applyLifecycleNavigation(state = {}, target = {}) {
    const next = { ...state, ...(target.preserve || {}), view: target.view || state.view };
    if (next.view !== "lifecycle") {
      Object.entries({
        material_type: "", creative_id: "", diagnosis: "", stage: "", metric: "ctr",
      }).forEach(([key, value]) => {
        if (Object.prototype.hasOwnProperty.call(state, key)) next[key] = value;
      });
    }
    if (next.view !== "creative") next.lifecycleCreativeId = [];
    return next;
  }

  function lifecycleSelectionForCreative(payload = {}, creativeId = "") {
    const creative = (payload.creatives || []).find((item) => item.creative_id === creativeId);
    if (!creative) return null;
    return {
      product: [creative.product_name],
      material_type: creative.material_type,
      creative_id: creative.creative_id,
    };
  }

  function lifecyclePeerCurves(model = {}, creative = {}) {
    const exactScopePeers = creative.peer_scope_evidence?.curves;
    return Array.isArray(exactScopePeers) ? exactScopePeers : [];
  }

  return {
    selectLifecycleModel,
    lifecycleHealth,
    lifecycleKpis,
    lifecycleHierarchy,
    lifecycleActionQueue,
    lifecycleCreativeDetail,
    lifecycleActionPresentation,
    lifecycleHierarchyPresentation,
    lifecycleRowDetailFields,
    renderLifecycleRowDetails,
    lifecycleExplanation,
    lifecycleNavigationTarget,
    applyLifecycleNavigation,
    lifecycleSelectionForCreative,
    lifecyclePeerCurves,
  };
});
