(function attachDashboardTable(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardTable = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardTable() {
  const bindings = new WeakMap();

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

  function rowsToTsv(rows, columns) {
    const clean = (value) => String(value ?? "")
      .replace(/\r?\n/g, " ")
      .replace(/\t/g, " ")
      .trim();
    const exportColumns = (columns || []).filter((column) => column.export !== false);
    const lines = [exportColumns.map((column) => clean(column.label)).join("\t")];
    for (const row of rows || []) {
      lines.push(exportColumns.map((column) => {
        const raw = column.exportValue ? column.exportValue(row) : row?.[column.key];
        return clean(raw);
      }).join("\t"));
    }
    return lines.join("\n");
  }

  async function copyText(text, doc) {
    const clipboard = doc?.defaultView?.navigator?.clipboard || globalThis.navigator?.clipboard;
    if (clipboard?.writeText) return clipboard.writeText(text);
    if (!doc?.createElement || !doc?.body || !doc.execCommand) return false;
    const input = doc.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    doc.body.appendChild(input);
    input.select();
    const copied = doc.execCommand("copy");
    input.remove();
    return copied;
  }

  function installCopyButton(element, rows, columns) {
    const panel = element.closest?.(".panel");
    const header = panel?.querySelector?.(":scope > header");
    const doc = element.ownerDocument;
    if (!header || !doc?.createElement) return;
    const tableId = element.id || "dashboard-table";
    let button = header.querySelector?.(`[data-copy-table="${tableId}"]`);
    if (!button) {
      button = doc.createElement("button");
      button.type = "button";
      button.className = "table-copy-button";
      button.dataset.copyTable = tableId;
      button.title = "复制完整表格";
      button.setAttribute("aria-label", "复制完整表格");
      button.textContent = "复制";
      header.appendChild(button);
    }
    button.onclick = async () => {
      const original = button.textContent;
      const copied = await copyText(rowsToTsv(rows, columns), doc);
      button.textContent = copied === false ? "失败" : "已复制";
      setTimeout(() => { button.textContent = original; }, 1200);
    };
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

  function render(element, rows, columns, options = {}) {
    if (!element) return null;
    const sourceRows = Array.isArray(rows) ? rows : [];
    const tableColumns = Array.isArray(columns) ? columns : [];
    const escape = options.escapeHtml || escapeHtml;
    const sort = options.sort?.key ? options.sort : null;
    const sortedRows = sort
      ? sortRows(sourceRows, sort.key, sort.direction, sort.accessor)
      : [...sourceRows];
    const limit = Number.isFinite(options.limit) ? Math.max(0, options.limit) : sortedRows.length;
    const visibleRows = sortedRows.slice(0, limit);
    const wrapper = element.closest?.(".table-wrap");
    const scrollTop = wrapper?.scrollTop;
    const activeElement = element.ownerDocument?.activeElement;
    const focusedSortKey = activeElement && element.contains?.(activeElement)
      ? activeElement.dataset?.tableSortKey
      : "";
    const visibleRowCount = Number.isFinite(options.visibleRowCount)
      ? Math.max(1, Math.floor(options.visibleRowCount))
      : 10;

    if (wrapper) {
      wrapper.dataset.visibleRows = String(visibleRowCount);
      wrapper.style?.setProperty("--dashboard-table-visible-rows", String(visibleRowCount));
    }

    const head = tableColumns.map((column) => {
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
      <tr class="${escape(row?._rowClass || "")}">
        ${tableColumns.map((column) => {
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
            ? ` data-filter-key="${escape(dimensionKey)}" data-filter-value="${escape(raw)}" data-row-index="${rowIndex}" data-column-key="${escape(column.key)}"`
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

    const summaryRows = Array.isArray(options.summaryRows) ? options.summaryRows : sourceRows;
    const previousSummaryRows = Array.isArray(options.previousSummaryRows) ? options.previousSummaryRows : [];
    const summarizeRows = options.summarizeRows || defaultSummary;
    const renderSummaryCell = options.renderSummaryCell || ((column, summary, index, previousSummary) => (
      defaultSummaryCell(column, summary, index, previousSummary, escape)
    ));
    const summaryData = summaryRows.length ? summarizeRows(summaryRows) : null;
    const previousSummaryData = previousSummaryRows.length ? summarizeRows(previousSummaryRows) : null;
    const summary = summaryData
      ? `<tfoot><tr>${tableColumns.map((column, index) => renderSummaryCell(column, summaryData, index, previousSummaryData)).join("")}</tr></tfoot>`
      : "";

    element.innerHTML = `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>${summary}`;
    if (focusedSortKey) {
      const focusedButton = [...element.querySelectorAll("[data-table-sort-key]")]
        .find((button) => button.dataset.tableSortKey === focusedSortKey);
      focusedButton?.focus({ preventScroll: true });
    }
    if (wrapper) wrapper.scrollTop = scrollTop;
    installCopyButton(element, sortedRows, tableColumns);
    bindInteractions(element);
    bindings.set(element, {
      columns: tableColumns,
      onDimensionClick: options.onDimensionClick,
      rows: visibleRows,
      sort,
    });
    return { rows: visibleRows, summary: summaryData, sort };
  }

  return { sortRows, nextSort, rowsToTsv, render };
});
