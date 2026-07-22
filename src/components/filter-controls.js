(function attachDashboardFilters(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardFilters = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardFilters() {
  function selectionSummary(label, selected, available) {
    const selectedValues = Array.isArray(selected) ? selected.filter(Boolean) : [];
    const availableValues = Array.isArray(available) ? available.filter(Boolean) : [];
    const count = selectedValues.length || availableValues.length;
    return `${label} ${count}`;
  }

  function selectAllState(selected, visible) {
    const selectedValues = new Set(Array.isArray(selected) ? selected : []);
    const visibleValues = Array.isArray(visible) ? visible : [];
    if (!visibleValues.length) return "unchecked";
    const count = visibleValues.filter((value) => selectedValues.has(value)).length;
    if (count === 0) return "unchecked";
    return count === visibleValues.length ? "checked" : "indeterminate";
  }

  function toggleAll(selected, visible, checked) {
    const next = new Set(Array.isArray(selected) ? selected : []);
    (Array.isArray(visible) ? visible : []).forEach((value) => {
      if (checked) next.add(value);
      else next.delete(value);
    });
    return [...next];
  }

  function optionInputs(panel) {
    return [...panel.querySelectorAll("input[data-filter-option]")];
  }

  function selectedValues(panel) {
    return optionInputs(panel).filter((input) => input.checked).map((input) => input.value);
  }

  function visibleValues(panel) {
    return [...panel.querySelectorAll("[data-filter-option-row]:not(.hidden) input[data-filter-option]")]
      .map((input) => input.value);
  }

  function updateSelectAll(panel) {
    const input = panel.querySelector("[data-filter-select-all]");
    if (!input) return;
    const visible = visibleValues(panel);
    const status = selectAllState(selectedValues(panel), visible);
    input.checked = status === "checked";
    input.indeterminate = status === "indeterminate";
    input.disabled = visible.length === 0;
    input.dataset.state = status;
  }

  function syncSelection(panel, selected) {
    if (!panel) return [];
    const inputs = optionInputs(panel);
    const requested = Array.isArray(selected) ? selected.filter(Boolean) : [];
    const effective = new Set(requested.length ? requested : inputs.map((input) => input.value));
    inputs.forEach((input) => {
      input.checked = effective.has(input.value);
    });
    updateSelectAll(panel);
    return selectedValues(panel);
  }

  function filterVisibleOptions(panel, keyword) {
    const query = String(keyword || "").trim().toLowerCase();
    panel.querySelectorAll("[data-filter-option-row]").forEach((option) => {
      const text = option.textContent.trim().toLowerCase();
      option.classList.toggle("hidden", query && !text.includes(query));
    });
    updateSelectAll(panel);
  }

  function bindInteractions(root, { onChange, preserveScroll, render }) {
    function commit(key, panel) {
      updateSelectAll(panel);
      onChange(key, selectedValues(panel));
      preserveScroll(() => render(key));
    }

    root.addEventListener("input", (event) => {
      if (!event.target.matches("[data-filter-search]")) return;
      filterVisibleOptions(event.target.closest(".multi-panel"), event.target.value);
    });

    root.addEventListener("change", (event) => {
      if (event.target.matches(".multi-panel input[data-filter-option]")) {
        commit(event.target.dataset.filter, event.target.closest(".multi-panel"));
        return;
      }
      if (!event.target.matches("[data-filter-select-all]")) return;
      const panel = event.target.closest(".multi-panel");
      const next = new Set(toggleAll(selectedValues(panel), visibleValues(panel), event.target.checked));
      optionInputs(panel).forEach((input) => {
        input.checked = next.has(input.value);
      });
      commit(event.target.dataset.filterSelectAll, panel);
    });
  }

  return {
    selectionSummary,
    selectAllState,
    toggleAll,
    syncSelection,
    bindInteractions,
  };
});
