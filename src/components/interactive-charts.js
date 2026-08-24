const DashboardCharts = ((DashboardMetricsApi) => {
  const DEFAULT_LIMIT = 8;
  const PALETTE = ["#2563eb", "#0f766e", "#d97706", "#be123c", "#7c3aed", "#0891b2", "#4d7c0f", "#b45309", "#475569"];
  const EMPTY_STATE_TEXT = "当前筛选下暂无数据";
  const EMPTY_SELECTION_TEXT = "请选择至少一个系列";

  const number = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const ratio = (numerator, denominator) => (denominator ? numerator / denominator : 0);

  const sortByGmv = (left, right) => (
    right.purchase_value - left.purchase_value
    || String(left.name).localeCompare(String(right.name), "zh-CN")
  );

  const optionsWithDefaults = (options = {}) => ({
    dateKey: "date_start",
    categoryKey: "name",
    valueKey: "purchase_value",
    spendKey: "spend",
    conversionKey: "purchase_times",
    limit: DEFAULT_LIMIT,
    ...options,
  });

  const normalizeRows = (rows, options) => rows.map((row) => ({
    ...row,
    [options.dateKey]: row[options.dateKey] ?? "Unknown",
    [options.categoryKey]: row[options.categoryKey] ?? "Unknown",
    purchase_value: number(row[options.valueKey]),
    spend: number(row[options.spendKey]),
    purchase_times: number(row[options.conversionKey]),
  }));

  const explicitSelection = (options, categories) => {
    if (!Object.prototype.hasOwnProperty.call(options, "selected")) return null;
    const available = new Set(categories);
    return [...new Set(options.selected || [])].filter((name) => available.has(name));
  };

  const limitOf = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : DEFAULT_LIMIT;
  };

  const buildSeriesModel = (rows = [], inputOptions = {}) => {
    const options = optionsWithDefaults(inputOptions);
    const normalized = normalizeRows(rows, options);
    const dateGroups = DashboardMetricsApi.groupRows(normalized, [options.dateKey]);
    const categoryGroups = DashboardMetricsApi.groupRows(normalized, [options.categoryKey])
      .map((group) => ({ ...group, name: group[options.categoryKey] }))
      .sort(sortByGmv);
    const categories = categoryGroups.map((group) => group.name);
    const dates = dateGroups.map((group) => group[options.dateKey])
      .sort((left, right) => String(left).localeCompare(String(right)));
    const dailyTotalsByDate = new Map(dateGroups.map((group) => [
      group[options.dateKey],
      group.purchase_value,
    ]));
    const groupedPoints = new Map(
      DashboardMetricsApi.groupRows(normalized, [options.dateKey, options.categoryKey])
        .map((group) => [`${group[options.dateKey]}||${group[options.categoryKey]}`, group]),
    );
    const requestedSelection = explicitSelection(inputOptions, categories);
    const requestedNames = inputOptions.selected;
    const hasStaleSelection = requestedSelection
      && Array.isArray(requestedNames)
      && requestedNames.length > 0
      && requestedSelection.length === 0;
    const hasGmvData = categoryGroups.some((group) => number(group.purchase_value) > 0);
    const selected = requestedSelection === null
      ? categories.slice(0, limitOf(options.limit))
      : hasStaleSelection && hasGmvData
        ? categories.slice(0, limitOf(options.limit))
        : requestedSelection;
    const series = categories.map((name) => ({
      name,
      points: dates.map((date) => {
        const point = groupedPoints.get(`${date}||${name}`);
        const gmv = point?.purchase_value || 0;
        return {
          date,
          gmv,
          spend: point?.spend || 0,
          conversions: point?.purchase_times || 0,
          share: ratio(gmv, dailyTotalsByDate.get(date) || 0),
        };
      }),
    }));

    return {
      categories,
      selected,
      dates,
      series,
      dailyTotals: dates.map((date) => ({ date, gmv: dailyTotalsByDate.get(date) || 0 })),
    };
  };

  const buildDonutModel = (rows = [], inputOptions = {}) => {
    const options = optionsWithDefaults(inputOptions);
    const groups = DashboardMetricsApi.groupRows(normalizeRows(rows, options), [options.categoryKey])
      .map((group) => ({
        name: group[options.categoryKey],
        gmv: group.purchase_value,
        spend: group.spend,
        conversions: group.purchase_times,
      }))
      .sort((left, right) => right.gmv - left.gmv || String(left.name).localeCompare(String(right.name), "zh-CN"));
    const totalGmv = groups.reduce((total, group) => total + group.gmv, 0);
    const limit = limitOf(options.limit);
    const leading = groups.slice(0, limit);
    const remainder = groups.slice(limit).reduce((total, group) => ({
      gmv: total.gmv + group.gmv,
      spend: total.spend + group.spend,
      conversions: total.conversions + group.conversions,
    }), { gmv: 0, spend: 0, conversions: 0 });
    const slices = remainder.gmv || remainder.spend || remainder.conversions
      ? [...leading, { name: "其他", ...remainder }]
      : leading;

    return {
      totalGmv,
      slices: slices.map((slice) => ({
        ...slice,
        share: ratio(slice.gmv, totalGmv),
        roas: ratio(slice.gmv, slice.spend),
      })),
    };
  };

  const createSvg = (name, attributes = {}) => {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  };

  const smoothPath = (points) => {
    if (!points.length) return "";
    return points.slice(1).reduce((path, point, index) => {
      const previous = points[index];
      const controlOffset = (point.x - previous.x) * 0.42;
      return `${path} C${previous.x + controlOffset} ${previous.y},${point.x - controlOffset} ${point.y},${point.x} ${point.y}`;
    }, `M${points[0].x} ${points[0].y}`);
  };

  const formatMoney = (value) => new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);

  const formatPercent = (value) => `${((value || 0) * 100).toFixed(1)}%`;

  const renderEmptyState = (element) => {
    const empty = document.createElement("div");
    empty.className = "interactive-chart-empty";
    empty.setAttribute("role", "status");
    empty.setAttribute("aria-live", "polite");
    empty.textContent = EMPTY_STATE_TEXT;
    element.append(empty);
  };

  const hasDonutData = (model) => number(model?.totalGmv) > 0
    && (model?.slices || []).some((slice) => number(slice.gmv) > 0);

  const createTooltip = (element) => {
    const tooltip = document.createElement("div");
    tooltip.className = "interactive-chart-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.setAttribute("aria-live", "polite");
    element.append(tooltip);
    return tooltip;
  };

  const showTooltip = (tooltip, anchor, lines) => {
    tooltip.replaceChildren(...lines.map((line) => {
      const row = document.createElement("div");
      row.textContent = line;
      return row;
    }));
    const bounds = anchor.getBoundingClientRect();
    const parentBounds = tooltip.parentElement.getBoundingClientRect();
    tooltip.classList.add("is-visible");
    const tooltipBounds = tooltip.getBoundingClientRect();
    const parentWidth = parentBounds.width || Math.max(0, parentBounds.right - parentBounds.left);
    const parentHeight = parentBounds.height || Math.max(0, parentBounds.bottom - parentBounds.top);
    const padding = 8;
    const gap = 8;
    const maxLeft = Math.max(padding, parentWidth - tooltipBounds.width - padding);
    const centeredLeft = bounds.left - parentBounds.left + (bounds.width / 2) - (tooltipBounds.width / 2);
    const topAbove = bounds.top - parentBounds.top - tooltipBounds.height - gap;
    const topBelow = bounds.bottom - parentBounds.top + gap;
    const maxTop = Math.max(padding, parentHeight - tooltipBounds.height - padding);
    const top = topAbove >= padding ? topAbove : topBelow;
    tooltip.style.left = `${Math.min(Math.max(padding, centeredLeft), maxLeft)}px`;
    tooltip.style.top = `${Math.min(Math.max(padding, top), maxTop)}px`;
  };

  const hideTooltip = (tooltip) => tooltip.classList.remove("is-visible");

  const renderSeriesChart = (element, model, options = {}) => {
    element.replaceChildren();
    element.classList.add("interactive-series-chart");
    if (!(model?.categories || []).length) {
      renderEmptyState(element);
      return;
    }
    const controls = document.createElement("div");
    controls.className = "interactive-chart-controls";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "interactive-chart-series-trigger";
    trigger.setAttribute("aria-expanded", "false");
    const panel = document.createElement("div");
    panel.className = "interactive-chart-series-panel";
    panel.hidden = true;
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "搜索系列";
    search.setAttribute("aria-label", "搜索趋势系列");
    panel.append(search);
    const actions = document.createElement("div");
    actions.className = "interactive-chart-series-actions";
    const selectAll = document.createElement("button");
    selectAll.type = "button";
    selectAll.textContent = "全选";
    const clearAll = document.createElement("button");
    clearAll.type = "button";
    clearAll.textContent = "清空";
    actions.append(selectAll, clearAll);
    panel.append(actions);
    const legend = document.createElement("div");
    legend.className = "interactive-chart-legend";
    legend.setAttribute("aria-label", "趋势系列");
    panel.append(legend);
    controls.append(trigger, panel);
    element.append(controls);

    const width = Math.max(320, Math.round(number(element.getBoundingClientRect().width)));
    const height = 330;
    const padding = { top: 18, right: 24, bottom: 40, left: 62 };
    const svg = createSvg("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": options.ariaLabel || "按系列的 GMV 日趋势",
    });
    const plot = createSvg("g");
    svg.append(plot);
    element.append(svg);
    const tooltip = createTooltip(element);
    const seriesByName = new Map(model.series.map((series) => [series.name, series]));
    const visible = new Set(model.selected);
    const refreshTrigger = () => {
      trigger.textContent = `趋势系列 ${visible.size}`;
    };

    const updatePlot = () => {
      plot.replaceChildren();
      const displayed = model.categories.filter((name) => visible.has(name));
      const values = displayed.flatMap((name) => seriesByName.get(name)?.points || []).map((point) => point.gmv);
      const maximum = Math.max(1, ...values);
      const plotWidth = width - padding.left - padding.right;
      const plotHeight = height - padding.top - padding.bottom;
      const x = (index) => padding.left + (model.dates.length < 2 ? plotWidth / 2 : (index / (model.dates.length - 1)) * plotWidth);
      const y = (value) => padding.top + plotHeight - ((value / maximum) * plotHeight);

      [0, 0.25, 0.5, 0.75, 1].forEach((step) => {
        const guideY = padding.top + plotHeight - (plotHeight * step);
        plot.append(createSvg("line", { x1: padding.left, y1: guideY, x2: width - padding.right, y2: guideY, class: "interactive-chart-guide" }));
        const label = createSvg("text", { x: padding.left - 8, y: guideY + 4, "text-anchor": "end", class: "interactive-chart-axis-label" });
        label.textContent = formatMoney(maximum * step);
        plot.append(label);
      });

      if (displayed.length === 0) {
        const message = createSvg("text", {
          x: width / 2,
          y: padding.top + (plotHeight / 2),
          "text-anchor": "middle",
          class: "interactive-chart-selection-empty",
        });
        message.textContent = EMPTY_SELECTION_TEXT;
        plot.append(message);
      }

      displayed.forEach((name) => {
        const series = seriesByName.get(name);
        const color = PALETTE[model.categories.indexOf(name) % PALETTE.length];
        const points = series.points.map((point, index) => ({ x: x(index), y: y(point.gmv) }));
        const path = createSvg("path", {
          d: smoothPath(points),
          class: "interactive-series-line",
          stroke: color,
        });
        plot.append(path);
        series.points.forEach((point, index) => {
          const hit = createSvg("circle", {
            cx: x(index), cy: y(point.gmv), r: 11, fill: "transparent", class: "interactive-chart-hit", tabindex: "0",
            role: "button", "aria-label": `${name}，${point.date}，GMV ${formatMoney(point.gmv)}，日占比 ${formatPercent(point.share)}`,
          });
          const show = () => showTooltip(tooltip, hit, [point.date, name, `GMV ${formatMoney(point.gmv)}`, `日占比 ${formatPercent(point.share)}`]);
          hit.addEventListener("pointerenter", show);
          hit.addEventListener("focus", show);
          hit.addEventListener("pointerleave", () => hideTooltip(tooltip));
          hit.addEventListener("blur", () => hideTooltip(tooltip));
          plot.append(hit);
          plot.append(createSvg("circle", { cx: x(index), cy: y(point.gmv), r: 3, fill: color, class: "interactive-series-dot" }));
        });
      });

      const maxDateTicks = Math.max(2, Math.floor(plotWidth / 72));
      const dateTickStep = Math.max(1, Math.ceil(Math.max(model.dates.length - 1, 1) / Math.max(maxDateTicks - 1, 1)));
      model.dates.forEach((date, index) => {
        if (index !== 0 && index !== model.dates.length - 1 && index % dateTickStep !== 0) return;
        const label = createSvg("text", { x: x(index), y: height - 10, "text-anchor": "middle", class: "interactive-chart-axis-label" });
        label.textContent = String(date).slice(5);
        plot.append(label);
      });
    };

    model.categories.forEach((name, index) => {
      const label = document.createElement("label");
      label.className = "interactive-chart-legend-item";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = visible.has(name);
      checkbox.setAttribute("aria-label", `显示 ${name}`);
      const swatch = document.createElement("i");
      swatch.style.backgroundColor = PALETTE[index % PALETTE.length];
      const text = document.createElement("span");
      text.textContent = name;
      checkbox.addEventListener("change", () => {
        checkbox.checked ? visible.add(name) : visible.delete(name);
        hideTooltip(tooltip);
        updatePlot();
        refreshTrigger();
        options.onSelectionChange?.([...visible]);
      });
      label.append(checkbox, swatch, text);
      legend.append(label);
    });
    search.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase("zh-CN");
      legend.querySelectorAll("label").forEach((label) => {
        label.hidden = query && !label.textContent.toLocaleLowerCase("zh-CN").includes(query);
      });
    });
    trigger.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      trigger.setAttribute("aria-expanded", String(!panel.hidden));
    });
    selectAll.addEventListener("click", () => {
      visible.clear();
      model.categories.forEach((name) => visible.add(name));
      legend.querySelectorAll("input").forEach((checkbox) => {
        checkbox.checked = true;
      });
      hideTooltip(tooltip);
      updatePlot();
      refreshTrigger();
      options.onSelectionChange?.([...visible]);
    });
    clearAll.addEventListener("click", () => {
      visible.clear();
      legend.querySelectorAll("input").forEach((checkbox) => {
        checkbox.checked = false;
      });
      hideTooltip(tooltip);
      updatePlot();
      refreshTrigger();
      options.onSelectionChange?.([]);
    });
    refreshTrigger();
    updatePlot();
  };

  const polarPoint = (center, radius, angle) => ({
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  });

  const ringPath = (center, outerRadius, innerRadius, start, end) => {
    if (end - start >= (Math.PI * 2) - 0.0001) {
      return `M ${center} ${center - outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 ${center - 0.01} ${center - outerRadius} A ${outerRadius} ${outerRadius} 0 1 1 ${center} ${center - outerRadius} M ${center} ${center - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${center - 0.01} ${center - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${center} ${center - innerRadius} Z`;
    }
    const outerStart = polarPoint(center, outerRadius, start);
    const outerEnd = polarPoint(center, outerRadius, end);
    const innerEnd = polarPoint(center, innerRadius, end);
    const innerStart = polarPoint(center, innerRadius, start);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`;
  };

  const renderDonut = (element, model, options = {}) => {
    element.replaceChildren();
    element.classList.add("interactive-donut-chart");
    if (!hasDonutData(model)) {
      renderEmptyState(element);
      return;
    }
    const svg = createSvg("svg", {
      viewBox: "0 0 260 260",
      role: "img",
      "aria-label": options.ariaLabel || "GMV 系列结构",
    });
    const body = document.createElement("div");
    body.className = "interactive-donut-body";
    const visual = document.createElement("div");
    visual.className = "interactive-donut-visual";
    const legend = document.createElement("div");
    legend.className = "interactive-donut-legend";
    const center = 130;
    let angle = -Math.PI / 2;
    model.slices.forEach((slice, index) => {
      const nextAngle = angle + (Math.PI * 2 * slice.share);
      const arc = createSvg("path", {
        d: ringPath(center, 108, 70, angle, nextAngle),
        fill: PALETTE[index % PALETTE.length],
        class: "interactive-donut-slice",
        tabindex: "0",
        role: "button",
        "aria-label": `${slice.name}，GMV ${formatMoney(slice.gmv)}，占比 ${formatPercent(slice.share)}`,
      });
      angle = nextAngle;
      svg.append(arc);
      const tooltip = () => showTooltip(tooltipElement, arc, [
        slice.name,
        `GMV ${formatMoney(slice.gmv)}`,
        `占比 ${formatPercent(slice.share)}`,
        `花费 ${formatMoney(slice.spend)}`,
        `ROAS ${slice.roas.toFixed(2)}`,
        `转化 ${slice.conversions.toLocaleString("zh-CN")}`,
      ]);
      arc.addEventListener("pointerenter", tooltip);
      arc.addEventListener("focus", tooltip);
      arc.addEventListener("pointerleave", () => hideTooltip(tooltipElement));
      arc.addEventListener("blur", () => hideTooltip(tooltipElement));
      const legendItem = document.createElement("div");
      legendItem.className = "interactive-donut-legend-item";
      const swatch = document.createElement("i");
      swatch.style.backgroundColor = PALETTE[index % PALETTE.length];
      const name = document.createElement("span");
      name.textContent = slice.name;
      const share = document.createElement("strong");
      share.textContent = formatPercent(slice.share);
      legendItem.append(swatch, name, share);
      legend.append(legendItem);
    });
    const total = createSvg("text", { x: center, y: center - 4, "text-anchor": "middle", class: "interactive-donut-total" });
    total.textContent = "GMV";
    svg.append(total);
    const amount = createSvg("text", { x: center, y: center + 22, "text-anchor": "middle", class: "interactive-donut-amount" });
    amount.textContent = formatMoney(model.totalGmv);
    svg.append(amount);
    visual.append(svg);
    body.append(visual, legend);
    element.append(body);
    const tooltipElement = createTooltip(element);
  };

  return { buildSeriesModel, buildDonutModel, renderSeriesChart, renderDonut };
})(typeof DashboardMetrics !== "undefined" ? DashboardMetrics : require("../dashboard-metrics.js"));

if (typeof module !== "undefined" && module.exports) {
  module.exports = DashboardCharts;
}
