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
  const shardPromises = new Map();
  const loadedPartitions = new Set(["core"]);
  const loadedShards = new Set();
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

  function loadPartitionBase(partition) {
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
        Promise.resolve(mergePartition(partition))
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

  function unpackShardRows(rows, schema) {
    if (!Array.isArray(rows) || !Array.isArray(schema) || !Array.isArray(rows[0])) {
      return rows || [];
    }
    return rows.map((values) => Object.fromEntries(
      schema.map((key, index) => [key, values[index]]),
    ));
  }

  function consumeShard(name) {
    const payload = root.META_DASHBOARD_SHARD_PAYLOADS?.[name];
    if (!payload) throw new Error(`数据分片 ${name} 未注册有效数据`);
    const target = root.META_DASHBOARD_DATA || {};
    target[payload.key] = (target[payload.key] || []).concat(
      unpackShardRows(payload.rows, payload.schema),
    );
    root.META_DASHBOARD_DATA = target;
    delete root.META_DASHBOARD_SHARD_PAYLOADS[name];
    loadedShards.add(name);
    return target;
  }

  function overlapsRange(shard, range) {
    return Boolean(range?.start && range?.end)
      && shard.start <= range.end
      && shard.end >= range.start;
  }

  function relevantShards(partition, ranges = []) {
    const manifest = root.META_DASHBOARD_PARTITION_SHARDS?.[partition] || [];
    if (!ranges.length) return manifest;
    return manifest.filter((shard) => ranges.some((range) => overlapsRange(shard, range)));
  }

  function loadPartition(partition, options = {}) {
    return loadPartitionBase(partition).then(() => {
      const shards = relevantShards(partition, options.ranges)
        .filter((shard) => !loadedShards.has(shard.name));
      return Promise.all(shards.map((shard) => loadShard(partition, shard)))
        .then(() => loadedPayload(partition));
    });
  }

  function loadShard(partition, shard) {
    if (loadedShards.has(shard.name)) return Promise.resolve(loadedPayload(partition));
    if (shardPromises.has(shard.name)) return shardPromises.get(shard.name);
    const promise = loadScript(partitionUrlForName(partition, shard.name))
      .then(() => consumeShard(shard.name));
    shardPromises.set(shard.name, promise);
    const clearPromise = () => {
      if (shardPromises.get(shard.name) === promise) shardPromises.delete(shard.name);
    };
    promise.then(clearPromise, clearPromise);
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
    showState(view, "loading", "正在加载当前页面数据...");
    const partitions = [...new Set([
      ...(Array.isArray(partition) ? partition : [partition]),
      ...(options.additionalPartitions || []),
    ])].filter(Boolean);
    return Promise.all(partitions.map((name) => loadPartition(name, options)))
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
