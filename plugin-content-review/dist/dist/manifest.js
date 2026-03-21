import { PLUGIN_ID, PLUGIN_VERSION, PAGE_ROUTE, SLOT_IDS, EXPORT_NAMES, } from "./constants.js";
const manifest = {
    apiVersion: 1,
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    entrypoints: {
        worker: "./dist/worker.js",
        ui: "./dist/ui",
    },
    displayName: "Content Review",
    description: "Painel de agência criativa para visualizar, aprovar e reprovar conteúdo produzido por agentes. Preview visual de cards, comentários integrados com issues do Paperclip.",
    author: "Jusbrasil Creative",
    categories: ["ui", "automation"],
    capabilities: [
        "companies.read",
        "projects.read",
        "issues.read",
        "issues.create",
        "issues.update",
        "issue.comments.read",
        "issue.comments.create",
        "agents.read",
        "goals.read",
        "activity.read",
        "activity.log.write",
        "events.subscribe",
        "plugin.state.read",
        "plugin.state.write",
        "ui.page.register",
        "ui.sidebar.register",
        "ui.dashboardWidget.register",
        "ui.detailTab.register",
        "ui.commentAnnotation.register",
    ],
    ui: {
        slots: [
            {
                type: "page",
                id: SLOT_IDS.page,
                displayName: "Content Review Board",
                exportName: EXPORT_NAMES.page,
                routePath: PAGE_ROUTE,
            },
            {
                type: "sidebar",
                id: SLOT_IDS.sidebar,
                displayName: "Content Review",
                exportName: EXPORT_NAMES.sidebar,
            },
            {
                type: "dashboardWidget",
                id: SLOT_IDS.dashboardWidget,
                displayName: "Content Review Metrics",
                exportName: EXPORT_NAMES.dashboardWidget,
            },
            {
                type: "detailTab",
                id: SLOT_IDS.issueTab,
                displayName: "Preview & Review",
                exportName: EXPORT_NAMES.issueTab,
                entityTypes: ["issue"],
            },
            {
                type: "commentAnnotation",
                id: SLOT_IDS.commentAnnotation,
                displayName: "Review Annotation",
                exportName: EXPORT_NAMES.commentAnnotation,
                entityTypes: ["comment"],
            },
        ],
    },
};
export default manifest;
//# sourceMappingURL=manifest.js.map