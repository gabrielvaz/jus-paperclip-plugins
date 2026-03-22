// src/ui/index.tsx
import { useState, useMemo, useCallback } from "react";
import { usePluginData, usePluginAction, useHostContext, usePluginToast } from "@paperclipai/plugin-sdk/ui";
import { jsx, jsxs } from "react/jsx-runtime";
var TAG_COLORS = { "Seus Direitos": "#10b981", "Consulta Processual": "#3b82f6", "Jus IA": "#8b5cf6", "Employer Branding": "#f59e0b", "Institucional": "#ec4899" };
function tc(tag) {
  return TAG_COLORS[tag || ""] || "hsl(var(--muted-foreground))";
}
function fmtDate(s) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
function reviewBadge(status) {
  switch (status) {
    case "approved":
      return ["Aprovado", "text-green-500 bg-green-500/10"];
    case "rejected":
      return ["Reprovado", "text-red-500 bg-red-500/10"];
    case "changes_requested":
      return ["Altera\xE7\xF5es", "text-yellow-500 bg-yellow-500/10"];
    default:
      return ["Pendente", "text-muted-foreground bg-muted/50"];
  }
}
function Tag({ label }) {
  const c = tc(label);
  return /* @__PURE__ */ jsx("span", { className: "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border", style: { color: c, borderColor: `${c}44`, background: `${c}12` }, children: label });
}
function RadarChart({ score }) {
  const dims = ["brand", "clarity", "hook", "accuracy", "actionability"];
  const labels = ["Brand", "Clareza", "Gancho", "Precis\xE3o", "A\xE7\xE3o"];
  const cx = 100, cy = 100, r = 70, step = 2 * Math.PI / 5;
  const pts = dims.map((d, i) => {
    const a = i * step - Math.PI / 2;
    const v = (score[d] || 0) / 10;
    return { x: cx + r * v * Math.cos(a), y: cy + r * v * Math.sin(a) };
  });
  return /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 200 200", className: "w-full max-w-[200px] mx-auto", children: [
    [0.25, 0.5, 0.75, 1].map((l) => /* @__PURE__ */ jsx("polygon", { points: dims.map((_, i) => {
      const a = i * step - Math.PI / 2;
      return `${cx + r * l * Math.cos(a)},${cy + r * l * Math.sin(a)}`;
    }).join(" "), fill: "none", stroke: "hsl(var(--border))", strokeWidth: "0.5" }, l)),
    dims.map((_, i) => {
      const a = i * step - Math.PI / 2;
      return /* @__PURE__ */ jsx("line", { x1: cx, y1: cy, x2: cx + r * Math.cos(a), y2: cy + r * Math.sin(a), stroke: "hsl(var(--border))", strokeWidth: "0.5" }, i);
    }),
    /* @__PURE__ */ jsx("polygon", { points: pts.map((p) => `${p.x},${p.y}`).join(" "), fill: "hsl(var(--primary) / 0.2)", stroke: "hsl(var(--primary))", strokeWidth: "2" }),
    pts.map((p, i) => /* @__PURE__ */ jsx("circle", { cx: p.x, cy: p.y, r: "3", fill: "hsl(var(--primary))" }, i)),
    dims.map((d, i) => {
      const a = i * step - Math.PI / 2;
      return /* @__PURE__ */ jsxs("text", { x: cx + (r + 16) * Math.cos(a), y: cy + (r + 16) * Math.sin(a), textAnchor: "middle", dominantBaseline: "middle", fill: "hsl(var(--muted-foreground))", fontSize: "8", children: [
        labels[i],
        " (",
        (score[d] || 0).toFixed(1),
        ")"
      ] }, i);
    }),
    /* @__PURE__ */ jsx("text", { x: cx, y: cy, textAnchor: "middle", dominantBaseline: "middle", fill: "hsl(var(--primary))", fontSize: "16", fontWeight: "bold", children: score.average.toFixed(1) })
  ] });
}
function ContentReviewPage() {
  const ctx = useHostContext();
  const companyId = ctx?.companyId;
  const { data: issues, loading, refresh } = usePluginData("board-issues", { companyId });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const columns = [
    { key: "backlog", label: "Backlog", cls: "text-muted-foreground" },
    { key: "todo", label: "A Produzir", cls: "text-blue-400" },
    { key: "in_progress", label: "Em Produ\xE7\xE3o", cls: "text-yellow-400" },
    { key: "in_review", label: "Review", cls: "text-purple-400" },
    { key: "done", label: "Aprovado", cls: "text-green-400" }
  ];
  const filtered = useMemo(() => {
    if (!issues) return [];
    return issues.filter((i) => {
      if (filter !== "all" && i.editoria !== filter) return false;
      if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [issues, filter, search]);
  const editorias = useMemo(() => issues ? Array.from(new Set(issues.map((i) => i.editoria).filter(Boolean))) : [], [issues]);
  if (!companyId) return /* @__PURE__ */ jsx("div", { className: "p-8 text-muted-foreground", children: "Selecione uma empresa." });
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full min-h-screen", children: [
    /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap bg-card/80 backdrop-blur-sm sticky top-0 z-10", children: [
      /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-muted-foreground shrink-0", children: [
        /* @__PURE__ */ jsx("path", { d: "M9 11l3 3L22 4" }),
        /* @__PURE__ */ jsx("path", { d: "M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" })
      ] }),
      /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold mr-2", children: "Content Review" }),
      /* @__PURE__ */ jsx("div", { className: "h-4 w-px bg-border hidden sm:block" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          placeholder: "Buscar...",
          value: search,
          onChange: (e) => setSearch(e.target.value),
          className: "h-8 w-full max-w-[180px] rounded-md border border-input bg-background px-2.5 text-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
        }
      ),
      /* @__PURE__ */ jsx("button", { onClick: () => setFilter("all"), className: `px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${filter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:bg-accent"}`, children: "Todas" }),
      editorias.map((ed) => /* @__PURE__ */ jsx("button", { onClick: () => setFilter(ed), className: `px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${filter === ed ? "border-primary/50 bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-accent"}`, children: ed }, ed)),
      /* @__PURE__ */ jsx("button", { onClick: () => refresh(), className: "ml-auto p-1.5 rounded-md border border-input text-muted-foreground hover:bg-accent transition-colors", title: "Atualizar", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsx("path", { d: "M21 12a9 9 0 11-6.219-8.56" }),
        /* @__PURE__ */ jsx("polyline", { points: "21 3 21 9 15 9" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "p-4 md:p-6 flex-1", children: loading ? /* @__PURE__ */ jsx("div", { className: "text-center text-muted-foreground text-sm py-12", children: "Carregando..." }) : /* @__PURE__ */ jsx("div", { className: "flex gap-4 overflow-x-auto pb-6", children: columns.map((col) => {
      const items = filtered.filter((i) => i.status === col.key);
      return /* @__PURE__ */ jsxs("div", { className: "min-w-[260px] max-w-[300px] flex-1", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-3 px-1", children: [
          /* @__PURE__ */ jsx("span", { className: `font-semibold text-[13px] ${col.cls}`, children: col.label }),
          /* @__PURE__ */ jsx("span", { className: `text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${col.cls} bg-current/10`, style: { background: void 0 }, children: items.length })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-2", children: !items.length ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-dashed border-border text-center text-muted-foreground text-xs p-6", children: "Vazio" }) : items.map((issue) => {
          const [bLabel, bCls] = reviewBadge(issue.review?.status);
          return /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border bg-card p-3 shadow-sm hover:border-primary/30 transition-colors", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [
              issue.editoria && /* @__PURE__ */ jsx(Tag, { label: issue.editoria }),
              /* @__PURE__ */ jsx("span", { className: `text-[10px] font-semibold ${issue.priority === "high" ? "text-red-400" : "text-muted-foreground"}`, children: issue.priority })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-[13px] font-semibold leading-snug mb-2", children: [
              "JUS-",
              issue.issueNumber,
              " ",
              issue.title.replace(/^\[[^\]]+\]\s*/, "")
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-1 flex-wrap", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
                issue.publishDate && /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground", children: fmtDate(issue.publishDate) }),
                issue.channel && /* @__PURE__ */ jsx("span", { className: "text-[9px] text-muted-foreground bg-muted/50 px-1 py-0.5 rounded", children: issue.channel.includes("Instagram") ? "IG" : issue.channel.includes("LinkedIn") ? "LI" : issue.channel })
              ] }),
              issue.review?.status && /* @__PURE__ */ jsx("span", { className: `text-[9px] font-semibold px-1.5 py-0.5 rounded ${bCls}`, children: bLabel })
            ] })
          ] }, issue.id);
        }) })
      ] }, col.key);
    }) }) })
  ] });
}
function ContentReviewIssueTab() {
  const ctx = useHostContext();
  const companyId = ctx?.companyId;
  const issueId = ctx?.entityId;
  const { data, loading, refresh } = usePluginData("issue-review-detail", { issueId, companyId });
  const approveAction = usePluginAction("approve");
  const rejectAction = usePluginAction("reject");
  const requestChangesAction = usePluginAction("request-changes");
  const addCommentAction = usePluginAction("add-comment");
  const toast = usePluginToast();
  const [note, setNote] = useState("");
  const [commentText, setCommentText] = useState("");
  const [acting, setActing] = useState(false);
  const act = useCallback(async (action, params, msg) => {
    setActing(true);
    try {
      await action(params);
      toast?.({ title: msg, tone: "success" });
      setNote("");
      refresh();
    } catch (e) {
      toast?.({ title: "Erro", body: e.message, tone: "error" });
    } finally {
      setActing(false);
    }
  }, [toast, refresh]);
  if (!issueId || !companyId) return /* @__PURE__ */ jsx("div", { className: "p-4 text-muted-foreground text-sm", children: "Selecione uma issue." });
  if (loading) return /* @__PURE__ */ jsx("div", { className: "p-4 text-muted-foreground text-sm", children: "Carregando..." });
  if (!data) return /* @__PURE__ */ jsx("div", { className: "p-4 text-muted-foreground text-sm", children: "Dados n\xE3o encontrados." });
  const { issue, comments, review, criticScore, attachments } = data;
  const [bLabel, bCls] = reviewBadge(review?.status);
  return /* @__PURE__ */ jsxs("div", { className: "p-4 space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-base font-bold", children: "Preview & Review" }),
      issue.editoria && /* @__PURE__ */ jsx(Tag, { label: issue.editoria }),
      review?.status && /* @__PURE__ */ jsx("span", { className: `text-[10px] font-semibold px-2 py-0.5 rounded ${bCls}`, children: bLabel })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsx("div", { className: "space-y-4", children: /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border bg-card p-4 shadow-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "text-[11px] font-bold text-muted-foreground tracking-wider mb-2", children: "DETALHES" }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Data:" }),
          /* @__PURE__ */ jsx("span", { children: issue.publishDate || "N/A" }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Canal:" }),
          /* @__PURE__ */ jsx("span", { children: issue.channel || "N/A" }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Editoria:" }),
          /* @__PURE__ */ jsx("span", { children: issue.editoria || "N/A" }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Prioridade:" }),
          /* @__PURE__ */ jsx("span", { children: issue.priority }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "Status:" }),
          /* @__PURE__ */ jsx("span", { children: issue.status })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        criticScore && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border bg-card p-4 shadow-sm text-center", children: [
          /* @__PURE__ */ jsx("div", { className: "text-[11px] font-bold text-muted-foreground tracking-wider mb-2 text-left", children: "SCORE DO CRITIC" }),
          /* @__PURE__ */ jsx(RadarChart, { score: criticScore }),
          /* @__PURE__ */ jsxs("div", { className: `mt-2 text-sm font-bold ${criticScore.average >= 8 ? "text-green-500" : "text-yellow-500"}`, children: [
            "Media: ",
            criticScore.average.toFixed(1),
            "/10 ",
            criticScore.average >= 8 ? "- Aprovado pelo Critic" : "- Requer aten\xE7\xE3o"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border bg-card p-4 shadow-sm", children: [
          /* @__PURE__ */ jsx("div", { className: "text-[11px] font-bold text-muted-foreground tracking-wider mb-3", children: "DECIS\xC3O" }),
          /* @__PURE__ */ jsx(
            "textarea",
            {
              placeholder: "Nota de review...",
              value: note,
              onChange: (e) => setNote(e.target.value),
              rows: 2,
              className: "w-full min-h-[60px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm mb-3 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => act(approveAction, { issueId, companyId, note }, "Aprovado"),
                disabled: acting,
                className: "inline-flex items-center rounded-md text-xs font-medium h-8 px-3 border border-green-500/30 text-green-500 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50",
                children: "Aprovar"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => {
                  if (!note.trim()) {
                    toast?.({ title: "Descreva as altera\xE7\xF5es", tone: "error" });
                    return;
                  }
                  act(requestChangesAction, { issueId, companyId, note }, "Altera\xE7\xF5es solicitadas");
                },
                disabled: acting,
                className: "inline-flex items-center rounded-md text-xs font-medium h-8 px-3 border border-yellow-500/30 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 disabled:opacity-50",
                children: "Pedir Altera\xE7\xF5es"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => {
                  if (!note.trim()) {
                    toast?.({ title: "Justifique a reprova\xE7\xE3o", tone: "error" });
                    return;
                  }
                  act(rejectAction, { issueId, companyId, note }, "Reprovado");
                },
                disabled: acting,
                className: "inline-flex items-center rounded-md text-xs font-medium h-8 px-3 border border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50",
                children: "Reprovar"
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border bg-card p-4 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-[11px] font-bold text-muted-foreground tracking-wider mb-3", children: [
        "COMENT\xC1RIOS (",
        comments?.length || 0,
        ")"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "max-h-[300px] overflow-y-auto space-y-2 mb-3", children: [
        (comments || []).map((c) => {
          const isReview = c.body.includes("[REVIEW]") || c.body.includes("[APROVADO]") || c.body.includes("[REPROVADO]");
          return /* @__PURE__ */ jsxs("div", { className: `p-2.5 rounded-lg text-sm border ${isReview ? "border-primary/30 bg-primary/5" : c.authorAgentId ? "border-border bg-accent/20" : "border-border bg-background"}`, children: [
            /* @__PURE__ */ jsxs("div", { className: "flex justify-between mb-1", children: [
              /* @__PURE__ */ jsx("span", { className: `font-semibold text-[11px] ${c.authorAgentId ? "text-purple-400" : "text-primary"}`, children: c.authorAgentId ? "Agente" : "Humano" }),
              /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground", children: fmtDate(c.createdAt) })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "text-foreground leading-relaxed whitespace-pre-wrap", children: c.body })
          ] }, c.id);
        }),
        !comments?.length && /* @__PURE__ */ jsx("div", { className: "text-muted-foreground text-xs text-center py-4", children: "Nenhum coment\xE1rio." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            placeholder: "Adicionar coment\xE1rio de review...",
            value: commentText,
            onChange: (e) => setCommentText(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter" && commentText.trim()) {
                addCommentAction({ issueId, companyId, body: commentText });
                toast?.({ title: "Coment\xE1rio adicionado", tone: "success" });
                setCommentText("");
                refresh();
              }
            },
            className: "flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              if (commentText.trim()) {
                addCommentAction({ issueId, companyId, body: commentText });
                toast?.({ title: "Enviado", tone: "success" });
                setCommentText("");
                refresh();
              }
            },
            className: "inline-flex items-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90",
            children: "Enviar"
          }
        )
      ] })
    ] })
  ] });
}
function ContentReviewDashboardWidget() {
  const ctx = useHostContext();
  const { data, loading } = usePluginData("dashboard-metrics", { companyId: ctx?.companyId });
  if (loading || !data) return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "text-sm font-bold", children: "Content Review" }),
    /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1", children: "Carregando..." })
  ] });
  const pct = data.weeklyTarget > 0 ? Math.min(100, data.thisWeekDone / data.weeklyTarget * 100) : 0;
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "text-sm font-bold mb-3", children: "Content Review" }),
    /* @__PURE__ */ jsxs("div", { className: "mb-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between text-[11px] text-muted-foreground mb-1", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          "Meta: ",
          data.thisWeekDone,
          "/",
          data.weeklyTarget
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          pct.toFixed(0),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "h-1.5 bg-accent/30 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full rounded-full transition-all", style: { width: `${pct}%`, background: pct >= 100 ? "#10b981" : "hsl(var(--primary))" } }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-2", children: [["Em Review", data.pendingReview, "text-purple-400"], ["Aprovados", data.approved, "text-green-400"], ["Altera\xE7\xF5es", data.changesRequested, "text-yellow-400"], ["Score", data.averageScore?.toFixed(1) || "-", data.averageScore >= 8 ? "text-green-400" : "text-yellow-400"]].map(([l, v, c]) => /* @__PURE__ */ jsxs("div", { className: "bg-accent/20 rounded-lg p-2", children: [
      /* @__PURE__ */ jsx("div", { className: `text-lg font-bold ${c}`, children: v }),
      /* @__PURE__ */ jsx("div", { className: "text-[10px] text-muted-foreground", children: l })
    ] }, l)) })
  ] });
}
function ContentReviewSidebar({ context }) {
  const prefix = context?.companyPrefix || "";
  const href = prefix ? `/${prefix}/content-review` : "/content-review";
  const isActive = typeof window !== "undefined" && window.location.pathname.includes("content-review");
  return /* @__PURE__ */ jsxs("a", { href, className: `flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"}`, children: [
    /* @__PURE__ */ jsx("span", { className: "relative shrink-0", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
      /* @__PURE__ */ jsx("path", { d: "M9 11l3 3L22 4" }),
      /* @__PURE__ */ jsx("path", { d: "M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" })
    ] }) }),
    "Content Review"
  ] });
}
function ContentReviewCommentAnnotation() {
  const ctx = useHostContext();
  const { data } = usePluginData("comment-review-context", { issueId: ctx?.parentEntityId, commentId: ctx?.entityId, companyId: ctx?.companyId });
  if (!data) return null;
  if (data.score) {
    const avg = data.score.average;
    const cls = avg >= 8 ? "text-green-500 border-green-500/30 bg-green-500/10" : avg >= 6 ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/10" : "text-red-500 border-red-500/30 bg-red-500/10";
    return /* @__PURE__ */ jsxs("div", { className: `inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded border text-[11px] ${cls}`, children: [
      /* @__PURE__ */ jsxs("span", { className: "font-bold", children: [
        "Score: ",
        avg.toFixed(1),
        "/10"
      ] }),
      /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "|" }),
      /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
        "B:",
        data.score.brand.toFixed(0),
        " C:",
        data.score.clarity.toFixed(0),
        " G:",
        data.score.hook.toFixed(0),
        " P:",
        data.score.accuracy.toFixed(0),
        " A:",
        data.score.actionability.toFixed(0)
      ] })
    ] });
  }
  if (data.isReviewComment) return /* @__PURE__ */ jsx("div", { className: "inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-[10px] text-primary font-semibold", children: "REVIEW HUMANO" });
  return null;
}
export {
  ContentReviewCommentAnnotation,
  ContentReviewDashboardWidget,
  ContentReviewIssueTab,
  ContentReviewPage,
  ContentReviewSidebar
};
//# sourceMappingURL=index.js.map
