export declare const PLUGIN_ID = "paperclip-content-review";
export declare const PLUGIN_VERSION = "0.1.0";
export declare const PAGE_ROUTE = "content-review";
export declare const SLOT_IDS: {
    readonly page: "content-review-page";
    readonly sidebar: "content-review-sidebar";
    readonly dashboardWidget: "content-review-dashboard-widget";
    readonly issueTab: "content-review-issue-tab";
    readonly commentAnnotation: "content-review-comment-annotation";
};
export declare const EXPORT_NAMES: {
    readonly page: "ContentReviewPage";
    readonly sidebar: "ContentReviewSidebar";
    readonly dashboardWidget: "ContentReviewDashboardWidget";
    readonly issueTab: "ContentReviewIssueTab";
    readonly commentAnnotation: "ContentReviewCommentAnnotation";
};
export declare const REVIEW_STATUSES: {
    readonly pending: "pending";
    readonly approved: "approved";
    readonly rejected: "rejected";
    readonly changesRequested: "changes_requested";
};
export type ReviewStatus = (typeof REVIEW_STATUSES)[keyof typeof REVIEW_STATUSES];
export declare const EDITORIAS: readonly ["Seus Direitos", "Consulta Processual", "Jus IA", "Employer Branding", "Institucional"];
export declare const KANBAN_COLUMNS: readonly [{
    readonly key: "backlog";
    readonly label: "Backlog";
    readonly color: "#6b7280";
}, {
    readonly key: "todo";
    readonly label: "A Produzir";
    readonly color: "#3b82f6";
}, {
    readonly key: "in_progress";
    readonly label: "Em Produção";
    readonly color: "#f59e0b";
}, {
    readonly key: "in_review";
    readonly label: "Review";
    readonly color: "#8b5cf6";
}, {
    readonly key: "done";
    readonly label: "Aprovado";
    readonly color: "#10b981";
}];
//# sourceMappingURL=constants.d.ts.map