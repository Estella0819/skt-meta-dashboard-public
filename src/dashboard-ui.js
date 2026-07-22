(function attachDashboardUI(root, factory) {
  const filters = typeof module === "object" && module.exports
    ? require("./components/filter-controls.js")
    : root?.DashboardFilters;
  const api = factory(filters);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardUI = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardUI(DashboardFilters) {
  function selectedSummary(selected) {
    const values = Array.isArray(selected) ? selected.filter(Boolean) : [];
    if (!values.length) return "全部";
    if (values.length === 1) return String(values[0]);
    return `已选 ${values.length} 项`;
  }

  function filterSelectionSummary(label, selected, available) {
    return DashboardFilters.selectionSummary(label, selected, available);
  }

  function isoDate(value) {
    return value.toISOString().slice(0, 10);
  }

  function datePresetRange(preset, maxDate) {
    const end = new Date(`${maxDate}T00:00:00Z`);
    if (Number.isNaN(end.getTime())) throw new Error("Invalid max date");

    if (preset === "month") {
      const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
      return { startDate: isoDate(start), endDate: isoDate(end) };
    }

    const days = { "3d": 3, "7d": 7, "30d": 30 }[preset];
    if (!days) throw new Error(`Unsupported date preset: ${preset}`);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    return { startDate: isoDate(start), endDate: isoDate(end) };
  }

  return { selectedSummary, filterSelectionSummary, datePresetRange };
});
