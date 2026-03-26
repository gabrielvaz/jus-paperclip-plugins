const manifest = {
    apiVersion: 1,
    id: "paperclip-social-monitor",
    version: "0.1.0",
    entrypoints: { worker: "./dist/worker.js", ui: "./dist/ui" },
    displayName: "Social Monitor",
    description: "Monitoramento de menções da marca nas redes sociais — Twitter, Instagram, TikTok, Reddit. Integração com Apify.",
    author: "Jusbrasil Creative",
    categories: ["ui", "automation"],
    capabilities: [
        "companies.read", "plugin.state.read", "plugin.state.write",
        "activity.log.write", "events.subscribe",
        "ui.page.register", "ui.sidebar.register", "ui.dashboardWidget.register",
    ],
    ui: {
        slots: [
            { type: "page", id: "social-monitor-page", displayName: "Social Monitor", exportName: "SocialMonitorPage", routePath: "social-monitor" },
            { type: "sidebar", id: "social-monitor-sidebar", displayName: "Social Monitor", exportName: "SocialMonitorSidebar" },
            { type: "dashboardWidget", id: "social-monitor-widget", displayName: "Menções Recentes", exportName: "SocialMonitorWidget" },
        ],
    },
};
export default manifest;
//# sourceMappingURL=manifest.js.map