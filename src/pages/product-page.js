(function attachDashboardProduct(root, metrics, taxonomy, factory) {
  const api = factory(metrics, taxonomy);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardProduct = api;
})(
  typeof window !== "undefined" ? window : globalThis,
  typeof DashboardMetrics !== "undefined" ? DashboardMetrics : require("../dashboard-metrics.js"),
  typeof DashboardProductTaxonomy !== "undefined" ? DashboardProductTaxonomy : require("../product-taxonomy.js"),
  function createDashboardProduct(DashboardMetricsApi, DashboardProductTaxonomyApi) {
    const productHierarchy = DashboardProductTaxonomyApi.hierarchy;
    const productSeriesLookup = new Map();
    const productPathLookup = new Map();
    const productNodePathLookup = new Map();

    function indexProductHierarchy(node, rootSeries, ancestors = []) {
      if (typeof node === "string") {
        if (productPathLookup.has(node)) throw new Error(`Duplicate product hierarchy leaf: ${node}`);
        productSeriesLookup.set(node, rootSeries);
        productPathLookup.set(node, [...ancestors, node]);
        return [node];
      }
      const path = [...ancestors, node.name];
      productSeriesLookup.set(node.name, rootSeries || node.name);
      productNodePathLookup.set(node.name, path);
      return node.children.flatMap((child) => indexProductHierarchy(child, rootSeries || node.name, path));
    }

    const productSeriesChildren = Object.fromEntries(productHierarchy.map((node) => [
      node.name,
      indexProductHierarchy(node, node.name),
    ]));
    const segmentDimension = {
      overall: "standard_product_name",
      form: "product_form",
      material: "material_type",
    };
    const filterFields = {
      account: ["account_name"],
      country: ["country"],
      product: ["product_name", "standard_product_name"],
      productForm: ["product_form"],
      materialType: ["material_type"],
    };

    function isMetaRow(row) {
      return row.operator !== "Google" && row.material_type !== "Google";
    }

    function applyFilters(rows, filters = {}) {
      return (rows || []).filter(isMetaRow).filter((row) => Object.entries(filters).every(([key, selected]) => {
        if (!Array.isArray(selected) || selected.length === 0) return true;
        const fields = filterFields[key] || [key];
        return fields.some((field) => selected.includes(row[field]));
      }));
    }

    function deltaText(now, before) {
      if (!before) return { text: "上一周期无数据", cls: "flat" };
      const diff = (now - before) / before;
      return { text: `${diff >= 0 ? "+" : ""}${(diff * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`, cls: diff >= 0 ? "up" : "down" };
    }

    function withShares(rows) {
      const spend = rows.reduce((sum, row) => sum + row.spend, 0);
      const sales = rows.reduce((sum, row) => sum + row.purchase_value, 0);
      return rows.map((row) => ({
        ...row,
        spend_share: spend ? row.spend / spend : 0,
        sales_share: sales ? row.purchase_value / sales : 0,
      }));
    }

    function compareRows(current, previous, dimensions) {
      const currentRows = withShares(DashboardMetricsApi.groupRows(current, dimensions));
      const previousRows = withShares(DashboardMetricsApi.groupRows(previous, dimensions));
      const key = (row) => dimensions.map((dimension) => row[dimension] ?? "Unknown").join("||");
      const previousMap = new Map(previousRows.map((row) => [key(row), row]));
      return currentRows.map((row) => {
        const before = previousMap.get(key(row)) || {};
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
      }).sort((left, right) => right.purchase_value - left.purchase_value || right.spend - left.spend);
    }

    function productSeriesForProduct(productName) {
      const product = String(productName || "Unknown").trim() || "Unknown";
      return productSeriesLookup.get(product) || product;
    }

    function rowsWithProductSeries(rows) {
      return (rows || []).map((row) => ({
        ...row,
        product_series: productSeriesForProduct(row.standard_product_name || row.product_name),
      }));
    }

    function hierarchyMetricRow(currentRows, previousRows, currentTotal, previousTotal) {
      const current = DashboardMetricsApi.summarizeRows(currentRows);
      const previous = DashboardMetricsApi.summarizeRows(previousRows);
      const spendShare = currentTotal.spend ? current.spend / currentTotal.spend : 0;
      const salesShare = currentTotal.purchase_value ? current.purchase_value / currentTotal.purchase_value : 0;
      const previousSpendShare = previousTotal.spend ? previous.spend / previousTotal.spend : 0;
      const previousSalesShare = previousTotal.purchase_value ? previous.purchase_value / previousTotal.purchase_value : 0;
      return {
        ...current,
        cpm: current.impressions ? (current.spend / current.impressions) * 1000 : 0,
        spend_share: spendShare,
        sales_share: salesShare,
        spend_delta: deltaText(current.spend, previous.spend),
        sales_delta: deltaText(current.purchase_value, previous.purchase_value),
        conversion_delta: deltaText(current.purchase_times, previous.purchase_times),
        roas_delta: deltaText(current.roas, previous.roas),
        cpa_delta: deltaText(current.cpa, previous.cpa),
        ctr_delta: deltaText(current.ctr, previous.ctr),
        cvr_delta: deltaText(current.cvr, previous.cvr),
        aov_delta: deltaText(current.aov, previous.aov),
        spend_share_delta: deltaText(spendShare, previousSpendShare),
        sales_share_delta: deltaText(salesShare, previousSalesShare),
      };
    }

    function buildProductHierarchy(currentRows, previousRows, expandedSeries = []) {
      const groupByProduct = (rows) => {
        const groups = new Map();
        for (const row of rows || []) {
          const product = String(row.standard_product_name || row.product_name || "Unknown").trim() || "Unknown";
          if (!groups.has(product)) groups.set(product, []);
          groups.get(product).push(row);
        }
        return groups;
      };
      const currentByProduct = groupByProduct(currentRows);
      const previousByProduct = groupByProduct(previousRows);
      const currentTotal = DashboardMetricsApi.summarizeRows(currentRows || []);
      const previousTotal = DashboardMetricsApi.summarizeRows(previousRows || []);
      const rowsForLeaves = (groups, leaves) => leaves.flatMap((leaf) => groups.get(leaf) || []);
      const leavesForNode = (node) => [...new Set(
        typeof node === "string"
          ? [node]
          : [node.name, ...node.children.flatMap((child) => leavesForNode(child))],
      )];
      const output = [];

      function buildNode(node, depth, parentValue = "", rootSeries = "") {
        const leaves = leavesForNode(node);
        const nodeCurrentRows = rowsForLeaves(currentByProduct, leaves);
        if (!nodeCurrentRows.length) return [];
        const nodePreviousRows = rowsForLeaves(previousByProduct, leaves);
        const nodeName = typeof node === "string" ? node : node.name;
        const expandable = typeof node !== "string"
          && !(node.children.length === 1 && node.children[0] === node.name);
        const expanded = expandable && expandedSeries.includes(nodeName);
        const row = {
          ...hierarchyMetricRow(nodeCurrentRows, nodePreviousRows, currentTotal, previousTotal),
          standard_product_name: nodeName,
          product_series: rootSeries || nodeName,
          _depth: depth,
          _nodeType: expandable ? "product_series" : "product",
          _nodeValue: nodeName,
          _parentValue: parentValue,
          _expandable: expandable,
          _expanded: expanded,
        };
        if (!expanded) return [row];
        const directRows = typeof node === "string" ? [] : (currentByProduct.get(node.name) || []);
        const directPreviousRows = typeof node === "string" ? [] : (previousByProduct.get(node.name) || []);
        const directRow = directRows.length && !node.children.includes(node.name)
          ? [{
            ...hierarchyMetricRow(directRows, directPreviousRows, currentTotal, previousTotal),
            standard_product_name: node.name,
            product_series: rootSeries || node.name,
            _depth: depth + 1,
            _nodeType: "product",
            _nodeValue: node.name,
            _displayName: node.name === "5X系列" ? "5X套组" : `${node.name}（Meta仅标到系列）`,
            _parentValue: nodeName,
            _expandable: false,
            _expanded: false,
          }]
          : [];
        return [
          row,
          ...directRow,
          ...node.children.flatMap((child) => buildNode(child, depth + 1, nodeName, rootSeries || nodeName)),
        ];
      }

      const rootNodes = productHierarchy
        .map((node) => ({
          node,
          rows: rowsForLeaves(currentByProduct, leavesForNode(node)),
        }))
        .filter(({ rows }) => rows.length)
        .map(({ node, rows }) => ({
          node,
          purchaseValue: DashboardMetricsApi.summarizeRows(rows).purchase_value,
        }));
      const ungroupedProducts = [...currentByProduct.keys()]
        .filter((product) => !productPathLookup.has(product) && !productNodePathLookup.has(product))
        .map((product) => ({
          node: product,
          purchaseValue: DashboardMetricsApi.summarizeRows(currentByProduct.get(product)).purchase_value,
        }));

      [...rootNodes, ...ungroupedProducts]
        .sort((left, right) => right.purchaseValue - left.purchaseValue || String(
          typeof left.node === "string" ? left.node : left.node.name,
        ).localeCompare(String(typeof right.node === "string" ? right.node : right.node.name), "zh-CN"))
        .forEach(({ node }) => output.push(...buildNode(
          node,
          0,
          "",
          typeof node === "string" ? node : node.name,
        )));
      return output;
    }

    function selectModel(factRows, previousFactRows, adRows, previousAdRows, filters = {}, requestedSegment = "overall") {
      const segment = segmentDimension[requestedSegment] ? requestedSegment : "overall";
      const dimension = segmentDimension[segment];
      const source = segment === "material" ? adRows : factRows;
      const previousSource = segment === "material" ? previousAdRows : previousFactRows;
      const current = applyFilters(source, filters);
      const previous = applyFilters(previousSource, filters);
      const detailDimensions = segment === "overall"
        ? ["standard_product_name"]
        : ["standard_product_name", dimension];

      return {
        segment,
        dimension,
        summary: DashboardMetricsApi.summarizeRows(current),
        previousSummary: DashboardMetricsApi.summarizeRows(previous),
        trend: DashboardMetricsApi.groupRows(current, ["date_start"]).sort((left, right) => String(left.date_start).localeCompare(String(right.date_start))),
        trendByProduct: DashboardMetricsApi.groupRows(current, ["date_start", "standard_product_name"])
          .sort((left, right) => String(left.date_start).localeCompare(String(right.date_start))
            || String(left.standard_product_name).localeCompare(String(right.standard_product_name), "zh-CN")),
        structure: compareRows(current, previous, [dimension]),
        seriesStructure: compareRows(rowsWithProductSeries(current), rowsWithProductSeries(previous), ["product_series"]),
        previousStructure: withShares(DashboardMetricsApi.groupRows(previous, [dimension])),
        detail: compareRows(current, previous, detailDimensions),
        previousDetail: withShares(DashboardMetricsApi.groupRows(previous, detailDimensions)),
        country: compareRows(current, previous, ["standard_product_name", "country"]),
        previousCountry: withShares(DashboardMetricsApi.groupRows(previous, ["standard_product_name", "country"])),
        hierarchyCurrentRows: current,
        hierarchyPreviousRows: previous,
      };
    }

    return {
      applyFilters,
      buildProductHierarchy,
      productHierarchy,
      productSeriesChildren,
      productSeriesForProduct,
      segmentDimension,
      selectModel,
    };
  },
);
