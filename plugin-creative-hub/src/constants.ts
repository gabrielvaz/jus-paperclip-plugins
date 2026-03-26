export const PLUGIN_ID = "paperclip-creative-hub";
export const PLUGIN_VERSION = "0.2.0";

export const SLOT_IDS = {
  timelinePage: "creative-hub-timeline-page",
  galleryPage: "creative-hub-gallery-page",
  calendarPage: "creative-hub-calendar-page",
  metricsPage: "creative-hub-metrics-page",
  timelineSidebar: "creative-hub-timeline-sidebar",
  gallerySidebar: "creative-hub-gallery-sidebar",
  calendarSidebar: "creative-hub-calendar-sidebar",
  metricsSidebar: "creative-hub-metrics-sidebar",
  dashboardWidget: "creative-hub-dashboard-widget",
} as const;

export const EXPORT_NAMES = {
  timelinePage: "TimelinePage",
  galleryPage: "GalleryPage",
  calendarPage: "CalendarPage",
  metricsPage: "MetricsPage",
  timelineSidebar: "TimelineSidebar",
  gallerySidebar: "GallerySidebar",
  calendarSidebar: "CalendarSidebar",
  metricsSidebar: "MetricsSidebar",
  dashboardWidget: "CreativeHubDashboardWidget",
} as const;
