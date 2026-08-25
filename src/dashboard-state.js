(function attachDashboardState(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardState = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardState() {
  const globalUrlFields = [
    ["startDate", "start", ""],
    ["endDate", "end", ""],
    ["compareMode", "compareMode", "lastMonth"],
    ["compareStartDate", "compareStart", ""],
    ["compareEndDate", "compareEnd", ""],
  ];
  const scalarFilterDefaults = {
    countryRegion: "ALL",
    channelMarket: "US",
    material_type: "",
    creative_id: "",
    diagnosis: "",
    stage: "",
    metric: "ctr",
  };

  function cleanValues(values) {
    return (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter((value) => value && value !== "全部");
  }

  function activeFilterKeys(page, allFilterKeys) {
    return Array.isArray(allFilterKeys) && allFilterKeys.length
      ? allFilterKeys
      : (page?.filters || []);
  }

  function serializeUrl(state, page, locationLike = {}, allFilterKeys) {
    const params = new URLSearchParams();
    params.set("view", state.view || "overview");
    globalUrlFields.forEach(([stateKey, param, defaultValue]) => {
      const value = state[stateKey] ?? defaultValue;
      if (value !== "") params.set(param, value);
    });
    if (state.view === "allChannels" && state.allChannelsMode === "sales") {
      params.set("channelMode", "sales");
    }
    activeFilterKeys(page, allFilterKeys).forEach((key) => {
      const value = state[key];
      if (Array.isArray(value)) {
        cleanValues(value).forEach((item) => params.append(key, item));
        return;
      }
      const defaultValue = scalarFilterDefaults[key];
      if (value !== undefined && value !== "" && value !== defaultValue) {
        params.set(key, value);
      }
    });
    const pathname = locationLike.pathname || "";
    const hash = locationLike.hash || "";
    return `${pathname}?${params.toString()}${hash}`;
  }

  function parseUrl(search, getPage, fallbackView = "overview", allFilterKeys) {
    const params = new URLSearchParams(search || "");
    const legacyView = params.get("view");
    const requestedView = ["attribution", "channels"].includes(legacyView) ? "allChannels" : legacyView;
    const requestedPage = requestedView && getPage(requestedView);
    const view = requestedPage ? requestedView : fallbackView;
    const parsed = { view };
    globalUrlFields.forEach(([stateKey, param, defaultValue]) => {
      const value = params.get(param);
      parsed[stateKey] = value === null ? defaultValue : value;
    });
    if (!["previous", "lastMonth", "custom"].includes(parsed.compareMode)) {
      parsed.compareMode = "lastMonth";
    }
    if (view === "allChannels") {
      parsed.allChannelsMode = params.get("channelMode") === "sales" ? "sales" : "attribution";
      if (legacyView === "channels") parsed.allChannelsMode = "sales";
      if (legacyView === "attribution") parsed.allChannelsMode = "attribution";
    }
    if (!requestedPage && requestedView) return parsed;
    const page = requestedPage || getPage(view);
    activeFilterKeys(page, allFilterKeys).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(scalarFilterDefaults, key)) {
        parsed[key] = params.get(key) || scalarFilterDefaults[key];
        return;
      }
      const values = cleanValues(params.getAll(key));
      if (values.length) parsed[key] = values;
    });
    return parsed;
  }

  function normalizeLifecycleFilters(filters = {}, payload = {}) {
    const productValues = Array.isArray(filters.product)
      ? cleanValues(filters.product)
      : cleanValues([filters.product]);
    const validProducts = new Set(
      (payload.products || []).flatMap((item) => [item.product_name, item.product_id]).filter(Boolean),
    );
    const product = productValues.filter((value) => validProducts.has(value));
    const selectedProductNames = new Set(
      (payload.products || [])
        .filter((item) => product.includes(item.product_name) || product.includes(item.product_id))
        .map((item) => item.product_name),
    );

    const requestedMaterialType = String(filters.material_type || "").trim();
    const materialTypeValid = Boolean(requestedMaterialType) && (payload.material_types || []).some(
      (item) => selectedProductNames.has(item.product_name)
        && item.material_type === requestedMaterialType,
    );
    const material_type = materialTypeValid ? requestedMaterialType : "";

    const requestedCreativeId = String(filters.creative_id || "").trim();
    const creativeValid = Boolean(requestedCreativeId && material_type) && (payload.creatives || []).some(
      (item) => item.creative_id === requestedCreativeId
        && selectedProductNames.has(item.product_name)
        && item.material_type === material_type,
    );
    const metric = ["ctr", "cpm", "frequency", "roas"].includes(filters.metric)
      ? filters.metric
      : "ctr";

    return {
      product,
      material_type,
      creative_id: creativeValid ? requestedCreativeId : "",
      diagnosis: String(filters.diagnosis || "").trim(),
      stage: String(filters.stage || "").trim(),
      metric,
    };
  }

  function create(initial = {}) {
    let value = structuredClone(initial);
    const listeners = new Set();

    const getState = () => structuredClone(value);
    const notify = () => listeners.forEach((listener) => listener(getState()));

    return {
      getState,
      get pageFilters() {
        return structuredClone(value.pageFilters || {});
      },
      setFilter(key, values) {
        value = { ...value, [key]: [...values] };
        notify();
      },
      setSegment(page, segment) {
        value = { ...value, segments: { ...value.segments, [page]: segment } };
        notify();
      },
      capture(view, state) {
        if (!view || !state || typeof state !== "object") return;
        value = {
          ...value,
          pageFilters: {
            ...value.pageFilters,
            [view]: structuredClone(state),
          },
        };
        notify();
      },
      restore(view, state = {}) {
        const snapshot = value.pageFilters?.[view];
        if (snapshot) Object.assign(state, structuredClone(snapshot));
        return state;
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  }

  return { create, parseUrl, serializeUrl, normalizeLifecycleFilters };
});
