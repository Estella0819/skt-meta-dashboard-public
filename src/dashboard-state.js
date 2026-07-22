(function attachDashboardState(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardState = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardState() {
  function create(initial = {}) {
    let value = structuredClone(initial);
    const listeners = new Set();

    const getState = () => structuredClone(value);
    const notify = () => listeners.forEach((listener) => listener(getState()));

    return {
      getState,
      setFilter(key, values) {
        value = { ...value, [key]: [...values] };
        notify();
      },
      setSegment(page, segment) {
        value = { ...value, segments: { ...value.segments, [page]: segment } };
        notify();
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    };
  }

  return { create };
});
