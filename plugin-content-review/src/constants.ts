export const PLUGIN_ID = "paperclip-content-review";
export const PLUGIN_VERSION = "0.1.0";
export const PAGE_ROUTE = "content-review";

export const SLOT_IDS = {
  page: "content-review-page",
  sidebar: "content-review-sidebar",
  dashboardWidget: "content-review-dashboard-widget",
  issueTab: "content-review-issue-tab",
  commentAnnotation: "content-review-comment-annotation",
} as const;

export const EXPORT_NAMES = {
  page: "ContentReviewPage",
  sidebar: "ContentReviewSidebar",
  dashboardWidget: "ContentReviewDashboardWidget",
  issueTab: "ContentReviewIssueTab",
  commentAnnotation: "ContentReviewCommentAnnotation",
} as const;

export const REVIEW_STATUSES = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  changesRequested: "changes_requested",
} as const;

export type ReviewStatus = (typeof REVIEW_STATUSES)[keyof typeof REVIEW_STATUSES];

export const EDITORIAS = [
  "Seus Direitos",
  "Consulta Processual",
  "Jus IA",
  "Employer Branding",
  "Institucional",
] as const;

export const KANBAN_COLUMNS = [
  { key: "backlog", label: "Backlog", color: "#6b7280" },
  { key: "todo", label: "A Produzir", color: "#3b82f6" },
  { key: "in_progress", label: "Em Produção", color: "#f59e0b" },
  { key: "in_review", label: "Review", color: "#8b5cf6" },
  { key: "done", label: "Aprovado", color: "#10b981" },
] as const;
