(function attachLifecycleMetricCharts(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardLifecycleMetricCharts = api;
})(typeof window !== "undefined" ? window : globalThis, function createLifecycleMetricCharts() {
  const metricOrder = ["ctr", "cpm", "frequency", "roas"];
  const metricLabels = { ctr: "CTR", cpm: "CPM", frequency: "Frequency", roas: "ROAS" };
  const metricInputs = {
    ctr: { numerator: "c", denominator: "i", multiplier: 1 },
    cpm: { numerator: "s", denominator: "i", multiplier: 1000 },
    frequency: { numerator: "i", denominator: "r", multiplier: 1 },
    roas: { numerator: "v", denominator: "s", multiplier: 1 },
  };

  function finite(value) {
    if (value === null || value === undefined || value === "") return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  }

  function ratio(numerator, denominator, multiplier = 1) {
    const top = finite(numerator);
    const bottom = finite(denominator);
    return top === null || bottom === null || bottom <= 0 ? null : (top * multiplier) / bottom;
  }

  function deriveMetricPoint(raw = {}) {
    return {
      date: String(raw.d || ""),
      ctr: ratio(raw.c, raw.i),
      cpm: ratio(raw.s, raw.i, 1000),
      frequency: ratio(raw.i, raw.r),
      roas: ratio(raw.v, raw.s),
    };
  }

  function safeDomain(values) {
    const present = values.filter((value) => value !== null && Number.isFinite(value));
    if (!present.length) return [0, 1];
    const low = Math.min(...present);
    const high = Math.max(...present);
    if (low !== high) {
      const padding = Math.max((high - low) * 0.08, Number.EPSILON);
      return [Math.max(0, low - padding), high + padding];
    }
    const padding = Math.max(Math.abs(low) * 0.08, 0.01);
    return [Math.max(0, low - padding), high + padding];
  }

  function metricSeries(curve = [], { days = 30 } = {}) {
    const windowDays = [3, 7, 30].includes(Number(days)) ? Number(days) : 30;
    const derived = [...curve]
      .map(deriveMetricPoint)
      .filter((item) => item.date)
      .sort((left, right) => left.date.localeCompare(right.date, "en"))
      .slice(-windowDays);
    const dates = derived.map((item) => item.date);
    const metrics = {};
    metricOrder.forEach((metric) => {
      const points = derived.map((item) => ({ date: item.date, value: item[metric] }));
      metrics[metric] = { key: metric, label: metricLabels[metric], points, yDomain: safeDomain(points.map((item) => item.value)) };
    });
    return { windowDays, dates, metrics, annotations: {} };
  }

  function sharedHoverModel(model, requestedDate) {
    if (!model?.dates?.length) return null;
    let index = typeof requestedDate === "number"
      ? Math.max(0, Math.min(model.dates.length - 1, Math.round(requestedDate)))
      : model.dates.indexOf(requestedDate);
    if (index < 0) index = model.dates.length - 1;
    return {
      index,
      date: model.dates[index],
      values: Object.fromEntries(metricOrder.map((metric) => [metric, model.metrics[metric].points[index].value])),
    };
  }

  function aggregateMetric(points, metric) {
    const input = metricInputs[metric];
    if (!points.length || !input) return null;
    let numerator = 0;
    let denominator = 0;
    for (const point of points) {
      const top = finite(point?.[input.numerator]);
      const bottom = finite(point?.[input.denominator]);
      if (top === null || top < 0 || bottom === null || bottom <= 0) return null;
      numerator += top;
      denominator += bottom;
    }
    return ratio(numerator, denominator, input.multiplier);
  }

  function baselineAnnotations(curve = [], peerCurves = []) {
    const ownPoints = [...curve].slice(0, 3);
    const peerPoints = peerCurves.flat();
    return Object.fromEntries(metricOrder.map((metric) => [metric, [
      {
        semantics: "retained_window_earliest_baseline",
        label: `当前保留窗口内最早 ${ownPoints.length} 个完整观测`,
        value: aggregateMetric(ownPoints, metric),
        lineStyle: "solid",
      },
      {
        semantics: "peer_baseline",
        label: "当前保留窗口内同产品 / 素材类型 peer",
        value: aggregateMetric(peerPoints, metric),
        lineStyle: "dashed",
      },
    ].filter((item) => item.value !== null)]));
  }

  function evidenceAnnotations(evidence = {}, scope = {}) {
    const scopeLabel = [scope.account_id, scope.country, scope.adset_id]
      .map((value) => String(value || "").trim()).filter(Boolean).join(" / ");
    return Object.fromEntries(metricOrder.map((metric) => [metric, [
      {
        semantics: "immutable_early_baseline",
        label: "active day 1–3 固定基线",
        value: finite(evidence.early_baseline?.[metric]),
        lineStyle: "solid",
      },
      {
        semantics: "scope_peer_baseline",
        label: `同 scope peer：${scopeLabel || "scope 未知"}`,
        value: finite(evidence.peer_baseline?.[metric]),
        lineStyle: "dashed",
      },
    ].filter((item) => item.value !== null)]));
  }

  function escapeMarkup(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
    })[character]);
  }

  function formatValue(metric, value) {
    if (value === null || !Number.isFinite(value)) return "—";
    if (metric === "ctr") return `${Math.round(value * 10000) / 100}%`;
    if (metric === "cpm") return `$${value.toFixed(2)}`;
    return value.toFixed(2);
  }

  function accessibleMetricRows(model) {
    if (!model?.dates?.length) return [];
    return model.dates.map((date, index) => ({
      date,
      cells: metricOrder.map((metric) => {
        const value = model.metrics[metric].points[index].value;
        return {
          metric,
          label: metricLabels[metric],
          value,
          accessibleName: `${metricLabels[metric]} ${date} ${formatValue(metric, value)}`,
        };
      }),
    }));
  }

  function keyboardHoverModel(model, currentIndex, key) {
    if (!model?.dates?.length) return null;
    const current = Number.isInteger(currentIndex) ? currentIndex : model.dates.length - 1;
    const next = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: model.dates.length - 1,
    }[key];
    return next === undefined ? null : sharedHoverModel(model, next);
  }

  function coordinates(points, domain, width, height) {
    const left = 16;
    const right = width - 16;
    const top = 16;
    const bottom = height - 24;
    const span = domain[1] - domain[0] || 1;
    return points.map((point, index) => ({
      ...point,
      x: points.length <= 1 ? (left + right) / 2 : left + ((right - left) * index) / (points.length - 1),
      y: point.value === null ? null : bottom - ((point.value - domain[0]) / span) * (bottom - top),
    }));
  }

  function pathFor(points) {
    return points.map((point) => (point.y === null ? null : `${point.x} ${point.y}`)).reduce((path, coordinate, index, all) => {
      if (coordinate === null) return path;
      const previousMissing = index === 0 || all[index - 1] === null;
      return `${path}${path ? " " : ""}${previousMissing ? "M" : "L"} ${coordinate}`;
    }, "");
  }

  function renderMetricChartsSvg(model, { hoverDate } = {}) {
    if (!model?.dates?.length) return '<p class="empty">暂无可用曲线数据。</p>';
    const hover = sharedHoverModel(model, hoverDate);
    const width = 320;
    const height = 150;
    const accessibleRows = accessibleMetricRows(model);
    const charts = metricOrder.map((metric) => {
      const series = model.metrics[metric];
      const annotations = model.annotations?.[metric] || [];
      const domain = safeDomain([
        ...series.points.map((item) => item.value),
        ...annotations.map((item) => item.value),
      ]);
      const plotted = coordinates(series.points, domain, width, height);
      const hoverPoint = plotted[hover.index];
      const baselineLines = annotations.map((item) => {
        const y = coordinates([{ value: item.value }], domain, width, height)[0].y;
        return `<line data-baseline="${item.semantics}" stroke-dasharray="${item.lineStyle === "dashed" ? "6 4" : "none"}" x1="16" x2="304" y1="${y}" y2="${y}"><title>${escapeMarkup(item.label)} ${formatValue(metric, item.value)}</title></line>`;
      }).join("");
      const targets = plotted.map((item, index) => {
        const sharedLabel = accessibleRows[index].cells.map((cell) => cell.accessibleName).join("、");
        const focusAttributes = metric === "ctr"
          ? `tabindex="0" role="button" aria-label="查看 ${sharedLabel}"`
          : 'aria-hidden="true"';
        return `<rect class="lifecycle-hover-target" data-lifecycle-hover-index="${index}" ${focusAttributes} x="${Math.max(0, item.x - 12)}" y="0" width="24" height="150" fill="transparent" />`;
      }).join("");
      return `<figure class="lifecycle-metric-chart" data-metric="${metric}">
        <figcaption><strong>${series.label}</strong><span data-hover-date="${hover.date}">${escapeMarkup(hover.date)} · ${formatValue(metric, hover.values[metric])}</span></figcaption>
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${series.label} 趋势图">
          ${baselineLines}<path class="lifecycle-metric-line" d="${pathFor(plotted)}" />
          <line class="lifecycle-hover-line" x1="${hoverPoint.x}" x2="${hoverPoint.x}" y1="10" y2="126" />${targets}
        </svg>
      </figure>`;
    }).join("");
    const tableRows = accessibleRows.map((row) => `<tr><th scope="row">${escapeMarkup(row.date)}</th>${row.cells.map((cell) => `<td aria-label="${escapeMarkup(cell.accessibleName)}">${escapeMarkup(formatValue(cell.metric, cell.value))}</td>`).join("")}</tr>`).join("");
    return `${charts}<div class="lifecycle-metric-data-wrap"><table class="lifecycle-metric-data" aria-label="曲线逐日数据"><thead><tr><th scope="col">日期</th>${metricOrder.map((metric) => `<th scope="col">${metricLabels[metric]}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table></div>`;
  }

  return {
    deriveMetricPoint,
    metricSeries,
    sharedHoverModel,
    baselineAnnotations,
    evidenceAnnotations,
    renderMetricChartsSvg,
    accessibleMetricRows,
    keyboardHoverModel,
  };
});
