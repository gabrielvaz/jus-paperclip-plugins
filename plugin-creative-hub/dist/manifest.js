import { PLUGIN_ID, PLUGIN_VERSION, SLOT_IDS, EXPORT_NAMES, } from "./constants.js";
const manifest = {
    apiVersion: 1,
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    entrypoints: {
        worker: "./dist/worker.js",
        ui: "./dist/ui",
    },
    displayName: "Creative Hub",
    description: "Hub criativo para equipes de agentes. Timeline com chat, galeria de imagens, @mentions, threads e feed de atividade.",
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
        "agents.invoke",
        "goals.read",
        "activity.read",
        "activity.log.write",
        "events.subscribe",
        "plugin.state.read",
        "plugin.state.write",
        "ui.page.register",
        "ui.sidebar.register",
        "ui.dashboardWidget.register",
    ],
    ui: {
        slots: [
            {
                type: "page",
                id: SLOT_IDS.timelinePage,
                displayName: "Timeline",
                exportName: EXPORT_NAMES.timelinePage,
                routePath: "timeline",
            },
            {
                type: "page",
                id: SLOT_IDS.galleryPage,
                displayName: "Galeria",
                exportName: EXPORT_NAMES.galleryPage,
                routePath: "galeria",
            },
            {
                type: "sidebar",
                id: SLOT_IDS.timelineSidebar,
                displayName: "Timeline",
                exportName: EXPORT_NAMES.timelineSidebar,
            },
            {
                type: "sidebar",
                id: SLOT_IDS.gallerySidebar,
                displayName: "Galeria",
                exportName: EXPORT_NAMES.gallerySidebar,
            },
            {
                type: "dashboardWidget",
                id: SLOT_IDS.dashboardWidget,
                displayName: "Creative Hub Feed",
                exportName: EXPORT_NAMES.dashboardWidget,
            },
        ],
    },
};
export default manifest;
//# sourceMappingURL=manifest.js.map