(function attachDashboardCreative(root, metrics, factory) {
  const api = factory(metrics);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardCreative = api;
})(
  typeof window !== "undefined" ? window : globalThis,
  typeof DashboardMetrics !== "undefined" ? DashboardMetrics : require("../dashboard-metrics.js"),
  function createDashboardCreative(DashboardMetricsApi) {
    const segmentDimension = {
      type: "material_type",
      source: "video_source",
      subtype: "video_subtype",
    };
    const videoMaterialType = "视频";
    const productMaterialTypes = [
      { value: "图文", prefix: "image" },
      { value: "视频", prefix: "video" },
      { value: "合创", prefix: "cocreate" },
    ];
    const filterFields = {
      account: ["account_name"],
      account_name: ["account_name"],
      country: ["country"],
      product: ["product_name", "standard_product_name"],
      product_name: ["product_name", "standard_product_name"],
      standard_product_name: ["standard_product_name", "product_name"],
      productForm: ["product_form"],
      product_form: ["product_form"],
      operator: ["operator"],
      materialType: ["material_type"],
      material_type: ["material_type"],
      videoSource: ["video_source"],
      video_source: ["video_source"],
      videoSubtype: ["video_subtype"],
      video_subtype: ["video_subtype"],
      materialName: ["material_name"],
      material_name: ["material_name"],
      adName: ["ad_name"],
      ad_name: ["ad_name"],
    };

    function isMetaRow(row) {
      return row.operator !== "Google" && row.material_type !== "Google";
    }

    function normalizeLifecycleCreativeName(value) {
      return String(value ?? "")
        .trim()
        .replace(/[\s_\-–—]*(?:广告副本|copy)(?:[\s_\-]*\d+)?\s*$/i, "")
        .replace(/[\s_]+/g, " ")
        .trim()
        .toLowerCase();
    }

    function lifecycleCreativeIdentity(row = {}) {
      const provided = String(row.creative_id ?? "").trim();
      if (provided) return provided;
      const materialCode = String(row.material_code ?? "").trim();
      if (materialCode) return `code:${materialCode}`;
      const materialName = normalizeLifecycleCreativeName(row.material_name)
        || normalizeLifecycleCreativeName(row.ad_name);
      if (materialName) return `name:${materialName}`;
      const adId = String(row.ad_id ?? "").trim();
      return adId ? `ad:${adId}` : "unknown";
    }

    function applyFilters(rows, filters = {}) {
      return (rows || []).filter(isMetaRow).filter((row) => Object.entries(filters).every(([key, selected]) => {
        if (!Array.isArray(selected) || selected.length === 0) return true;
        if (key === "lifecycleCreativeId") {
          return selected.includes(lifecycleCreativeIdentity(row));
        }
        const fields = filterFields[key] || [key];
        return fields.some((field) => selected.includes(row[field]));
      }));
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

    function rowKey(row, dimensions) {
      return dimensions.map((dimension) => row[dimension] ?? "Unknown").join("||");
    }

    function normalizeMaterialCode(value) {
      const code = String(value ?? "").trim();
      return code === "Unknown" || code === "-" ? "" : code;
    }

    function nullableRatio(numerator, denominator, hasRows) {
      return hasRows && denominator ? numerator / denominator : null;
    }

    function nullableDelta(now, before) {
      return now === null || now === undefined ? null : deltaText(now, before ?? 0);
    }

    function materialMetricSet(current, previous, currentTotalGmv, previousTotalGmv) {
      const hasCurrentRows = Boolean(current);
      const hasPreviousRows = Boolean(previous);
      const currentSpend = current ? Number(current.spend || 0) : 0;
      const currentGmv = current ? Number(current.purchase_value || 0) : 0;
      const currentPurchases = current ? Number(current.purchase_times || 0) : 0;
      const previousSpend = previous ? Number(previous.spend || 0) : 0;
      const previousGmv = previous ? Number(previous.purchase_value || 0) : 0;
      const previousPurchases = previous ? Number(previous.purchase_times || 0) : 0;
      const values = {
        gmv_share: nullableRatio(currentGmv, currentTotalGmv, hasCurrentRows),
        roas: nullableRatio(currentGmv, currentSpend, hasCurrentRows),
        aov: nullableRatio(currentGmv, currentPurchases, hasCurrentRows),
      };
      const previousValues = {
        gmv_share: nullableRatio(previousGmv, previousTotalGmv, hasPreviousRows),
        roas: nullableRatio(previousGmv, previousSpend, hasPreviousRows),
        aov: nullableRatio(previousGmv, previousPurchases, hasPreviousRows),
      };
      return Object.fromEntries(Object.keys(values).flatMap((key) => [
        [key, values[key]],
        [`${key}_delta`, nullableDelta(values[key], previousValues[key])],
      ]));
    }

    function buildProductMaterialMatrix(currentRows, previousRows) {
      const currentProducts = DashboardMetricsApi.groupRows(currentRows, ["standard_product_name"]);
      const previousProducts = DashboardMetricsApi.groupRows(previousRows, ["standard_product_name"]);
      const currentMaterials = DashboardMetricsApi.groupRows(
        currentRows,
        ["standard_product_name", "material_type"],
      );
      const previousMaterials = DashboardMetricsApi.groupRows(
        previousRows,
        ["standard_product_name", "material_type"],
      );
      const previousProductMap = new Map(
        previousProducts.map((row) => [rowKey(row, ["standard_product_name"]), row]),
      );
      const currentMaterialMap = new Map(
        currentMaterials.map((row) => [rowKey(row, ["standard_product_name", "material_type"]), row]),
      );
      const previousMaterialMap = new Map(
        previousMaterials.map((row) => [rowKey(row, ["standard_product_name", "material_type"]), row]),
      );
      const rows = currentProducts.map((product) => {
        const productKey = rowKey(product, ["standard_product_name"]);
        const previousProduct = previousProductMap.get(productKey);
        const row = {
          standard_product_name: product.standard_product_name,
          purchase_value: product.purchase_value,
          sales_delta: deltaText(product.purchase_value, previousProduct?.purchase_value || 0),
        };
        for (const { value, prefix } of productMaterialTypes) {
          const materialKey = rowKey({ standard_product_name: product.standard_product_name, material_type: value }, [
            "standard_product_name",
            "material_type",
          ]);
          Object.assign(row, Object.fromEntries(
            Object.entries(materialMetricSet(
              currentMaterialMap.get(materialKey),
              previousMaterialMap.get(materialKey),
              product.purchase_value,
              previousProduct?.purchase_value || 0,
            )).map(([key, metric]) => [`${prefix}_${key}`, metric]),
          ));
        }
        return row;
      }).sort((left, right) => right.purchase_value - left.purchase_value);

      const currentSummary = DashboardMetricsApi.summarizeRows(currentRows);
      const previousSummary = DashboardMetricsApi.summarizeRows(previousRows);
      const currentMaterialMapByType = new Map(
        DashboardMetricsApi.groupRows(currentRows, ["material_type"])
          .map((row) => [row.material_type, row]),
      );
      const previousMaterialMapByType = new Map(
        DashboardMetricsApi.groupRows(previousRows, ["material_type"])
          .map((row) => [row.material_type, row]),
      );
      const summary = {
        purchase_value: currentSummary.purchase_value,
        sales_delta: deltaText(currentSummary.purchase_value, previousSummary.purchase_value),
      };
      for (const { value, prefix } of productMaterialTypes) {
        Object.assign(summary, Object.fromEntries(
          Object.entries(materialMetricSet(
            currentMaterialMapByType.get(value),
            previousMaterialMapByType.get(value),
            currentSummary.purchase_value,
            previousSummary.purchase_value,
          )).map(([key, metric]) => [`${prefix}_${key}`, metric]),
        ));
      }
      return { rows, summary };
    }

    function withShares(rows) {
      const totalSpend = rows.reduce((sum, row) => sum + row.spend, 0);
      const totalSales = rows.reduce((sum, row) => sum + row.purchase_value, 0);
      return rows.map((row) => ({
        ...row,
        spend_share: totalSpend ? row.spend / totalSpend : 0,
        sales_share: totalSales ? row.purchase_value / totalSales : 0,
      }));
    }

    function aggregateWithComparison(current, previous, dimensions) {
      const currentRows = withShares(DashboardMetricsApi.groupRows(current, dimensions));
      const previousRows = withShares(DashboardMetricsApi.groupRows(previous, dimensions));
      const previousMap = new Map(previousRows.map((row) => [rowKey(row, dimensions), row]));
      const empty = {
        ...DashboardMetricsApi.summarizeRows([]),
        spend_share: 0,
        sales_share: 0,
      };
      return currentRows.map((row) => {
        const before = previousMap.get(rowKey(row, dimensions)) || empty;
        return {
          ...row,
          spend_delta: deltaText(row.spend, before.spend),
          sales_delta: deltaText(row.purchase_value, before.purchase_value),
          conversion_delta: deltaText(row.purchase_times, before.purchase_times),
          roas_delta: deltaText(row.roas, before.roas),
          cpa_delta: deltaText(row.cpa, before.cpa),
          ctr_delta: deltaText(row.ctr, before.ctr),
          cvr_delta: deltaText(row.cvr, before.cvr),
          aov_delta: deltaText(row.aov, before.aov),
          spend_share_delta: deltaText(row.spend_share, before.spend_share),
          sales_share_delta: deltaText(row.sales_share, before.sales_share),
        };
      }).sort((left, right) => right.spend - left.spend);
    }

    function hierarchyRow(row, depth, nodeType, nodeValue, parentValue, expandable, expanded) {
      return {
        ...row,
        _depth: depth,
        _nodeType: nodeType,
        _nodeValue: nodeValue,
        _parentValue: parentValue ?? null,
        _expandable: expandable,
        _expanded: expanded,
      };
    }

    function buildHierarchy(currentRows, previousRows, expandedType = "", expandedSources = []) {
      const rows = [];
      const types = aggregateWithComparison(currentRows, previousRows, ["material_type"]);
      for (const type of types) {
        const isVideo = type.material_type === videoMaterialType;
        rows.push(hierarchyRow(
          type, 0, "material_type", type.material_type, null,
          isVideo, isVideo && expandedType === videoMaterialType,
        ));
        if (!isVideo || expandedType !== videoMaterialType) continue;
        const normalizeVideoSource = (row) => ({ ...row, video_source: row.video_source ?? "" });
        const currentVideo = currentRows
          .filter((row) => row.material_type === videoMaterialType)
          .map(normalizeVideoSource);
        const previousVideo = previousRows
          .filter((row) => row.material_type === videoMaterialType)
          .map(normalizeVideoSource);
        const sources = aggregateWithComparison(currentVideo, previousVideo, ["video_source"]);
        for (const source of sources) {
          const expanded = expandedSources.includes(source.video_source);
          rows.push(hierarchyRow(
            source, 1, "video_source", source.video_source, videoMaterialType, true, expanded,
          ));
          if (!expanded) continue;
          rows.push(...aggregateWithComparison(
            currentVideo.filter((row) => row.video_source === source.video_source),
            previousVideo.filter((row) => row.video_source === source.video_source),
            ["video_subtype"],
          ).map((subtype) => hierarchyRow(
            subtype, 2, "video_subtype", subtype.video_subtype,
            source.video_source, false, false,
          )));
        }
      }
      return rows;
    }

    function selectModel(adRows, previousRows, filters = {}, requestedSegment = "type") {
      const segment = segmentDimension[requestedSegment] ? requestedSegment : "type";
      const dimension = segmentDimension[segment];
      const scopePopulation = (rows) => segment === "type"
        ? rows
        : rows.filter((row) => row.material_type === videoMaterialType);
      const filteredCurrent = applyFilters(adRows, filters);
      const filteredPrevious = applyFilters(previousRows, filters);
      const matrix = buildProductMaterialMatrix(filteredCurrent, filteredPrevious);
      const current = scopePopulation(filteredCurrent);
      const previous = scopePopulation(filteredPrevious);
      const productDimensions = ["standard_product_name", dimension];

      return {
        segment,
        dimension,
        currentRows: current,
        previousRows: previous,
        summary: DashboardMetricsApi.summarizeRows(current),
        previousSummary: DashboardMetricsApi.summarizeRows(previous),
        trend: DashboardMetricsApi.groupRows(current, ["date_start", dimension])
          .sort((left, right) => (
            String(left.date_start).localeCompare(String(right.date_start))
            || String(left[dimension]).localeCompare(String(right[dimension]), "zh-CN")
          )),
        structure: aggregateWithComparison(current, previous, [dimension]),
        previousStructure: withShares(DashboardMetricsApi.groupRows(previous, [dimension])),
        productMaterial: aggregateWithComparison(current, previous, productDimensions),
        previousProductMaterial: withShares(DashboardMetricsApi.groupRows(previous, productDimensions)),
        productMaterialMatrix: matrix.rows,
        productMaterialSummary: matrix.summary,
        detail: current.map((row) => ({ ...row }))
          .sort((left, right) => Number(right.spend || 0) - Number(left.spend || 0)),
        previousDetail: previous.map((row) => ({ ...row })),
      };
    }

    return {
      applyFilters,
      buildHierarchy,
      buildProductMaterialMatrix,
      lifecycleCreativeIdentity,
      normalizeMaterialCode,
      segmentDimension,
      selectModel,
    };
  },
);
