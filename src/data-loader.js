(function attachDashboardDataLoader(root) {
  const viewPartitions = {
    overview: "core",
    product: "core",
    country: "core",
    creative: "creative",
    landing: "creative",
    allChannels: ["attribution", "channels"],
  };
  const partitionFiles = {
    creative: "dashboard-creative-data.js",
    channels: "dashboard-channel-data.js",
    attribution: "dashboard-attribution-data.js",
  };
  const partitionPromises = new Map();
  const loadedPartitions = new Set(["core"]);
  const loaderScriptUrl = root.document?.currentScript?.src || "";

  function partitionUrl(partition) {
    const filename = partitionFiles[partition];
    if (loaderScriptUrl) {
      const assetUrl = new URL(`../data/${filename}`, loaderScriptUrl);
      const releaseKey = new URL(loaderScriptUrl).searchParams.get("v");
      if (releaseKey) assetUrl.searchParams.set("v", releaseKey);
      return assetUrl.href;
    }
    return `./data/${filename}`;
  }

  function dataState(view) {
    return root.document?.getElementById(`${view}View`)?.querySelector?.(".page-data-state");
  }

  function showState(view, kind, message) {
    const section = root.document?.getElementById(`${view}View`);
    if (!section) return;
    dataState(view)?.remove();
    const status = root.document.createElement("div");
    status.className = `page-data-state ${kind}`;
    status.setAttribute("role", kind === "error" ? "alert" : "status");
    status.textContent = message;
    section.prepend(status);
  }

  function clearState(view) {
    dataState(view)?.remove();
  }

  function partitionForView(view) {
    return viewPartitions[view] || "core";
  }

  function loadedPayload(partition) {
    return root.META_DASHBOARD_DATA;
  }

  function mergePartition(partition) {
    const payload = root.META_DASHBOARD_PARTITIONS?.[partition];
    if (!payload) {
      throw new Error(`数据分包 ${partition} 已加载，但未注册有效数据`);
    }
    const chunks = root.META_DASHBOARD_PARTITION_CHUNKS?.[partition] || {};
    Object.entries(chunks).forEach(([key, rows]) => {
      payload[key] = rows;
    });
    const normalized = typeof root.normalizeDashboardData === "function"
      ? root.normalizeDashboardData(payload)
      : payload;
    const target = root.META_DASHBOARD_DATA || {};
    const schemas = {
      ...(target._schemas || {}),
      ...(normalized._schemas || {}),
    };
    Object.keys(normalized).forEach((key) => {
      if (key !== "_schemas") target[key] = normalized[key];
    });
    target._schemas = schemas;
    root.META_DASHBOARD_DATA = target;
    delete root.META_DASHBOARD_PARTITIONS[partition];
    loadedPartitions.add(partition);
    return target;
  }

  function loadPartition(partition) {
    if (loadedPartitions.has(partition)) {
      return Promise.resolve(loadedPayload(partition));
    }
    if (partitionPromises.has(partition)) return partitionPromises.get(partition);

    let script;
    const promise = new Promise((resolve, reject) => {
      script = root.document.createElement("script");
      script.async = true;
      script.src = partitionUrl(partition);
      script.onload = () => {
        const shardNames = root.META_DASHBOARD_PARTITION_SHARDS?.[partition] || [];
        Promise.all(shardNames.map((name) => loadScript(partitionUrlForName(partition, name))))
          .then(() => mergePartition(partition))
          .then(resolve)
          .catch(reject);
      };
      script.onerror = () => reject(
        new Error(`无法加载页面数据：${partitionFiles[partition]}`)
      );
      root.document.head.appendChild(script);
    });
    partitionPromises.set(partition, promise);
    promise.catch(() => {
      if (partitionPromises.get(partition) === promise) {
        partitionPromises.delete(partition);
      }
      script?.remove?.();
    });
    return promise;
  }

  function partitionUrlForName(partition, filename) {
    if (loaderScriptUrl) {
      const assetUrl = new URL(`../data/${filename}`, loaderScriptUrl);
      const releaseKey = new URL(loaderScriptUrl).searchParams.get("v");
      if (releaseKey) assetUrl.searchParams.set("v", releaseKey);
      return assetUrl.href;
    }
    return `./data/${filename}`;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = root.document.createElement("script");
      script.async = true;
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`无法加载页面数据分片：${url}`));
      root.document.head.appendChild(script);
    });
  }

  function ensure(view, options = {}) {
    const partition = partitionForView(view);
    const requestedPartitions = [...new Set([
      ...(Array.isArray(partition) ? partition : [partition]),
      ...(options.additionalPartitions || []),
    ])].filter((item) => item && item !== "core");
    if (!requestedPartitions.length) return Promise.resolve(root.META_DASHBOARD_DATA);
    showState(view, "loading", "正在加载当前页面数据...");
    return Promise.all(requestedPartitions.map(loadPartition))
      .then((payloads) => {
        clearState(view);
        return root.META_DASHBOARD_DATA;
      })
      .catch((error) => {
        showState(view, "error", error?.message || "当前页面数据加载失败");
        throw error;
      });
  }

  root.DashboardDataLoader = {
    ensure,
    partitionForView,
  };
})(typeof window !== "undefined" ? window : globalThis);
