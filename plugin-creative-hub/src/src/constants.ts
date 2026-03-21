export const PLUGIN_ID = "paperclip-creative-hub";
export const PLUGIN_VERSION = "0.1.0";

export const SLOT_IDS = {
  timelinePage: "creative-hub-timeline-page",
  galleryPage: "creative-hub-gallery-page",
  timelineSidebar: "creative-hub-timeline-sidebar",
  gallerySidebar: "creative-hub-gallery-sidebar",
  dashboardWidget: "creative-hub-dashboard-widget",
} as const;

export const EXPORT_NAMES = {
  timelinePage: "TimelinePage",
  galleryPage: "GalleryPage",
  timelineSidebar: "TimelineSidebar",
  gallerySidebar: "GallerySidebar",
  dashboardWidget: "CreativeHubDashboardWidget",
} as const;

export const STREAM_CHANNELS = {
  timeline: "hub-timeline",
} as const;
