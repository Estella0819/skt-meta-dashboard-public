(function attachDashboardSegments(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardSegments = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardSegments() {
  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function render(container, options, active, onChange) {
    if (!container) return;
    const items = Array.isArray(options) ? options : [];
    const activeValue = items.some(({ value }) => value === active)
      ? active
      : items[0]?.value;
    container.innerHTML = items.map(({ value, label }) => {
      const isActive = value === activeValue;
      return `<button type="button" class="${isActive ? "active" : ""}" data-segment="${escapeHtml(value)}" aria-pressed="${isActive}">${escapeHtml(label)}</button>`;
    }).join("");
    container.onclick = (event) => {
      const target = typeof event.target.closest === "function"
        ? event.target.closest("[data-segment]")
        : event.target;
      if (target?.dataset?.segment) onChange(target.dataset.segment);
    };
  }

  return { render };
});
