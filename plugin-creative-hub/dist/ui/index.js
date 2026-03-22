// src/ui/index.tsx
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  usePluginData,
  usePluginAction,
  useHostContext,
  usePluginToast
} from "@paperclipai/plugin-sdk/ui";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 6e4);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function fmtTime(ts) {
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
var RC = { ceo: "#8b5cf6", researcher: "#3b82f6", designer: "#10b981", qa: "#f59e0b", engineer: "#6366f1" };
var TC = { "Seus Direitos": "#10b981", "Consulta Processual": "#3b82f6", "Jus IA": "#8b5cf6", "Employer Branding": "#f59e0b", "Institucional": "#ec4899" };
function rc(role) {
  return RC[role || ""] || "hsl(var(--muted-foreground))";
}
function tc(tag) {
  return TC[tag] || "hsl(var(--muted-foreground))";
}
function renderBody(text) {
  return text.split(/(@[\w\s]+?)(?=\s|$|[,.])/g).map(
    (part, i) => part.startsWith("@") ? /* @__PURE__ */ jsx("span", { className: "font-semibold text-primary bg-primary/10 px-0.5 rounded", children: part }, i) : /* @__PURE__ */ jsx("span", { children: part }, i)
  );
}
function Avatar({ name, role, size = "w-9 h-9 text-sm" }) {
  return /* @__PURE__ */ jsx("div", { className: `${size} rounded-full border-2 flex items-center justify-center font-bold shrink-0`, style: { borderColor: rc(role), color: rc(role), background: `${rc(role)}15` }, children: name.charAt(0) });
}
function Tag({ label }) {
  const c = tc(label);
  return /* @__PURE__ */ jsx("span", { className: "inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border", style: { color: c, borderColor: `${c}44`, background: `${c}12` }, children: label });
}
function TypeBadge({ type }) {
  const m = { approval: ["APROVA\xC7\xC3O", "text-green-400 bg-green-400/10 border-green-400/30"], report: ["REPORT", "text-blue-400 bg-blue-400/10 border-blue-400/30"], question: ["PERGUNTA", "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"] };
  const v = m[type];
  if (!v) return null;
  return /* @__PURE__ */ jsx("span", { className: `text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded border ${v[1]}`, children: v[0] });
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
function Message({ msg, onOpenThread, compact }) {
  if (msg.type === "system") return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 px-4 py-1 text-[11px] text-muted-foreground border-l-2 border-border", children: [
    /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "SYS" }),
    /* @__PURE__ */ jsx("span", { className: "flex-1", children: msg.body }),
    /* @__PURE__ */ jsx("span", { className: "text-[10px]", children: timeAgo(msg.timestamp) })
  ] });
  const isApproval = msg.type === "approval";
  const borderClass = isApproval ? msg.body.includes("[APROVADO]") ? "border-l-green-500" : msg.body.includes("[REPROVADO]") ? "border-l-red-500" : "border-l-yellow-500" : "border-l-transparent";
  return /* @__PURE__ */ jsxs("div", { className: `flex gap-3 px-4 ${compact ? "py-1.5" : "py-2.5"} border-l-[3px] ${borderClass} hover:bg-accent/30 transition-colors`, children: [
    /* @__PURE__ */ jsx(Avatar, { name: msg.authorName, role: msg.authorRole, size: compact ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm" }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 flex-wrap", children: [
        /* @__PURE__ */ jsx("span", { className: "font-bold text-[13px]", style: { color: rc(msg.authorRole) }, children: msg.authorName }),
        msg.authorRole && /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground px-1 rounded", style: { background: `${rc(msg.authorRole)}10` }, children: msg.authorRole }),
        /* @__PURE__ */ jsx(TypeBadge, { type: msg.type }),
        (msg.tags || []).map((t) => /* @__PURE__ */ jsx(Tag, { label: t }, t)),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground ml-auto", children: fmtTime(msg.timestamp) })
      ] }),
      msg.issueNumber && !compact && /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-muted-foreground mt-0.5", children: [
        /* @__PURE__ */ jsxs("span", { className: "text-primary underline cursor-pointer", onClick: () => onOpenThread?.(msg.issueId), children: [
          "JUS-",
          msg.issueNumber
        ] }),
        " ",
        msg.issueTitle?.replace(/^\[[^\]]+\]\s*/, "").substring(0, 60)
      ] }),
      /* @__PURE__ */ jsx("div", { className: "text-[13px] text-foreground leading-relaxed mt-1 whitespace-pre-wrap break-words", children: renderBody(msg.body) })
    ] })
  ] });
}
function Composer({ agents, onSend, placeholder, issueId }) {
  const [text, setText] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const ref = useRef(null);
  const filtered = useMemo(() => !mentionFilter ? agents : agents.filter((a) => a.name.toLowerCase().includes(mentionFilter.toLowerCase())), [agents, mentionFilter]);
  const handleInput = useCallback((e) => {
    const v = e.target.value;
    setText(v);
    const at = v.lastIndexOf("@");
    if (at >= 0 && (at === v.length - 1 || !v.slice(at + 1).includes(" "))) {
      setShowMentions(true);
      setMentionFilter(v.slice(at + 1));
    } else setShowMentions(false);
  }, []);
  const insertMention = useCallback((name) => {
    setText((t) => t.slice(0, t.lastIndexOf("@")) + `@${name} `);
    setShowMentions(false);
    ref.current?.focus();
  }, []);
  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    onSend(text.trim(), issueId);
    setText("");
    setShowMentions(false);
  }, [text, onSend, issueId]);
  return /* @__PURE__ */ jsxs("div", { className: "relative p-3 border-t border-border bg-card", children: [
    showMentions && filtered.length > 0 && /* @__PURE__ */ jsx("div", { className: "absolute bottom-full left-3 right-3 bg-popover border border-border rounded-lg p-1 max-h-48 overflow-y-auto shadow-lg z-10", children: filtered.map((a) => /* @__PURE__ */ jsxs("div", { onClick: () => insertMention(a.name), className: "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent text-sm", children: [
      /* @__PURE__ */ jsx(Avatar, { name: a.name, role: a.role, size: "w-6 h-6 text-[10px]" }),
      /* @__PURE__ */ jsx("span", { className: "font-semibold", style: { color: rc(a.role) }, children: a.name }),
      /* @__PURE__ */ jsx("span", { className: "text-[11px] text-muted-foreground", children: a.role })
    ] }, a.id)) }),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-end", children: [
      /* @__PURE__ */ jsx(
        "textarea",
        {
          ref,
          value: text,
          onChange: handleInput,
          onKeyDown: (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          },
          placeholder: placeholder || "Mensagem... (@ para mencionar, Shift+Enter nova linha)",
          rows: 1,
          className: "flex-1 min-h-[40px] max-h-[120px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleSend,
          disabled: !text.trim(),
          className: "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none shrink-0",
          children: "Enviar"
        }
      )
    ] })
  ] });
}
function LazyImage({ attachmentId, alt, className }) {
  const [src, setSrc] = useState("");
  const [loading, setLoading] = useState(true);
  const getImage = usePluginAction("get-image");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getImage({ attachmentId });
        if (!cancelled && result?.dataUrl) setSrc(result.dataUrl);
      } catch {
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [attachmentId, getImage]);
  if (loading) return /* @__PURE__ */ jsx("div", { className: `${className || ""} bg-accent/20 animate-pulse flex items-center justify-center text-muted-foreground text-xs`, children: "Carregando..." });
  if (!src) return /* @__PURE__ */ jsx("div", { className: `${className || ""} bg-accent/10 flex items-center justify-center text-muted-foreground text-xs`, children: "Erro" });
  return /* @__PURE__ */ jsx("img", { src, alt, className, loading: "lazy" });
}
function TimelinePage() {
  const ctx = useHostContext();
  const companyId = ctx?.companyId;
  const toast = usePluginToast();
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [threadIssueId, setThreadIssueId] = useState(null);
  const { data: agents } = usePluginData("agents", { companyId });
  const { data: timeline, loading: tlLoading, refresh: refreshTl } = usePluginData("timeline", { companyId, filterAgent, filterType, filterTag, limit: 150 });
  const { data: thread, refresh: refreshThread } = usePluginData("thread", { issueId: threadIssueId, companyId });
  const sendMessage = usePluginAction("send-message");
  const sendBroadcast = usePluginAction("send-broadcast");
  const handleSend = useCallback(async (body, issueId) => {
    if (!companyId) return;
    try {
      if (issueId) await sendMessage({ companyId, issueId, body });
      else await sendBroadcast({ companyId, body });
      toast?.({ title: "Mensagem enviada", tone: "success" });
      refreshTl();
      if (threadIssueId) refreshThread();
    } catch (e) {
      toast?.({ title: "Erro", body: e.message, tone: "error" });
    }
  }, [companyId, sendMessage, sendBroadcast, toast, refreshTl, refreshThread, threadIssueId]);
  const tags = useMemo(() => {
    if (!timeline) return [];
    const s = /* @__PURE__ */ new Set();
    for (const e of timeline) for (const t of e.tags || []) s.add(t);
    return Array.from(s);
  }, [timeline]);
  const agentOptions = useMemo(() => [
    { key: "all", label: "Todos" },
    { key: "human", label: "Board (humano)", color: "hsl(var(--primary))" },
    ...(agents || []).map((a) => ({ key: a.id, label: a.name, color: rc(a.role) }))
  ], [agents]);
  const typeOptions = [
    { key: "all", label: "Todos" },
    { key: "chat", label: "Chat" },
    { key: "approval", label: "Aprova\xE7\xE3o" },
    { key: "report", label: "Report" },
    { key: "question", label: "Pergunta" },
    { key: "system", label: "Sistema" }
  ];
  const tagOptions = useMemo(() => [
    { key: "all", label: "Todas" },
    ...tags.map((t) => ({ key: t, label: t, color: tc(t) }))
  ], [tags]);
  if (!companyId) return /* @__PURE__ */ jsx("div", { className: "p-8 text-muted-foreground", children: "Selecione uma empresa." });
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full text-foreground overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap bg-card/80 backdrop-blur-sm sticky top-0 z-10", children: [
      /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-muted-foreground shrink-0", children: /* @__PURE__ */ jsx("path", { d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" }) }),
      /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold mr-2", children: "Timeline" }),
      /* @__PURE__ */ jsx("div", { className: "h-4 w-px bg-border hidden sm:block" }),
      /* @__PURE__ */ jsx(DropdownFilter, { label: "Agente", value: filterAgent, options: agentOptions, onChange: setFilterAgent }),
      /* @__PURE__ */ jsx(DropdownFilter, { label: "Tipo", value: filterType, options: typeOptions, onChange: setFilterType }),
      tags.length > 0 && /* @__PURE__ */ jsx(DropdownFilter, { label: "Editoria", value: filterTag, options: tagOptions, onChange: setFilterTag }),
      /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-muted-foreground ml-auto hidden sm:inline", children: [
        timeline?.length || 0,
        " mensagens"
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: () => refreshTl(), className: "p-1.5 rounded-md border border-input text-muted-foreground hover:bg-accent transition-colors", title: "Atualizar", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsx("path", { d: "M21 12a9 9 0 11-6.219-8.56" }),
        /* @__PURE__ */ jsx("polyline", { points: "21 3 21 9 15 9" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 flex overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col overflow-hidden bg-background", children: [
        /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto flex flex-col-reverse", children: tlLoading ? /* @__PURE__ */ jsx("div", { className: "p-8 text-center text-muted-foreground text-sm", children: "Carregando..." }) : !timeline?.length ? /* @__PURE__ */ jsx("div", { className: "p-8 text-center text-muted-foreground text-sm", children: "Nenhuma mensagem. Envie algo ou mencione um agente com @." }) : [...timeline].reverse().map((m) => /* @__PURE__ */ jsx(Message, { msg: m, onOpenThread: setThreadIssueId }, m.id)) }),
        /* @__PURE__ */ jsx(Composer, { agents: agents || [], onSend: handleSend })
      ] }),
      threadIssueId && /* @__PURE__ */ jsxs("div", { className: "w-full md:w-[340px] lg:w-[380px] shrink-0 bg-card border-l border-border flex flex-col overflow-hidden absolute md:relative right-0 z-10 h-full", children: [
        /* @__PURE__ */ jsxs("div", { className: "px-3 py-2.5 border-b border-border flex items-center gap-2", children: [
          /* @__PURE__ */ jsxs("span", { className: "text-sm font-bold flex-1", children: [
            "Thread ",
            thread?.issue ? `JUS-${thread.issue.issueNumber}` : ""
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: () => setThreadIssueId(null), className: "text-muted-foreground hover:text-foreground text-lg leading-none px-1", children: "x" })
        ] }),
        thread?.issue && /* @__PURE__ */ jsxs("div", { className: "px-3 py-2 border-b border-border text-xs", children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold", children: thread.issue.title }),
          /* @__PURE__ */ jsxs("div", { className: "text-muted-foreground mt-0.5", children: [
            "Status: ",
            thread.issue.status
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-y-auto", children: [
          thread?.messages?.map((m) => /* @__PURE__ */ jsx(Message, { msg: m, compact: true }, m.id)),
          !thread?.messages?.length && /* @__PURE__ */ jsx("div", { className: "p-6 text-center text-muted-foreground text-xs", children: "Nenhuma mensagem." })
        ] }),
        /* @__PURE__ */ jsx(Composer, { agents: agents || [], onSend: handleSend, issueId: threadIssueId, placeholder: `Responder JUS-${thread?.issue?.issueNumber || ""}...` })
      ] })
    ] })
  ] });
}
var REJECTION_REASONS = [
  { key: "off_brand", label: "Fora do padr\xE3o de marca" },
  { key: "wrong_tone", label: "Tom inadequado para o p\xFAblico" },
  { key: "weak_hook", label: "Gancho fraco \u2014 n\xE3o gera curiosidade" },
  { key: "legal_error", label: "Erro jur\xEDdico ou imprecis\xE3o" },
  { key: "visual_issue", label: "Problemas visuais (cores, tipografia, layout)" },
  { key: "copy_issue", label: "Copy precisa de ajustes" },
  { key: "missing_cta", label: "CTA ausente ou gen\xE9rico" },
  { key: "wrong_format", label: "Formato ou dimens\xE3o incorreta" }
];
function RejectModal({ onClose, onSubmit }) {
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState("");
  const toggle = (key) => setSelected((s) => s.includes(key) ? s.filter((k) => k !== key) : [...s, key]);
  return /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { className: "bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-5 space-y-4", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h3", { className: "text-base font-bold", children: "Reprovar carrossel" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "Selecione os motivos e descreva o que o agente deve corrigir na pr\xF3xima vers\xE3o." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "space-y-1.5", children: REJECTION_REASONS.map((r) => /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => toggle(r.key),
        className: `flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left transition-colors border ${selected.includes(r.key) ? "border-red-500/50 bg-red-500/10 text-foreground font-medium" : "border-border hover:bg-accent/50 text-muted-foreground"}`,
        children: [
          /* @__PURE__ */ jsx("span", { className: `w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] shrink-0 ${selected.includes(r.key) ? "border-red-500 bg-red-500 text-white" : "border-muted-foreground/40"}`, children: selected.includes(r.key) && "x" }),
          r.label
        ]
      },
      r.key
    )) }),
    /* @__PURE__ */ jsx(
      "textarea",
      {
        value: note,
        onChange: (e) => setNote(e.target.value),
        placeholder: "Direcionamento para o agente criar nova vers\xE3o...",
        rows: 3,
        className: "w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "flex gap-2 justify-end", children: [
      /* @__PURE__ */ jsx("button", { onClick: onClose, className: "px-4 py-2 rounded-md text-sm border border-input text-muted-foreground hover:bg-accent", children: "Cancelar" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => {
            if (selected.length || note.trim()) onSubmit(selected, note);
          },
          disabled: !selected.length && !note.trim(),
          className: "px-4 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50",
          children: "Reprovar e enviar feedback"
        }
      )
    ] })
  ] }) });
}
function CarouselSlider({ images }) {
  const [current, setCurrent] = useState(0);
  const [lightboxId, setLightboxId] = useState(null);
  const total = images.length;
  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "relative bg-accent/5", children: [
      /* @__PURE__ */ jsx("div", { className: "cursor-pointer", onClick: () => setLightboxId(images[current].id), children: /* @__PURE__ */ jsx(LazyImage, { attachmentId: images[current].id, alt: images[current].filename, className: "w-full max-h-[500px] object-contain" }) }),
      total > 1 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("button", { onClick: (e) => {
          e.stopPropagation();
          prev();
        }, className: "absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors", children: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", children: /* @__PURE__ */ jsx("path", { d: "M15 18l-6-6 6-6" }) }) }),
        /* @__PURE__ */ jsx("button", { onClick: (e) => {
          e.stopPropagation();
          next();
        }, className: "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors", children: /* @__PURE__ */ jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", children: /* @__PURE__ */ jsx("path", { d: "M9 18l6-6-6-6" }) }) })
      ] }),
      total > 1 && /* @__PURE__ */ jsx("div", { className: "absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5", children: /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-white bg-black/50 px-2 py-0.5 rounded-full font-medium", children: [
        current + 1,
        " / ",
        total
      ] }) })
    ] }),
    total > 1 && /* @__PURE__ */ jsx("div", { className: "flex gap-1 px-3 py-2 overflow-x-auto border-t border-border bg-accent/5", children: images.map((img, i) => /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setCurrent(i),
        className: `shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors ${i === current ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`,
        children: /* @__PURE__ */ jsx(LazyImage, { attachmentId: img.id, alt: img.filename, className: "w-full h-full object-cover" })
      },
      img.id
    )) }),
    lightboxId && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/90 flex items-center justify-center z-50 cursor-pointer p-4", onClick: () => setLightboxId(null), children: /* @__PURE__ */ jsx(LazyImage, { attachmentId: lightboxId, alt: "", className: "max-w-[90vw] max-h-[90vh] object-contain rounded-lg" }) })
  ] });
}
function CarouselFeedCard({ carousel, companyId, companyPrefix, onRefresh }) {
  const [showReject, setShowReject] = useState(false);
  const [acting, setActing] = useState(false);
  const approveAction = usePluginAction("approve-piece");
  const rejectAction = usePluginAction("reject-piece");
  const toast = usePluginToast();
  const handleApprove = useCallback(async () => {
    setActing(true);
    try {
      await approveAction({ issueId: carousel.issueId, companyId, note: "Carrossel aprovado para publica\xE7\xE3o." });
      toast?.({ title: "Carrossel aprovado", tone: "success" });
      onRefresh();
    } catch (e) {
      toast?.({ title: "Erro", body: e.message, tone: "error" });
    }
    setActing(false);
  }, [approveAction, carousel, companyId, toast, onRefresh]);
  const handleReject = useCallback(async (reasons, note) => {
    setActing(true);
    const reasonLabels = reasons.map((r) => REJECTION_REASONS.find((rr) => rr.key === r)?.label || r);
    try {
      await rejectAction({ issueId: carousel.issueId, companyId, reasons: reasonLabels, note });
      toast?.({ title: "Feedback enviado ao agente", tone: "success" });
      setShowReject(false);
      onRefresh();
    } catch (e) {
      toast?.({ title: "Erro", body: e.message, tone: "error" });
    }
    setActing(false);
  }, [rejectAction, carousel, companyId, toast, onRefresh]);
  const statusBadge = carousel.reviewStatus === "approved" ? "text-green-500 bg-green-500/10 border-green-500/30" : carousel.reviewStatus === "rejected" ? "text-red-500 bg-red-500/10 border-red-500/30" : "text-muted-foreground bg-muted/50 border-border";
  const statusLabel = carousel.reviewStatus === "approved" ? "Aprovado" : carousel.reviewStatus === "rejected" ? "Reprovado" : "Aguardando revis\xE3o";
  const typeLabel = carousel.images.length > 1 ? `Carrossel \u2014 ${carousel.images.length} cards` : "Card \xFAnico";
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border bg-card shadow-sm overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "px-4 py-3 flex items-center gap-3 border-b border-border", children: [
        /* @__PURE__ */ jsx(Avatar, { name: carousel.agentName || "Designer", role: "designer", size: "w-8 h-8 text-xs" }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-sm", style: { color: rc("designer") }, children: carousel.agentName }),
            /* @__PURE__ */ jsx("span", { className: `text-[9px] font-semibold px-1.5 py-0.5 rounded border ${statusBadge}`, children: statusLabel })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsxs("span", { className: "font-medium", children: [
              "JUS-",
              carousel.issueNumber
            ] }),
            carousel.tag && /* @__PURE__ */ jsx(Tag, { label: carousel.tag }),
            /* @__PURE__ */ jsx("span", { children: timeAgo(carousel.timestamp) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "px-4 py-3 border-b border-border space-y-1.5", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: carousel.issueTitle?.replace(/^\[[^\]]+\]\s*/, "") }),
        /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx("span", { className: "font-medium text-foreground/80", children: "Tipo:" }),
          " ",
          typeLabel
        ] }),
        carousel.description && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap", children: carousel.description })
      ] }),
      /* @__PURE__ */ jsx(CarouselSlider, { images: carousel.images }),
      /* @__PURE__ */ jsxs("div", { className: "px-4 py-3 flex items-center gap-2 border-t border-border flex-wrap", children: [
        carousel.reviewStatus !== "approved" && carousel.reviewStatus !== "rejected" && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleApprove,
              disabled: acting,
              className: "inline-flex items-center gap-1.5 rounded-md text-sm font-medium h-9 px-4 border border-green-500/30 text-green-500 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 transition-colors",
              children: [
                /* @__PURE__ */ jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", children: /* @__PURE__ */ jsx("path", { d: "M20 6L9 17l-5-5" }) }),
                "Aprovar carrossel"
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setShowReject(true),
              disabled: acting,
              className: "inline-flex items-center gap-1.5 rounded-md text-sm font-medium h-9 px-4 border border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 transition-colors",
              children: [
                /* @__PURE__ */ jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", children: /* @__PURE__ */ jsx("path", { d: "M18 6L6 18M6 6l12 12" }) }),
                "Reprovar"
              ]
            }
          )
        ] }),
        carousel.reviewStatus === "approved" && /* @__PURE__ */ jsxs("span", { className: "text-xs text-green-500 font-medium flex items-center gap-1", children: [
          /* @__PURE__ */ jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", children: /* @__PURE__ */ jsx("path", { d: "M20 6L9 17l-5-5" }) }),
          "Aprovado para publica\xE7\xE3o"
        ] }),
        carousel.reviewStatus === "rejected" && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [
          /* @__PURE__ */ jsxs("span", { className: "text-xs text-red-400 flex items-center gap-1", children: [
            /* @__PURE__ */ jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ jsx("path", { d: "M18 6L6 18M6 6l12 12" }) }),
            "Reprovado \u2014 feedback enviado ao agente"
          ] }),
          /* @__PURE__ */ jsxs(
            "a",
            {
              href: `/${companyPrefix || "JUS"}/issues/JUS-${carousel.issueNumber}`,
              className: "inline-flex items-center gap-1.5 rounded-md text-xs font-medium h-8 px-3 border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors",
              children: [
                /* @__PURE__ */ jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                  /* @__PURE__ */ jsx("path", { d: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" }),
                  /* @__PURE__ */ jsx("polyline", { points: "15 3 21 3 21 9" }),
                  /* @__PURE__ */ jsx("line", { x1: "10", y1: "14", x2: "21", y2: "3" })
                ] }),
                "Ver issue JUS-",
                carousel.issueNumber
              ]
            }
          )
        ] })
      ] })
    ] }),
    showReject && /* @__PURE__ */ jsx(RejectModal, { onClose: () => setShowReject(false), onSubmit: handleReject })
  ] });
}
function GalleryPage() {
  const ctx = useHostContext();
  const companyId = ctx?.companyId;
  const { data: carousels, loading: galLoading, refresh: refreshGal } = usePluginData("gallery", { companyId });
  const [galFilter, setGalFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const galTags = useMemo(() => Array.from(new Set((carousels || []).map((c) => c.tag).filter(Boolean))), [carousels]);
  const filtered = useMemo(() => {
    return (carousels || []).filter((c) => {
      if (galFilter !== "all" && c.tag !== galFilter) return false;
      if (statusFilter === "pending" && c.reviewStatus !== "pending") return false;
      if (statusFilter === "approved" && c.reviewStatus !== "approved") return false;
      if (statusFilter === "rejected" && c.reviewStatus !== "rejected") return false;
      return true;
    });
  }, [carousels, galFilter, statusFilter]);
  const tagOptions = useMemo(() => [
    { key: "all", label: "Todas" },
    ...galTags.map((t) => ({ key: t, label: t, color: tc(t) }))
  ], [galTags]);
  const statusOptions = [
    { key: "all", label: "Todos" },
    { key: "pending", label: "Aguardando" },
    { key: "approved", label: "Aprovados" },
    { key: "rejected", label: "Reprovados" }
  ];
  if (!companyId) return /* @__PURE__ */ jsx("div", { className: "p-8 text-muted-foreground", children: "Selecione uma empresa." });
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full text-foreground overflow-hidden", children: [
    /* @__PURE__ */ jsxs("div", { className: "px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap bg-card/80 backdrop-blur-sm sticky top-0 z-10", children: [
      /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-muted-foreground shrink-0", children: [
        /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
        /* @__PURE__ */ jsx("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
        /* @__PURE__ */ jsx("path", { d: "M21 15l-5-5L5 21" })
      ] }),
      /* @__PURE__ */ jsx("span", { className: "text-sm font-semibold mr-2", children: "Galeria" }),
      /* @__PURE__ */ jsx("div", { className: "h-4 w-px bg-border hidden sm:block" }),
      /* @__PURE__ */ jsx(DropdownFilter, { label: "Editoria", value: galFilter, options: tagOptions, onChange: setGalFilter }),
      /* @__PURE__ */ jsx(DropdownFilter, { label: "Status", value: statusFilter, options: statusOptions, onChange: setStatusFilter }),
      /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-muted-foreground ml-auto hidden sm:inline", children: [
        filtered.length,
        " carross\xE9is"
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: () => refreshGal(), className: "p-1.5 rounded-md border border-input text-muted-foreground hover:bg-accent transition-colors", title: "Atualizar", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsx("path", { d: "M21 12a9 9 0 11-6.219-8.56" }),
        /* @__PURE__ */ jsx("polyline", { points: "21 3 21 9 15 9" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto", children: /* @__PURE__ */ jsx("div", { className: "max-w-2xl mx-auto p-3 md:p-4 space-y-4", children: galLoading ? /* @__PURE__ */ jsx("div", { className: "text-center text-muted-foreground text-sm p-8", children: "Carregando carross\xE9is..." }) : !filtered.length ? /* @__PURE__ */ jsx("div", { className: "text-center text-muted-foreground text-sm p-12", children: "Nenhum carrossel para revis\xE3o." }) : filtered.map((c) => /* @__PURE__ */ jsx(CarouselFeedCard, { carousel: c, companyId, companyPrefix: ctx?.companyPrefix || void 0, onRefresh: refreshGal }, c.issueId)) }) })
  ] });
}
function TimelineSidebar({ context }) {
  const prefix = context?.companyPrefix || "";
  const href = prefix ? `/${prefix}/timeline` : "/timeline";
  const isActive = typeof window !== "undefined" && window.location.pathname.includes("/timeline");
  return /* @__PURE__ */ jsxs("a", { href, className: `flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"}`, children: [
    /* @__PURE__ */ jsx("span", { className: "relative shrink-0", children: /* @__PURE__ */ jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("path", { d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" }) }) }),
    "Timeline"
  ] });
}
function GallerySidebar({ context }) {
  const prefix = context?.companyPrefix || "";
  const href = prefix ? `/${prefix}/galeria` : "/galeria";
  const isActive = typeof window !== "undefined" && window.location.pathname.includes("/galeria");
  return /* @__PURE__ */ jsxs("a", { href, className: `flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"}`, children: [
    /* @__PURE__ */ jsx("span", { className: "relative shrink-0", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
      /* @__PURE__ */ jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }),
      /* @__PURE__ */ jsx("circle", { cx: "8.5", cy: "8.5", r: "1.5" }),
      /* @__PURE__ */ jsx("path", { d: "M21 15l-5-5L5 21" })
    ] }) }),
    "Galeria"
  ] });
}
function CreativeHubDashboardWidget() {
  const ctx = useHostContext();
  const { data, loading } = usePluginData("dashboard-feed", { companyId: ctx?.companyId });
  if (loading || !data) return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "text-sm font-bold", children: "Creative Hub" }),
    /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1", children: "Carregando..." })
  ] });
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
      /* @__PURE__ */ jsx("span", { className: "text-sm font-bold", children: "# Creative Hub" }),
      /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-muted-foreground", children: [
        data.totalIssues,
        " issues"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex gap-1.5 mb-3 flex-wrap", children: (data.agents || []).map((a) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]", style: { background: `${rc(a.role)}10` }, children: [
      /* @__PURE__ */ jsx("span", { className: `w-1.5 h-1.5 rounded-full ${a.status === "running" ? "bg-green-500" : a.status === "idle" ? "bg-yellow-500" : "bg-muted-foreground/40"}` }),
      /* @__PURE__ */ jsx("span", { className: "font-semibold", style: { color: rc(a.role) }, children: a.name })
    ] }, a.id)) }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
      data.entries.slice(0, 5).map((e) => /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5 items-start p-1.5 rounded bg-accent/20 text-[11px]", children: [
        /* @__PURE__ */ jsx(Avatar, { name: e.authorName, size: "w-5 h-5 text-[8px]" }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("span", { className: "font-semibold", style: { color: e.authorType === "agent" ? "#8b5cf6" : "hsl(var(--primary))" }, children: e.authorName }),
          /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground", children: [
            " ",
            timeAgo(e.timestamp)
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-muted-foreground truncate", children: e.text.substring(0, 80) })
        ] })
      ] }, e.id)),
      !data.entries.length && /* @__PURE__ */ jsx("div", { className: "text-muted-foreground text-[11px] text-center py-2", children: "Sem atividade recente" })
    ] })
  ] });
}
export {
  CreativeHubDashboardWidget,
  GalleryPage,
  GallerySidebar,
  TimelinePage,
  TimelineSidebar
};
//# sourceMappingURL=index.js.map
