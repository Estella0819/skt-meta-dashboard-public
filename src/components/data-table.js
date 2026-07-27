(function attachDashboardTable(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardTable = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardTable() {
  const bindings = new WeakMap();
  const viewportBindings = new WeakMap();

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function sortRows(rows, key, direction, accessor = (row) => row[key]) {
    const sign = direction === "asc" ? 1 : -1;
    return rows.map((row, index) => ({ row, index })).sort((left, right) => {
      const a = accessor(left.row);
      const b = accessor(right.row);
      if (a == null && b == null) return left.index - right.index;
      if (a == null) return 1;
      if (b == null) return -1;
      const result = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b), "zh-CN");
      return result === 0 ? left.index - right.index : result * sign;
    }).map(({ row }) => row);
  }

  function nextSort(current = {}, key) {
    return current.key === key
      ? { key, direction: current.direction === "desc" ? "asc" : "desc" }
      : { key, direction: "desc" };
  }

  function classNames(...values) {
    return values.filter(Boolean).join(" ");
  }

  function formatValue(column, raw, row, escape) {
    if (!column.format) return escape(raw);
    return column.format.length > 1 ? column.format(raw, row) : column.format(raw);
  }

  function defaultSummary(rows) {
    return rows.reduce((summary, row) => {
      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === "number" && Number.isFinite(value)) {
          summary[key] = (summary[key] || 0) + value;
        }
      });
      return summary;
    }, {});
  }

  function plainText(value) {
    const entities = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: '"',
      "#39": "'",
      nbsp: " ",
    };
    return String(value ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&([a-z]+|#\d+);/gi, (match, entity) => {
        const normalized = entity.toLowerCase();
        if (Object.hasOwn(entities, normalized)) return entities[normalized];
        if (normalized.startsWith("#")) return String.fromCodePoint(Number(normalized.slice(1)));
        return match;
      })
      .replace(/\s+/g, " ")
      .trim();
  }

  function copyValue(column, raw, row) {
    if (column.format) return plainText(formatValue(column, raw, row, escapeHtml));
    if (column.copyFormat) return plainText(column.copyFormat(raw, row));
    return plainText(formatValue(column, raw, row, escapeHtml));
  }

  function copySummaryValue(column, raw, summary) {
    if (column.summaryFormat) {
      const value = column.summaryFormat.length > 1
        ? column.summaryFormat(raw, summary)
        : column.summaryFormat(raw);
      return plainText(value);
    }
    return copyValue(column, raw, summary);
  }

  function summaryLine(columns, summary) {
    return columns.map((column, index) => {
      if (index === 0) return "合计";
      if (column.summary === false || column.filterKey || column.name) return "";
      const key = column.summaryKey || column.key;
      const raw = column.summaryValue ? column.summaryValue(summary) : summary[key];
      return copySummaryValue(column, raw, summary);
    }).join("\t");
  }

  function toTsv(rows, columns, options = {}) {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const tableColumns = Array.isArray(columns) ? columns : [];
    const sorted = options.sort?.key
      ? sortRows(sourceRows, options.sort.key, options.sort.direction, options.sort.accessor)
      : [...sourceRows];
    const header = tableColumns.map((column) => plainText(column.label)).join("\t");
    const body = sorted.map((row) => tableColumns.map((column) => {
      const raw = column.value ? column.value(row) : row[column.key];
      return copyValue(column, raw, row);
    }).join("\t"));
    const summary = options.summaryLine ?? (options.includeSummary
      ? summaryLine(tableColumns, (options.summarizeRows || defaultSummary)(options.summaryRows || sourceRows))
      : "");
    return [header, ...body, summary].filter(Boolean).join("\n");
  }

  function defaultSummaryCell(column, summary, index, _previousSummary, escape) {
    const label = escape(column.label);
    if (index === 0) return `<td data-label="${label}" class="summary-label">合计</td>`;
    if (column.summary === false || column.filterKey || column.name) return `<td data-label="${label}"></td>`;
    const key = column.summaryKey || column.key;
    const raw = column.summaryValue ? column.summaryValue(summary) : summary[key];
    if (raw === undefined || raw === null || raw === "") return `<td data-label="${label}"></td>`;
    const value = column.summaryFormat
      ? (column.summaryFormat.length > 1 ? column.summaryFormat(raw, summary) : column.summaryFormat(raw))
      : formatValue(column, raw, summary, escape);
    return `<td data-label="${label}" class="${classNames(column.num && "num", column.sticky && "sticky-col")}">${value}</td>`;
  }

  async function writeClipboard(text, environment = {}) {
    const navigatorRef = environment.navigator || globalThis.navigator;
    const documentRef = environment.document || globalThis.document;
    try {
      if (navigatorRef?.clipboard?.writeText) {
        await navigatorRef.clipboard.writeText(text);
        return true;
      }
    } catch (_error) {
      // Browsers can expose clipboard while denying writes outside a user gesture.
    }
    if (!documentRef?.createElement || typeof documentRef.execCommand !== "function") return false;

    let textarea;
    let copied = false;
    try {
      textarea = documentRef.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("aria-hidden", "true");
      documentRef.body?.append(textarea);
      textarea.select();
      copied = documentRef.execCommand("copy") === true;
    } catch (_error) {
      copied = false;
    } finally {
      try {
        textarea?.remove?.();
      } catch (_error) {
        copied = false;
      }
    }
    return copied;
  }

  function bindInteractions(element) {
    if (bindings.has(element)) return;
    bindings.set(element, {});
    element.addEventListener("click", (event) => {
      const binding = bindings.get(element) || {};
      const source = event.target?.nodeType === 1 ? event.target : (event.target?.parentElement || event.target);
      const sortTarget = source?.closest?.("[data-table-sort-key]");
      if (sortTarget && typeof binding.sort?.onChange === "function") {
        event.preventDefault();
        binding.sort.onChange(nextSort(binding.sort, sortTarget.dataset.tableSortKey));
        return;
      }
      const dimensionTarget = source?.closest?.("[data-filter-key][data-filter-value]");
      if (!dimensionTarget || typeof binding.onDimensionClick !== "function") return;
      event.preventDefault();
      const rowIndex = Number(dimensionTarget.dataset.rowIndex);
      const columnKey = dimensionTarget.dataset.columnKey;
      binding.onDimensionClick({
        key: dimensionTarget.dataset.filterKey,
        value: dimensionTarget.dataset.filterValue,
        row: binding.rows[rowIndex],
        column: binding.columns.find((column) => column.key === columnKey),
        target: dimensionTarget,
        event,
      });
    });
  }

  function renderBody(element, binding) {
    const {
      allRows,
      columns,
      escape,
      sort,
      options,
      summary,
      previousSummary,
      renderSummaryCell,
      windowStart,
      windowSize,
    } = binding;
    const wrapper = element.closest?.(".table-wrap");
    const scrollTop = wrapper?.scrollTop;
    const activeElement = element.ownerDocument?.activeElement;
    const focusedSortKey = activeElement && element.contains?.(activeElement)
      ? activeElement.dataset?.tableSortKey
      : "";
    const visibleRows = allRows.slice(windowStart, windowStart + windowSize);

    const head = columns.map((column) => {
      const sortable = Boolean(sort) && column.sortable !== false;
      const active = sortable && sort.key === column.key;
      const direction = active ? sort.direction : "";
      const headerClass = classNames(column.num && "num", column.sticky && "sticky-col");
      const sortAttributes = sortable ? ` aria-sort="${active ? (direction === "asc" ? "ascending" : "descending") : "none"}"` : "";
      const groupAttribute = sort?.group ? ` data-google-sort="${escape(sort.group)}"` : "";
      const label = escape(column.label);
      const content = sortable
        ? `<button type="button" class="google-sort-button ${active ? "active" : ""}" data-table-sort-key="${escape(column.key)}"${groupAttribute} data-google-sort-key="${escape(column.key)}" aria-label="按${label}排序">${label}<span aria-hidden="true">${direction === "asc" ? "↑" : (direction === "desc" ? "↓" : "↕")}</span></button>`
        : label;
      return `<th class="${headerClass}"${sortAttributes}>${content}</th>`;
    }).join("");

    const body = visibleRows.map((row, rowIndex) => `
      <tr data-table-row-index="${windowStart + rowIndex}" class="${escape(row?._rowClass || "")}">
        ${columns.map((column) => {
          const raw = column.value ? column.value(row) : row?.[column.key];
          const value = formatValue(column, raw, row, escape);
          const label = escape(column.label);
          const dimensionKey = options.getDimensionKey
            ? options.getDimensionKey(column)
            : (column.filterKey === false ? "" : (column.filterKey || ""));
          const href = dimensionKey && raw && options.dimensionHref
            ? options.dimensionHref(dimensionKey, raw)
            : "";
          const dimensionAttributes = dimensionKey && raw
            ? ` data-filter-key="${escape(dimensionKey)}" data-filter-value="${escape(raw)}" data-row-index="${windowStart + rowIndex}" data-column-key="${escape(column.key)}"`
            : "";
          const content = dimensionKey && raw
            ? `<a class="cell-filter-button"${dimensionAttributes} href="${escape(href || "#")}">${value}</a>`
            : value;
          const cellClass = classNames(
            column.num && "num",
            column.name && "name-cell",
            column.sticky && "sticky-col",
            dimensionKey && "click-cell",
          );
          return `<td data-label="${label}" class="${cellClass}">${content}</td>`;
        }).join("")}
      </tr>
    `).join("");

    element.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>${summary}`;
    if (focusedSortKey) {
      const focusedButton = [...element.querySelectorAll("[data-table-sort-key]")]
        .find((button) => button.dataset.tableSortKey === focusedSortKey);
      focusedButton?.focus({ preventScroll: true });
    }
    if (wrapper) wrapper.scrollTop = scrollTop;
    return visibleRows;
  }

  function bodyRows(element) {
    return [...(element.querySelectorAll?.("tbody tr") || [])];
  }

  function rowsHeight(rows) {
    return rows.reduce((height, row) => {
      const rectHeight = row.getBoundingClientRect?.().height;
      const rowHeight = Number.isFinite(rectHeight) && rectHeight > 0
        ? rectHeight
        : (row.offsetHeight || row.clientHeight || 0);
      return height + rowHeight;
    }, 0);
  }

  function elementHeight(element) {
    if (!element) return 0;
    const rectHeight = element.getBoundingClientRect?.().height;
    if (Number.isFinite(rectHeight) && rectHeight > 0) return rectHeight;
    return element.offsetHeight || element.clientHeight || 0;
  }

  function setViewportHeight(element, binding) {
    if (!binding?.wrapper || binding.isMeasuring) return;
    binding.isMeasuring = true;
    try {
      const viewportHeight = elementHeight(element.querySelector?.("thead"))
        + rowsHeight(bodyRows(element).slice(0, binding.visibleRowCount))
        + elementHeight(element.querySelector?.("tfoot"));
      if (!viewportHeight) return;
      const measuredHeight = Math.ceil(viewportHeight);
      if (binding.viewportHeight === measuredHeight
        && binding.wrapper.dataset?.dashboardTableMeasured === "true") return;
      binding.viewportHeight = measuredHeight;
      const height = `${measuredHeight}px`;
      binding.wrapper.dataset.dashboardTableMeasured = "true";
      binding.wrapper.style?.setProperty("--dashboard-table-viewport-height", height);
      binding.wrapper.style?.setProperty("height", height);
      binding.wrapper.style?.setProperty("max-height", height);
    } finally {
      binding.isMeasuring = false;
    }
  }

  function bindViewportMeasurement(element, wrapper) {
    const existing = viewportBindings.get(element);
    if (existing?.wrapper === wrapper) return;
    if (existing) {
      existing.view?.removeEventListener?.("resize", existing.measure);
      existing.view?.removeEventListener?.("orientationchange", existing.measure);
      existing.observer?.disconnect?.();
      viewportBindings.delete(element);
    }
    if (!wrapper) return;

    const view = element.ownerDocument?.defaultView
      || (typeof window !== "undefined" ? window : globalThis);
    const measure = () => {
      const binding = bindings.get(element);
      if (binding?.wrapper === wrapper) setViewportHeight(element, binding);
    };
    view?.addEventListener?.("resize", measure);
    view?.addEventListener?.("orientationchange", measure);

    const ResizeObserverRef = view?.ResizeObserver || globalThis.ResizeObserver;
    let observer;
    if (typeof ResizeObserverRef === "function") {
      observer = new ResizeObserverRef(() => measure());
      observer.observe(wrapper);
    }
    viewportBindings.set(element, { wrapper, view, measure, observer });
  }

  function bindScroll(element, wrapper) {
    if (!wrapper?.addEventListener || wrapper.dataset.dashboardTableBound === "true") return;
    wrapper.dataset.dashboardTableBound = "true";
    wrapper.addEventListener("scroll", () => {
      const binding = bindings.get(element);
      if (!binding || binding.allRows.length <= binding.windowSize) return;
      const rowStep = binding.visibleRowCount;
      const maxStart = Math.max(0, binding.allRows.length - binding.windowSize);
      const scrollTop = wrapper.scrollTop;
      const atBottom = scrollTop + wrapper.clientHeight >= wrapper.scrollHeight - 1;
      const atTop = scrollTop <= 1;

      if (atBottom && binding.windowStart < maxStart) {
        const step = Math.min(rowStep, maxStart - binding.windowStart);
        const removedHeight = rowsHeight(bodyRows(element).slice(0, step));
        binding.windowStart += step;
        binding.visibleRows = renderBody(element, binding);
        wrapper.scrollTop = Math.max(0, scrollTop - removedHeight);
      } else if (atTop && binding.windowStart > 0) {
        const step = Math.min(rowStep, binding.windowStart);
        binding.windowStart -= step;
        binding.visibleRows = renderBody(element, binding);
        const insertedHeight = rowsHeight(bodyRows(element).slice(0, step));
        wrapper.scrollTop = scrollTop + insertedHeight;
      }
    });
  }

  function render(element, rows, columns, options = {}) {
    if (!element) return null;
    const sourceRows = Array.isArray(rows) ? rows : [];
    const tableColumns = Array.isArray(columns) ? columns : [];
    const escape = options.escapeHtml || escapeHtml;
    const sort = options.sort?.key ? options.sort : null;
    const sortedRows = sort
      ? sortRows(sourceRows, sort.key, sort.direction, sort.accessor)
      : [...sourceRows];
    const wrapper = element.closest?.(".table-wrap");
    const visibleRowCount = Number.isFinite(options.visibleRowCount)
      ? Math.max(1, Math.floor(options.visibleRowCount))
      : 10;
    const renderBuffer = Number.isFinite(options.renderBuffer)
      ? Math.max(0, Math.floor(options.renderBuffer))
      : 20;
    const windowSize = visibleRowCount + renderBuffer;

    if (wrapper) {
      wrapper.dataset.visibleRows = String(visibleRowCount);
      wrapper.style?.setProperty("--dashboard-table-visible-rows", String(visibleRowCount));
    }

    const summaryRows = Array.isArray(options.summaryRows) ? options.summaryRows : sourceRows;
    const previousSummaryRows = Array.isArray(options.previousSummaryRows) ? options.previousSummaryRows : [];
    const summarizeRows = options.summarizeRows || defaultSummary;
    const renderSummaryCell = options.renderSummaryCell || ((column, summary, index, previousSummary) => (
      defaultSummaryCell(column, summary, index, previousSummary, escape)
    ));
    const hasSummaryData = Object.hasOwn(options, "summaryData");
    const hasPreviousSummaryData = Object.hasOwn(options, "previousSummaryData");
    const summaryData = hasSummaryData
      ? options.summaryData
      : (summaryRows.length ? summarizeRows(summaryRows) : null);
    const previousSummaryData = hasPreviousSummaryData
      ? options.previousSummaryData
      : (previousSummaryRows.length ? summarizeRows(previousSummaryRows) : null);
    const summaryCells = summaryData
      ? tableColumns.map((column, index) => renderSummaryCell(column, summaryData, index, previousSummaryData))
      : [];
    const summary = summaryCells.length
      ? `<tfoot><tr>${summaryCells.join("")}</tr></tfoot>`
      : "";
    bindInteractions(element);
    const binding = {
      columns: tableColumns,
      onDimensionClick: options.onDimensionClick,
      rows: sortedRows,
      allRows: sortedRows,
      visibleRows: [],
      windowStart: 0,
      windowSize,
      visibleRowCount,
      escape,
      options,
      summary,
      previousSummary: previousSummaryData,
      renderSummaryCell,
      sort,
      wrapper,
      viewportHeight: 0,
      copyText: toTsv(sortedRows, tableColumns, {
        summaryLine: summaryCells.map((cell) => plainText(cell)).join("\t"),
      }),
    };
    bindings.set(element, binding);
    binding.visibleRows = renderBody(element, binding);
    setViewportHeight(element, binding);
    bindViewportMeasurement(element, wrapper);
    bindScroll(element, wrapper);
    return {
      rows: binding.visibleRows,
      allRows: binding.allRows,
      visibleRows: binding.visibleRows,
      summary: summaryData,
      copyText: binding.copyText,
      sort,
    };
  }

  function copy(element) {
    return bindings.get(element)?.copyText || "";
  }

  return { sortRows, nextSort, toTsv, copy, writeClipboard, render };
});
