(function attachDashboardFilters(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardFilters = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardFilters() {
  const NONE_VALUE = "__FILTER_NONE__";

  function selectionSummary(label, selected, available) {
    const requested = Array.isArray(selected) ? selected.filter(Boolean) : [];
    const explicitlyEmpty = requested.includes(NONE_VALUE);
    const selectedValues = requested.filter((value) => value !== NONE_VALUE);
    const availableValues = Array.isArray(available) ? available.filter(Boolean) : [];
    const count = explicitlyEmpty ? 0 : (selectedValues.length || availableValues.length);
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

  function availableValues(panel) {
    return optionInputs(panel).map((input) => input.value);
  }

  function selectionForState(panel) {
    const selected = selectedValues(panel);
    return selected.length ? selected : [NONE_VALUE];
  }

  function groupValues(values, groupForValue, groupOrder = []) {
    const groups = new Map();
    (Array.isArray(values) ? values : []).forEach((value) => {
      const label = groupForValue(value) || "未识别地区";
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(value);
    });
    const order = new Map(groupOrder.map((label, index) => [label, index]));
    return [...groups.entries()]
      .sort(([left], [right]) => {
        const leftOrder = order.has(left) ? order.get(left) : Number.MAX_SAFE_INTEGER;
        const rightOrder = order.has(right) ? order.get(right) : Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder || left.localeCompare(right, "zh-CN");
      })
      .map(([label, groupedValues]) => ({
        label,
        values: [...groupedValues].sort((left, right) => left.localeCompare(right, "en")),
      }));
  }

  function updateGroupSelections(panel) {
    panel.querySelectorAll("[data-filter-group]").forEach((input) => {
      const group = input.closest("[data-filter-group-row]");
      const children = group ? [...group.querySelectorAll("input[data-filter-option]")] : [];
      const status = selectAllState(
        children.filter((child) => child.checked).map((child) => child.value),
        children.map((child) => child.value),
      );
      input.checked = status === "checked";
      input.indeterminate = status === "indeterminate";
      input.disabled = children.length === 0;
      input.dataset.state = status;
    });
  }

  function updateSelectAll(panel) {
    const input = panel.querySelector("[data-filter-select-all]");
    if (!input) return;
    const available = availableValues(panel);
    const status = selectAllState(selectedValues(panel), available);
    input.checked = status === "checked";
    input.indeterminate = status === "indeterminate";
    input.disabled = available.length === 0;
    input.dataset.state = status;
    updateGroupSelections(panel);
  }

  function syncSelection(panel, selected) {
    if (!panel) return [];
    const inputs = optionInputs(panel);
    const requested = Array.isArray(selected) ? selected.filter(Boolean) : [];
    const explicitlyEmpty = requested.includes(NONE_VALUE);
    const effective = new Set(explicitlyEmpty ? [] : (requested.length ? requested : availableValues(panel)));
    inputs.forEach((input) => {
      input.checked = effective.has(input.value);
    });
    updateSelectAll(panel);
    return selectedValues(panel);
  }

  function filterVisibleOptions(panel, keyword) {
    const query = String(keyword || "").trim().toLowerCase();
    const groups = [...panel.querySelectorAll("[data-filter-group-row]")];
    if (groups.length) {
      groups.forEach((group) => {
        const groupMatch = String(group.dataset.filterGroupLabel || "").toLowerCase().includes(query);
        let childMatch = false;
        group.querySelectorAll("[data-filter-option-row]").forEach((option) => {
          const matches = !query || groupMatch || option.textContent.trim().toLowerCase().includes(query);
          option.classList.toggle("hidden", !matches);
          childMatch = childMatch || matches;
        });
        group.classList.toggle("hidden", Boolean(query) && !groupMatch && !childMatch);
      });
      updateSelectAll(panel);
      return;
    }
    panel.querySelectorAll("[data-filter-option-row]").forEach((option) => {
      const text = option.textContent.trim().toLowerCase();
      option.classList.toggle("hidden", query && !text.includes(query));
    });
    updateSelectAll(panel);
  }

  function bindInteractions(root, { onChange, preserveScroll, render }) {
    function commit(key, panel) {
      updateSelectAll(panel);
      onChange(key, selectionForState(panel));
      preserveScroll((renderRequest) => render(key, renderRequest));
    }

    root.addEventListener("input", (event) => {
      if (!event.target.matches("[data-filter-search]")) return;
      filterVisibleOptions(event.target.closest(".multi-panel"), event.target.value);
    });

    root.addEventListener("change", (event) => {
      if (event.target.matches("[data-filter-group]")) {
        const panel = event.target.closest(".multi-panel");
        const group = event.target.closest("[data-filter-group-row]");
        group.querySelectorAll("input[data-filter-option]").forEach((input) => {
          input.checked = event.target.checked;
        });
        commit(event.target.dataset.filterGroup, panel);
        return;
      }
      if (event.target.matches(".multi-panel input[data-filter-option]")) {
        commit(event.target.dataset.filter, event.target.closest(".multi-panel"));
        return;
      }
      if (!event.target.matches("[data-filter-select-all]")) return;
      const panel = event.target.closest(".multi-panel");
      const next = new Set(toggleAll(selectedValues(panel), availableValues(panel), event.target.checked));
      optionInputs(panel).forEach((input) => {
        input.checked = next.has(input.value);
      });
      commit(event.target.dataset.filterSelectAll, panel);
    });

    root.addEventListener("click", (event) => {
      if (!event.target.matches("[data-filter-group-toggle]")) return;
      const group = event.target.closest("[data-filter-group-row]");
      const collapsed = group.classList.toggle("collapsed");
      event.target.setAttribute("aria-expanded", String(!collapsed));
    });
  }

  return {
    NONE_VALUE,
    availableValues,
    groupValues,
    selectionSummary,
    selectionForState,
    selectAllState,
    toggleAll,
    filterVisibleOptions,
    updateGroupSelections,
    syncSelection,
    bindInteractions,
  };
});
