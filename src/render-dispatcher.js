(function attachDashboardRenderDispatcher(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.DashboardRenderDispatcher = api;
})(typeof window !== "undefined" ? window : globalThis, function createDashboardRenderDispatcher() {
  function create() {
    const renderers = new Map();

    return {
      register(view, renderFn) {
        if (!view || typeof renderFn !== "function") {
          throw new TypeError("A view and render function are required");
        }
        renderers.set(view, renderFn);
        return renderFn;
      },
      async render(view, context) {
        const renderFn = renderers.get(view);
        if (!renderFn) throw new Error(`No dashboard renderer registered for "${view}"`);
        return renderFn(context);
      },
    };
  }

  const dispatcher = create();
  return {
    create,
    register: dispatcher.register,
    render: dispatcher.render,
  };
});
