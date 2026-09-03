(function attachDashboardProductFilters(root, taxonomy, factory) {
  const api = factory(taxonomy);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardProductFilters = api;
})(
  typeof window !== "undefined" ? window : globalThis,
  typeof DashboardProductTaxonomy !== "undefined" ? DashboardProductTaxonomy : require("./product-taxonomy.js"),
  function createDashboardProductFilters(DashboardProductTaxonomyApi) {

  function clean(value) {
    const text = String(value || "").trim();
    return text && text !== "Unknown" ? text : "";
  }

  // Product names are extracted from ad names, so collaboration/post labels
  // can leak into the product token. Keep this deliberately conservative:
  // remove a collaboration marker and everything after it, but do not strip
  // ordinary words from the product itself.
  function cleanProductName(value) {
    let text = clean(value).replace(/\s+/g, " ");
    const marker = text.search(/(?:^|[\s|,/()[\]{}\-_–—]+)(?:合创帖|合创|帖子|官帖|官号贴|官方贴|collab(?:oration)?|\bpost\b)/i);
    if (marker > 0) text = text.slice(0, marker).trim();
    text = text.replace(/[\s|,/()[\]{}\-_–—]+$/, "").trim();
    return text;
  }

  function sorted(values) {
    return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));
  }

  function hierarchy() {
    return DashboardProductTaxonomyApi.hierarchy;
  }

  function buildLookups() {
    const roots = new Map();
    const leaves = new Set();
    const nodes = new Map();
    const walk = (node, rootName) => {
      const root = rootName || node.name;
      if (typeof node === "string") {
        leaves.add(node);
        roots.set(node, root);
        nodes.set(node, { root, leaves: [node] });
        return;
      }
      const childLeaves = node.children.flatMap((child) => walk(child, root));
      roots.set(node.name, root);
      nodes.set(node.name, { root, leaves: [...new Set([node.name, ...childLeaves])] });
      return childLeaves;
    };
    hierarchy().forEach((node) => walk(node));
    return { roots, leaves, nodes };
  }

  function normalizedRowProduct(row) {
    return cleanProductName(row?.standard_product_name || row?.product_name);
  }

  function hierarchyGroups(rows) {
    const { nodes } = buildLookups();
    const used = new Set((rows || []).map(normalizedRowProduct).filter(Boolean));
    const present = (node) => {
      if (typeof node === "string") return used.has(node) ? node : null;
      const children = node.children.map(present).filter(Boolean);
      if (used.has(node.name) && !node.children.includes(node.name)) children.unshift(node.name);
      if (!children.length) return null;
      if (children.length === 1 && children[0] === node.name) return node.name;
      return { label: node.name, children };
    };
    const groups = hierarchy().map(present).filter(Boolean);
    const covered = new Set();
    const mark = (group) => {
      if (typeof group === "string") covered.add(group);
      else group.children.forEach(mark);
    };
    groups.forEach(mark);
    const other = sorted([...used].filter((value) => !covered.has(value)));
    if (other.length) groups.push({ label: "其他标准产品", children: other });
    return groups;
  }

  function flattenGroups(groups) {
    return (groups || []).flatMap((group) => (
      typeof group === "string" ? [group] : flattenGroups(group.children || [])
    ));
  }

  function advertisingOptions(rows) {
    const { roots, leaves } = buildLookups();
    const options = (rows || []).map((row) => {
      const standard = normalizedRowProduct(row);
      return roots.get(standard) || standard;
    });
    // A standard product not yet present in the confirmed hierarchy remains
    // selectable by its own name; raw ad product names are intentionally omitted.
    return sorted(options.filter((value) => value && (!leaves.has(value) || roots.has(value))));
  }

  function advertisingGroups(rows) {
    return hierarchyGroups(rows).map((group) => ({
      label: typeof group === "string" ? group : group.label,
      children: typeof group === "string" ? [group] : group.children,
      values: flattenGroups(typeof group === "string" ? [group] : group.children),
    }));
  }

  function matchesAdvertisingProduct(row, selectedValues) {
    const selected = Array.isArray(selectedValues) ? selectedValues.filter(Boolean) : [];
    if (!selected.length) return true;
    const { roots, nodes } = buildLookups();
    const standard = normalizedRowProduct(row);
    const productName = cleanProductName(row?.product_name);
    return selected.some((value) => {
      const node = nodes.get(value);
      return value === productName
        || value === standard
        || value === roots.get(standard)
        || Boolean(node?.leaves?.includes(standard));
    });
  }

  function channelOptions(rows) {
    return sorted((rows || []).filter((row) => {
      const sku = clean(row.sku_code);
      return sku && sku.toUpperCase() !== "UNKNOWN" && Number(row.sales || row.channel_sales || 0) !== 0;
    }).map((row) => clean(row.product_name)));
  }

  return { advertisingOptions, advertisingGroups, cleanProductName, channelOptions, matchesAdvertisingProduct };
  },
);
