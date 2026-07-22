(function attachDashboardPageShell(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardPageShell = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardPageShell() {
  function apply(viewElement, orderedModuleIds) {
    if (!viewElement) return;
    const directModules = [...viewElement.children].filter((node) => node.dataset?.module);
    orderedModuleIds.forEach((moduleId) => {
      directModules.filter((node) => node.dataset.module === moduleId).forEach((node) => viewElement.appendChild(node));
    });
  }

  function metricInfo(label) {
    const escaped = String(label).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    return `<button type="button" class="metric-info" aria-label="${escaped}" title="${escaped}">i</button>`;
  }

  return { apply, metricInfo };
});
