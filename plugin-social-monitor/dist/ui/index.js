// src/ui/index.tsx
import { useState, useMemo, useCallback } from "react";
import { usePluginData, usePluginAction, useHostContext, usePluginToast } from "@paperclipai/plugin-sdk/ui";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var PLATFORM_META = {
  twitter: { label: "Twitter/X", color: "#1DA1F2", icon: "\u{1D54F}" },
  instagram: { label: "Instagram", color: "#E4405F", icon: "IG" },
  tiktok: { label: "TikTok", color: "#00F2EA", icon: "TT" },
  reddit: { label: "Reddit", color: "#FF4500", icon: "R" },
  linkedin: { label: "LinkedIn", color: "#0A66C2", icon: "in" }
};
var SENTIMENT_META = {
  positive: { label: "Positivo", color: "#10b981" },
  neutral: { label: "Neutro", color: "#94a3b8" },
  negative: { label: "Negativo", color: "#ef4444" }
};
function timeAgo(ts) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 6e4);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function fmtNum(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function DropdownFilter({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);
  return /* @__PURE__ */ jsxs("div", { className: "relative", children: [
    /* @__PURE__ */ jsxs("button", { onClick: () => setOpen(!open), className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-input text-xs font-medium hover:bg-accent transition-colors", children: [
      selected?.color && /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full", style: { background: selected.color } }),
      /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
        label,
        ":"
      ] }),
      /* @__PURE__ */ jsx("span", { children: selected?.label || "Todos" }),
      /* @__PURE__ */ jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsx("path", { d: "M2 4l3 3 3-3" }) })
    ] }),
    open && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-10", onClick: () => setOpen(false) }),
      /* @__PURE__ */ jsx("div", { className: "absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 min-w-[160px] max-h-[240px] overflow-y-auto p-1", children: options.map((o) => /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => {
            onChange(o.key);
            setOpen(false);
          },
          className: `flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs text-left transition-colors ${value === o.key ? "bg-accent font-semibold" : "hover:bg-accent/50"}`,
          children: [
            o.color && /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full shrink-0", style: { background: o.color } }),
            o.label
          ]
        },
        o.key
      )) })
    ] })
  ] });
}
function MentionCard({ mention }) {
  const pm = PLATFORM_META[mention.platform] || { label: mention.platform, color: "#666", icon: "?" };
  const sm = SENTIMENT_META[mention.sentiment] || SENTIMENT_META.neutral;
  return /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-border bg-card p-4 shadow-sm hover:border-primary/30 transition-colors", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
    /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", style: { background: `${pm.color}22`, color: pm.color }, children: pm.icon }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
        /* @__PURE__ */ jsx("span", { className: "font-semibold text-sm", children: mention.author }),
        /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground", children: mention.authorHandle }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-medium", style: { background: `${pm.color}15`, color: pm.color }, children: pm.label }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded-full font-medium", style: { background: `${sm.color}15`, color: sm.color }, children: sm.label }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground ml-auto", children: timeAgo(mention.timestamp) })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm mt-2 leading-relaxed text-foreground/90", children: mention.text }),
      mention.mediaUrl && /* @__PURE__ */ jsx("div", { className: "mt-2 rounded-lg overflow-hidden border border-border max-w-sm", children: /* @__PURE__ */ jsx("img", { src: mention.mediaUrl, alt: "", className: "w-full h-40 object-cover", loading: "lazy" }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 mt-3 text-[11px] text-muted-foreground", children: [
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsx("path", { d: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" }) }),
          fmtNum(mention.engagement.likes)
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsx("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsx("path", { d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" }) }),
          fmtNum(mention.engagement.comments)
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
            /* @__PURE__ */ jsx("path", { d: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" }),
            /* @__PURE__ */ jsx("polyline", { points: "16 6 12 2 8 6" }),
            /* @__PURE__ */ jsx("line", { x1: "12", y1: "2", x2: "12", y2: "15" })
          ] }),
          fmtNum(mention.engagement.shares)
        ] }),
        /* @__PURE__ */ jsx("span", { className: "ml-auto text-[10px] px-1.5 py-0.5 rounded bg-accent/30 text-foreground/70", children: mention.category || mention.matchedTerm }),
        /* @__PURE__ */ jsx("a", { href: mention.url, target: "_blank", rel: "noopener", className: "text-primary hover:underline", children: "Ver original" })
      ] })
    ] })
  ] }) });
}
function SocialMonitorPage() {
  const ctx = useHostContext();
  const companyId = ctx?.companyId;
  const [platform, setPlatform] = useState("all");
  const [sentiment, setSentiment] = useState("all");
  const [term, setTerm] = useState("all");
  const [showTermEditor, setShowTermEditor] = useState(false);
  const { data: feed, loading, refresh } = usePluginData("feed", { companyId, platform, sentiment, term });
  const { data: terms } = usePluginData("terms", { companyId });
  const { data: stats } = usePluginData("stats", { companyId });
  const updateTerms = usePluginAction("update-terms");
  const toast = usePluginToast();
  const [editTerms, setEditTerms] = useState("");
  const platformOptions = [
    { key: "all", label: "Todas" },
    ...Object.entries(PLATFORM_META).map(([k, v]) => ({ key: k, label: v.label, color: v.color }))
  ];
  const sentimentOptions = [
    { key: "all", label: "Todos" },
    ...Object.entries(SENTIMENT_META).map(([k, v]) => ({ key: k, label: v.label, color: v.color }))
  ];
  const CATEGORY_COLORS = { "Jusbrasil": "#10b981", "Jus IA": "#8b5cf6", "Experience": "#f59e0b" };
  const categories = useMemo(() => {
    if (!stats?.byTerm) return [];
    return Object.keys(stats.byTerm).filter((c) => stats.byTerm[c] > 0);
  }, [stats]);
  const termOptions = useMemo(() => [
    { key: "all", label: "Todas" },
    ...categories.map((c) => ({ key: c, label: c, color: CATEGORY_COLORS[c] }))
  ], [categories]);
  const handleSaveTerms = useCallback(async () => {
    if (!companyId) return;
    const newTerms = editTerms.split("\n").map((t) => t.trim()).filter(Boolean);
    try {
      await updateTerms({ companyId, terms: newTerms });
      toast?.({ title: "Termos atualizados", tone: "success" });
      setShowTermEditor(false);
      refresh();
    } catch (e) {
      toast?.({ title: "Erro", body: e.message, tone: "error" });
    }
  }, [companyId, editTerms, updateTerms, toast, refresh]);
  if (!companyId) return /* @__PURE__ */ jsx("div", { className: "p-8 text-muted-foreground", children: "Selecione uma empresa." });
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full text-foreground overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap bg-card/80 backdrop-blur-sm sticky top-0 z-10", children: [
      /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-muted-foreground shrink-0", children: [
        /* @__PURE__ */ jsx("circle", { cx: "11", cy: "11", r: "8" }),
        /* @__PURE__ */ jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
      ] }),
      /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold mr-2", children: "Social Monitor" }),
      /* @__PURE__ */ jsx("div", { className: "h-4 w-px bg-border hidden sm:block" }),
      /* @__PURE__ */ jsx(DropdownFilter, { label: "Rede", value: platform, options: platformOptions, onChange: setPlatform }),
      /* @__PURE__ */ jsx(DropdownFilter, { label: "Sentimento", value: sentiment, options: sentimentOptions, onChange: setSentiment }),
      /* @__PURE__ */ jsx(DropdownFilter, { label: "Categoria", value: term, options: termOptions, onChange: setTerm }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => {
            setEditTerms((terms || []).join("\n"));
            setShowTermEditor(true);
          },
          className: "ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-input text-muted-foreground hover:bg-accent transition-colors",
          children: [
            /* @__PURE__ */ jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
              /* @__PURE__ */ jsx("path", { d: "M12 20h9" }),
              /* @__PURE__ */ jsx("path", { d: "M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" })
            ] }),
            "Editar termos"
          ]
        }
      ),
      /* @__PURE__ */ jsx("button", { onClick: () => refresh(), className: "p-1.5 rounded-md border border-input text-muted-foreground hover:bg-accent transition-colors", title: "Atualizar", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsx("path", { d: "M21 12a9 9 0 11-6.219-8.56" }),
        /* @__PURE__ */ jsx("polyline", { points: "21 3 21 9 15 9" })
      ] }) })
    ] }),
    stats && /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 border-b border-border flex items-center gap-4 flex-wrap text-[11px] bg-card/50", children: [
      /* @__PURE__ */ jsxs("span", { className: "font-semibold text-foreground", children: [
        stats.total,
        " men\xE7\xF5es"
      ] }),
      /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "|" }),
      Object.entries(stats.byPlatform).map(([p, c]) => /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", style: { color: PLATFORM_META[p]?.color }, children: [
        /* @__PURE__ */ jsx("span", { className: "font-bold", children: PLATFORM_META[p]?.icon }),
        " ",
        c
      ] }, p)),
      /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "|" }),
      /* @__PURE__ */ jsxs("span", { className: "text-green-500", children: [
        stats.bySentiment?.positive || 0,
        " positivos"
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
        stats.bySentiment?.neutral || 0,
        " neutros"
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "text-red-500", children: [
        stats.bySentiment?.negative || 0,
        " negativos"
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground ml-auto", children: [
        "Engajamento total: ",
        fmtNum(stats.totalEngagement)
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsx("div", { className: "max-w-2xl mx-auto p-3 md:p-4 space-y-3", children: loading ? /* @__PURE__ */ jsx("div", { className: "text-center text-muted-foreground text-sm p-8", children: "Carregando men\xE7\xF5es..." }) : !(feed || []).length ? /* @__PURE__ */ jsx("div", { className: "text-center text-muted-foreground text-sm p-12", children: "Nenhuma men\xE7\xE3o encontrada para esses filtros." }) : (feed || []).map((m) => /* @__PURE__ */ jsx(MentionCard, { mention: m }, m.id)) }) }),
    showTermEditor && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4", onClick: () => setShowTermEditor(false), children: /* @__PURE__ */ jsxs("div", { className: "bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-5 space-y-4", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "text-base font-bold", children: "Termos monitorados" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Um termo por linha. O monitor busca men\xE7\xF5es desses termos nas redes sociais." })
      ] }),
      /* @__PURE__ */ jsx(
        "textarea",
        {
          value: editTerms,
          onChange: (e) => setEditTerms(e.target.value),
          rows: 8,
          className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none font-mono"
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 justify-end", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setShowTermEditor(false), className: "px-4 py-2 rounded-md text-sm border border-input text-muted-foreground hover:bg-accent", children: "Cancelar" }),
        /* @__PURE__ */ jsx("button", { onClick: handleSaveTerms, className: "px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90", children: "Salvar termos" })
      ] })
    ] }) })
  ] });
}
function SocialMonitorSidebar({ context }) {
  const prefix = context?.companyPrefix || "";
  const href = prefix ? `/${prefix}/social-monitor` : "/social-monitor";
  const isActive = typeof window !== "undefined" && window.location.pathname.includes("/social-monitor");
  return /* @__PURE__ */ jsxs("a", { href, className: `flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"}`, children: [
    /* @__PURE__ */ jsx("span", { className: "relative shrink-0", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
      /* @__PURE__ */ jsx("circle", { cx: "11", cy: "11", r: "8" }),
      /* @__PURE__ */ jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
    ] }) }),
    "Social Monitor"
  ] });
}
function SocialMonitorWidget() {
  const ctx = useHostContext();
  const { data: stats, loading } = usePluginData("stats", { companyId: ctx?.companyId });
  const { data: feed } = usePluginData("feed", { companyId: ctx?.companyId, platform: "all", sentiment: "all", term: "all" });
  if (loading || !stats) return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "text-sm font-bold", children: "Social Monitor" }),
    /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1", children: "Carregando..." })
  ] });
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
      /* @__PURE__ */ jsx("span", { className: "text-sm font-bold", children: "Social Monitor" }),
      /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
        stats.total,
        " men\xE7\xF5es"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex gap-2 mb-3 flex-wrap", children: Object.entries(stats.byPlatform).map(([p, c]) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]", style: { background: `${PLATFORM_META[p]?.color}15`, color: PLATFORM_META[p]?.color }, children: [
      /* @__PURE__ */ jsx("span", { className: "font-bold", children: PLATFORM_META[p]?.icon }),
      " ",
      c
    ] }, p)) }),
    /* @__PURE__ */ jsx("div", { className: "space-y-1.5", children: (feed || []).slice(0, 3).map((m) => /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-start p-1.5 rounded bg-accent/20 text-[11px]", children: [
      /* @__PURE__ */ jsx("span", { className: "font-bold shrink-0", style: { color: PLATFORM_META[m.platform]?.color }, children: PLATFORM_META[m.platform]?.icon }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: m.author }),
        /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
          " ",
          timeAgo(m.timestamp)
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-muted-foreground truncate", children: m.text.substring(0, 80) })
      ] })
    ] }, m.id)) })
  ] });
}
export {
  SocialMonitorPage,
  SocialMonitorSidebar,
  SocialMonitorWidget
};
//# sourceMappingURL=index.js.map
