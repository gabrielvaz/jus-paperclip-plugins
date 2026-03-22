import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  usePluginData,
  usePluginAction,
  useHostContext,
  usePluginToast,
} from "@paperclipai/plugin-sdk/ui";

// ─── Helpers ───
function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function fmtTime(ts: string): string {
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
const RC: Record<string, string> = { ceo: "#8b5cf6", researcher: "#3b82f6", designer: "#10b981", qa: "#f59e0b", engineer: "#6366f1" };
const TC: Record<string, string> = { "Seus Direitos": "#10b981", "Consulta Processual": "#3b82f6", "Jus IA": "#8b5cf6", "Employer Branding": "#f59e0b", "Institucional": "#ec4899" };
function rc(role?: string) { return RC[role || ""] || "hsl(var(--muted-foreground))"; }
function tc(tag: string) { return TC[tag] || "hsl(var(--muted-foreground))"; }
function renderBody(text: string): React.ReactNode {
  return text.split(/(@[\w\s]+?)(?=\s|$|[,.])/g).map((part, i) =>
    part.startsWith("@") ? <span key={i} className="font-semibold text-primary bg-primary/10 px-0.5 rounded">{part}</span> : <span key={i}>{part}</span>
  );
}

// ─── Reusable components ───
function Avatar({ name, role, size = "w-9 h-9 text-sm" }: { name: string; role?: string; size?: string }) {
  return <div className={`${size} rounded-full border-2 flex items-center justify-center font-bold shrink-0`} style={{ borderColor: rc(role), color: rc(role), background: `${rc(role)}15` }}>{name.charAt(0)}</div>;
}
function Tag({ label }: { label: string }) {
  const c = tc(label);
  return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border" style={{ color: c, borderColor: `${c}44`, background: `${c}12` }}>{label}</span>;
}
function TypeBadge({ type }: { type: string }) {
  const m: Record<string, [string, string]> = { approval: ["APROVAÇÃO", "text-green-400 bg-green-400/10 border-green-400/30"], report: ["REPORT", "text-blue-400 bg-blue-400/10 border-blue-400/30"], question: ["PERGUNTA", "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"] };
  const v = m[type]; if (!v) return null;
  return <span className={`text-[9px] font-bold tracking-wide px-1.5 py-0.5 rounded border ${v[1]}`}>{v[0]}</span>;
}

// ─── Dropdown Filter ───
function DropdownFilter({ label, value, options, onChange }: {
  label: string; value: string; options: Array<{ key: string; label: string; color?: string }>; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.key === value);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-input text-xs font-medium hover:bg-accent transition-colors">
        {selected?.color && <span className="w-2 h-2 rounded-full" style={{ background: selected.color }} />}
        <span className="text-muted-foreground">{label}:</span>
        <span>{selected?.label || "Todos"}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4l3 3 3-3" /></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-20 min-w-[160px] max-h-[240px] overflow-y-auto p-1">
            {options.map(o => (
              <button key={o.key} onClick={() => { onChange(o.key); setOpen(false); }}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded text-xs text-left transition-colors ${value === o.key ? "bg-accent font-semibold" : "hover:bg-accent/50"}`}>
                {o.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: o.color }} />}
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Message ───
function Message({ msg, onOpenThread, compact }: { msg: any; onOpenThread?: (id: string) => void; compact?: boolean }) {
  if (msg.type === "system") return (
    <div className="flex items-center gap-2 px-4 py-1 text-[11px] text-muted-foreground border-l-2 border-border">
      <span className="font-semibold">SYS</span><span className="flex-1">{msg.body}</span><span className="text-[10px]">{timeAgo(msg.timestamp)}</span>
    </div>
  );
  const isApproval = msg.type === "approval";
  const borderClass = isApproval ? (msg.body.includes("[APROVADO]") ? "border-l-green-500" : msg.body.includes("[REPROVADO]") ? "border-l-red-500" : "border-l-yellow-500") : "border-l-transparent";
  return (
    <div className={`flex gap-3 px-4 ${compact ? "py-1.5" : "py-2.5"} border-l-[3px] ${borderClass} hover:bg-accent/30 transition-colors`}>
      <Avatar name={msg.authorName} role={msg.authorRole} size={compact ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm"} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-[13px]" style={{ color: rc(msg.authorRole) }}>{msg.authorName}</span>
          {msg.authorRole && <span className="text-[10px] text-muted-foreground px-1 rounded" style={{ background: `${rc(msg.authorRole)}10` }}>{msg.authorRole}</span>}
          <TypeBadge type={msg.type} />
          {(msg.tags || []).map((t: string) => <Tag key={t} label={t} />)}
          <span className="text-[10px] text-muted-foreground ml-auto">{fmtTime(msg.timestamp)}</span>
        </div>
        {msg.issueNumber && !compact && (
          <div className="text-[11px] text-muted-foreground mt-0.5">
            <span className="text-primary underline cursor-pointer" onClick={() => onOpenThread?.(msg.issueId)}>JUS-{msg.issueNumber}</span>
            {" "}{msg.issueTitle?.replace(/^\[[^\]]+\]\s*/, "").substring(0, 60)}
          </div>
        )}
        <div className="text-[13px] text-foreground leading-relaxed mt-1 whitespace-pre-wrap break-words">{renderBody(msg.body)}</div>
      </div>
    </div>
  );
}

// ─── Composer ───
function Composer({ agents, onSend, placeholder, issueId }: { agents: any[]; onSend: (body: string, issueId?: string) => void; placeholder?: string; issueId?: string }) {
  const [text, setText] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const filtered = useMemo(() => !mentionFilter ? agents : agents.filter((a: any) => a.name.toLowerCase().includes(mentionFilter.toLowerCase())), [agents, mentionFilter]);
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value; setText(v);
    const at = v.lastIndexOf("@");
    if (at >= 0 && (at === v.length - 1 || !v.slice(at + 1).includes(" "))) { setShowMentions(true); setMentionFilter(v.slice(at + 1)); }
    else setShowMentions(false);
  }, []);
  const insertMention = useCallback((name: string) => { setText(t => t.slice(0, t.lastIndexOf("@")) + `@${name} `); setShowMentions(false); ref.current?.focus(); }, []);
  const handleSend = useCallback(() => { if (!text.trim()) return; onSend(text.trim(), issueId); setText(""); setShowMentions(false); }, [text, onSend, issueId]);
  return (
    <div className="relative p-3 border-t border-border bg-card">
      {showMentions && filtered.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 bg-popover border border-border rounded-lg p-1 max-h-48 overflow-y-auto shadow-lg z-10">
          {filtered.map((a: any) => (
            <div key={a.id} onClick={() => insertMention(a.name)} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent text-sm">
              <Avatar name={a.name} role={a.role} size="w-6 h-6 text-[10px]" />
              <span className="font-semibold" style={{ color: rc(a.role) }}>{a.name}</span>
              <span className="text-[11px] text-muted-foreground">{a.role}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <textarea ref={ref} value={text} onChange={handleInput} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={placeholder || "Mensagem... (@ para mencionar, Shift+Enter nova linha)"}
          rows={1} className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none" />
        <button onClick={handleSend} disabled={!text.trim()}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none shrink-0">
          Enviar
        </button>
      </div>
    </div>
  );
}

// ─── Lazy Image (loads base64 via action) ───
function LazyImage({ attachmentId, alt, className }: { attachmentId: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const getImage = usePluginAction("get-image");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getImage({ attachmentId }) as any;
        if (!cancelled && result?.dataUrl) setSrc(result.dataUrl);
      } catch { /* skip */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [attachmentId, getImage]);

  if (loading) return <div className={`${className || ""} bg-accent/20 animate-pulse flex items-center justify-center text-muted-foreground text-xs`}>Carregando...</div>;
  if (!src) return <div className={`${className || ""} bg-accent/10 flex items-center justify-center text-muted-foreground text-xs`}>Erro</div>;
  return <img src={src} alt={alt} className={className} loading="lazy" />;
}

// ════════════════════════════════════════════════════════════
// PAGE 1: TIMELINE
// ════════════════════════════════════════════════════════════

export function TimelinePage() {
  const ctx = useHostContext();
  const companyId = ctx?.companyId;
  const toast = usePluginToast();
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [threadIssueId, setThreadIssueId] = useState<string | null>(null);

  const { data: agents } = usePluginData<any[]>("agents", { companyId });
  const { data: timeline, loading: tlLoading, refresh: refreshTl } = usePluginData<any[]>("timeline", { companyId, filterAgent, filterType, filterTag, limit: 150 });
  const { data: thread, refresh: refreshThread } = usePluginData<any>("thread", { issueId: threadIssueId, companyId });

  const sendMessage = usePluginAction("send-message");
  const sendBroadcast = usePluginAction("send-broadcast");
  const handleSend = useCallback(async (body: string, issueId?: string) => {
    if (!companyId) return;
    try {
      if (issueId) await sendMessage({ companyId, issueId, body });
      else await sendBroadcast({ companyId, body });
      toast?.({ title: "Mensagem enviada", tone: "success" });
      refreshTl(); if (threadIssueId) refreshThread();
    } catch (e: any) { toast?.({ title: "Erro", body: e.message, tone: "error" }); }
  }, [companyId, sendMessage, sendBroadcast, toast, refreshTl, refreshThread, threadIssueId]);

  const tags = useMemo(() => {
    if (!timeline) return [];
    const s = new Set<string>();
    for (const e of timeline) for (const t of (e.tags || [])) s.add(t);
    return Array.from(s);
  }, [timeline]);

  const agentOptions = useMemo(() => [
    { key: "all", label: "Todos" },
    { key: "human", label: "Board (humano)", color: "hsl(var(--primary))" },
    ...(agents || []).map((a: any) => ({ key: a.id, label: a.name, color: rc(a.role) })),
  ], [agents]);

  const typeOptions = [
    { key: "all", label: "Todos" },
    { key: "chat", label: "Chat" },
    { key: "approval", label: "Aprovação" },
    { key: "report", label: "Report" },
    { key: "question", label: "Pergunta" },
    { key: "system", label: "Sistema" },
  ];

  const tagOptions = useMemo(() => [
    { key: "all", label: "Todas" },
    ...tags.map(t => ({ key: t, label: t, color: tc(t) })),
  ], [tags]);

  if (!companyId) return <div className="p-8 text-muted-foreground">Selecione uma empresa.</div>;

  return (
    <div className="flex flex-col h-full text-foreground overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
        <span className="text-sm font-semibold mr-2">Timeline</span>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <DropdownFilter label="Agente" value={filterAgent} options={agentOptions} onChange={setFilterAgent} />
        <DropdownFilter label="Tipo" value={filterType} options={typeOptions} onChange={setFilterType} />
        {tags.length > 0 && <DropdownFilter label="Editoria" value={filterTag} options={tagOptions} onChange={setFilterTag} />}
        <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline">{timeline?.length || 0} mensagens</span>
        <button onClick={() => refreshTl()} className="p-1.5 rounded-md border border-input text-muted-foreground hover:bg-accent transition-colors" title="Atualizar">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56" /><polyline points="21 3 21 9 15 9" /></svg>
        </button>
      </div>

      {/* Two-panel: messages + optional thread */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          <div className="flex-1 overflow-y-auto flex flex-col-reverse">
            {tlLoading ? <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
            : !timeline?.length ? <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma mensagem. Envie algo ou mencione um agente com @.</div>
            : [...timeline].reverse().map((m: any) => <Message key={m.id} msg={m} onOpenThread={setThreadIssueId} />)}
          </div>
          <Composer agents={agents || []} onSend={handleSend} />
        </div>

        {/* Thread panel */}
        {threadIssueId && (
          <div className="w-full md:w-[340px] lg:w-[380px] shrink-0 bg-card border-l border-border flex flex-col overflow-hidden absolute md:relative right-0 z-10 h-full">
            <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
              <span className="text-sm font-bold flex-1">Thread {thread?.issue ? `JUS-${thread.issue.issueNumber}` : ""}</span>
              <button onClick={() => setThreadIssueId(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none px-1">x</button>
            </div>
            {thread?.issue && <div className="px-3 py-2 border-b border-border text-xs"><div className="font-semibold">{thread.issue.title}</div><div className="text-muted-foreground mt-0.5">Status: {thread.issue.status}</div></div>}
            <div className="flex-1 overflow-y-auto">
              {thread?.messages?.map((m: any) => <Message key={m.id} msg={m} compact />)}
              {!thread?.messages?.length && <div className="p-6 text-center text-muted-foreground text-xs">Nenhuma mensagem.</div>}
            </div>
            <Composer agents={agents || []} onSend={handleSend} issueId={threadIssueId} placeholder={`Responder JUS-${thread?.issue?.issueNumber || ""}...`} />
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PAGE 2: GALERIA (Feed de carrosséis para aprovação)
// ════════════════════════════════════════════════════════════

const REJECTION_REASONS = [
  { key: "off_brand", label: "Fora do padrão de marca" },
  { key: "wrong_tone", label: "Tom inadequado para o público" },
  { key: "weak_hook", label: "Gancho fraco — não gera curiosidade" },
  { key: "legal_error", label: "Erro jurídico ou imprecisão" },
  { key: "visual_issue", label: "Problemas visuais (cores, tipografia, layout)" },
  { key: "copy_issue", label: "Copy precisa de ajustes" },
  { key: "missing_cta", label: "CTA ausente ou genérico" },
  { key: "wrong_format", label: "Formato ou dimensão incorreta" },
];

function RejectModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reasons: string[], note: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const toggle = (key: string) => setSelected(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key]);
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="text-base font-bold">Reprovar carrossel</h3>
          <p className="text-xs text-muted-foreground mt-1">Selecione os motivos e descreva o que o agente deve corrigir na próxima versão.</p>
        </div>
        <div className="space-y-1.5">
          {REJECTION_REASONS.map(r => (
            <button key={r.key} onClick={() => toggle(r.key)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-left transition-colors border ${selected.includes(r.key) ? "border-red-500/50 bg-red-500/10 text-foreground font-medium" : "border-border hover:bg-accent/50 text-muted-foreground"}`}>
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-[10px] shrink-0 ${selected.includes(r.key) ? "border-red-500 bg-red-500 text-white" : "border-muted-foreground/40"}`}>
                {selected.includes(r.key) && "x"}
              </span>
              {r.label}
            </button>
          ))}
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Direcionamento para o agente criar nova versão..." rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm border border-input text-muted-foreground hover:bg-accent">Cancelar</button>
          <button onClick={() => { if (selected.length || note.trim()) onSubmit(selected, note); }}
            disabled={!selected.length && !note.trim()}
            className="px-4 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-50">
            Reprovar e enviar feedback
          </button>
        </div>
      </div>
    </div>
  );
}

// Carousel slider for multiple images within one issue
function CarouselSlider({ images }: { images: Array<{ id: string; filename: string }> }) {
  const [current, setCurrent] = useState(0);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const total = images.length;
  const prev = () => setCurrent(c => (c - 1 + total) % total);
  const next = () => setCurrent(c => (c + 1) % total);

  return (
    <>
      <div className="relative bg-accent/5">
        {/* Image */}
        <div className="cursor-pointer" onClick={() => setLightboxId(images[current].id)}>
          <LazyImage attachmentId={images[current].id} alt={images[current].filename} className="w-full max-h-[500px] object-contain" />
        </div>
        {/* Navigation arrows */}
        {total > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </>
        )}
        {/* Dots + counter */}
        {total > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
            <span className="text-[10px] text-white bg-black/50 px-2 py-0.5 rounded-full font-medium">{current + 1} / {total}</span>
          </div>
        )}
      </div>
      {/* Thumbnail strip */}
      {total > 1 && (
        <div className="flex gap-1 px-3 py-2 overflow-x-auto border-t border-border bg-accent/5">
          {images.map((img, i) => (
            <button key={img.id} onClick={() => setCurrent(i)}
              className={`shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors ${i === current ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
              <LazyImage attachmentId={img.id} alt={img.filename} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {/* Lightbox */}
      {lightboxId && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 cursor-pointer p-4" onClick={() => setLightboxId(null)}>
          <LazyImage attachmentId={lightboxId} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}

// Feed card for a carousel (grouped by issue)
function CarouselFeedCard({ carousel, companyId, companyPrefix, onRefresh }: { carousel: any; companyId: string; companyPrefix?: string; onRefresh: () => void }) {
  const [showReject, setShowReject] = useState(false);
  const [acting, setActing] = useState(false);
  const approveAction = usePluginAction("approve-piece");
  const rejectAction = usePluginAction("reject-piece");
  const toast = usePluginToast();

  const handleApprove = useCallback(async () => {
    setActing(true);
    try {
      await approveAction({ issueId: carousel.issueId, companyId, note: "Carrossel aprovado para publicação." });
      toast?.({ title: "Carrossel aprovado", tone: "success" });
      onRefresh();
    } catch (e: any) { toast?.({ title: "Erro", body: e.message, tone: "error" }); }
    setActing(false);
  }, [approveAction, carousel, companyId, toast, onRefresh]);

  const handleReject = useCallback(async (reasons: string[], note: string) => {
    setActing(true);
    const reasonLabels = reasons.map(r => REJECTION_REASONS.find(rr => rr.key === r)?.label || r);
    try {
      await rejectAction({ issueId: carousel.issueId, companyId, reasons: reasonLabels, note });
      toast?.({ title: "Feedback enviado ao agente", tone: "success" });
      setShowReject(false);
      onRefresh();
    } catch (e: any) { toast?.({ title: "Erro", body: e.message, tone: "error" }); }
    setActing(false);
  }, [rejectAction, carousel, companyId, toast, onRefresh]);

  const statusBadge = carousel.reviewStatus === "approved"
    ? "text-green-500 bg-green-500/10 border-green-500/30"
    : carousel.reviewStatus === "rejected"
    ? "text-red-500 bg-red-500/10 border-red-500/30"
    : "text-muted-foreground bg-muted/50 border-border";
  const statusLabel = carousel.reviewStatus === "approved" ? "Aprovado" : carousel.reviewStatus === "rejected" ? "Reprovado" : "Aguardando revisão";
  const typeLabel = carousel.images.length > 1 ? `Carrossel — ${carousel.images.length} cards` : "Card único";

  return (
    <>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
          <Avatar name={carousel.agentName || "Designer"} role="designer" size="w-8 h-8 text-xs" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm" style={{ color: rc("designer") }}>{carousel.agentName}</span>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${statusBadge}`}>{statusLabel}</span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
              <span className="font-medium">JUS-{carousel.issueNumber}</span>
              {carousel.tag && <Tag label={carousel.tag} />}
              <span>{timeAgo(carousel.timestamp)}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-3 border-b border-border space-y-1.5">
          <div className="text-sm font-semibold">{carousel.issueTitle?.replace(/^\[[^\]]+\]\s*/, "")}</div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">Tipo:</span> {typeLabel}
          </div>
          {carousel.description && (
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{carousel.description}</p>
          )}
        </div>

        {/* Carousel */}
        <CarouselSlider images={carousel.images} />

        {/* Actions */}
        <div className="px-4 py-3 flex items-center gap-2 border-t border-border flex-wrap">
          {carousel.reviewStatus !== "approved" && carousel.reviewStatus !== "rejected" && (
            <>
              <button onClick={handleApprove} disabled={acting}
                className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium h-9 px-4 border border-green-500/30 text-green-500 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                Aprovar carrossel
              </button>
              <button onClick={() => setShowReject(true)} disabled={acting}
                className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium h-9 px-4 border border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                Reprovar
              </button>
            </>
          )}
          {carousel.reviewStatus === "approved" && (
            <span className="text-xs text-green-500 font-medium flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              Aprovado para publicação
            </span>
          )}
          {carousel.reviewStatus === "rejected" && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-red-400 flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                Reprovado — feedback enviado ao agente
              </span>
              <a href={`/${companyPrefix || "JUS"}/issues/JUS-${carousel.issueNumber}`}
                className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium h-8 px-3 border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Ver issue JUS-{carousel.issueNumber}
              </a>
            </div>
          )}
        </div>
      </div>

      {showReject && <RejectModal onClose={() => setShowReject(false)} onSubmit={handleReject} />}
    </>
  );
}

export function GalleryPage() {
  const ctx = useHostContext();
  const companyId = ctx?.companyId;
  const { data: carousels, loading: galLoading, refresh: refreshGal } = usePluginData<any[]>("gallery", { companyId });
  const [galFilter, setGalFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const galTags = useMemo(() => Array.from(new Set((carousels || []).map((c: any) => c.tag).filter(Boolean))), [carousels]);
  const filtered = useMemo(() => {
    return (carousels || []).filter((c: any) => {
      if (galFilter !== "all" && c.tag !== galFilter) return false;
      if (statusFilter === "pending" && c.reviewStatus !== "pending") return false;
      if (statusFilter === "approved" && c.reviewStatus !== "approved") return false;
      if (statusFilter === "rejected" && c.reviewStatus !== "rejected") return false;
      return true;
    });
  }, [carousels, galFilter, statusFilter]);

  const tagOptions = useMemo(() => [
    { key: "all", label: "Todas" },
    ...galTags.map(t => ({ key: t, label: t, color: tc(t) })),
  ], [galTags]);

  const statusOptions = [
    { key: "all", label: "Todos" },
    { key: "pending", label: "Aguardando" },
    { key: "approved", label: "Aprovados" },
    { key: "rejected", label: "Reprovados" },
  ];

  if (!companyId) return <div className="p-8 text-muted-foreground">Selecione uma empresa.</div>;

  return (
    <div className="flex flex-col h-full text-foreground overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
        <span className="text-sm font-semibold mr-2">Galeria</span>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <DropdownFilter label="Editoria" value={galFilter} options={tagOptions} onChange={setGalFilter} />
        <DropdownFilter label="Status" value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
        <span className="text-[11px] text-muted-foreground ml-auto hidden sm:inline">{filtered.length} carrosséis</span>
        <button onClick={() => refreshGal()} className="p-1.5 rounded-md border border-input text-muted-foreground hover:bg-accent transition-colors" title="Atualizar">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56" /><polyline points="21 3 21 9 15 9" /></svg>
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-3 md:p-4 space-y-4">
          {galLoading ? <div className="text-center text-muted-foreground text-sm p-8">Carregando carrosséis...</div>
          : !filtered.length ? <div className="text-center text-muted-foreground text-sm p-12">Nenhum carrossel para revisão.</div>
          : filtered.map((c: any) => <CarouselFeedCard key={c.issueId} carousel={c} companyId={companyId!} companyPrefix={ctx?.companyPrefix || undefined} onRefresh={refreshGal} />)}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SIDEBARS
// ════════════════════════════════════════════════════════════

export function TimelineSidebar({ context }: { context?: any }) {
  const prefix = context?.companyPrefix || "";
  const href = prefix ? `/${prefix}/timeline` : "/timeline";
  const isActive = typeof window !== "undefined" && window.location.pathname.includes("/timeline");
  return (
    <a href={href} className={`flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"}`}>
      <span className="relative shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg></span>
      Timeline
    </a>
  );
}

export function GallerySidebar({ context }: { context?: any }) {
  const prefix = context?.companyPrefix || "";
  const href = prefix ? `/${prefix}/galeria` : "/galeria";
  const isActive = typeof window !== "undefined" && window.location.pathname.includes("/galeria");
  return (
    <a href={href} className={`flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"}`}>
      <span className="relative shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg></span>
      Galeria
    </a>
  );
}

// ════════════════════════════════════════════════════════════
// DASHBOARD WIDGET
// ════════════════════════════════════════════════════════════

export function CreativeHubDashboardWidget() {
  const ctx = useHostContext();
  const { data, loading } = usePluginData<any>("dashboard-feed", { companyId: ctx?.companyId });
  if (loading || !data) return <div><div className="text-sm font-bold">Creative Hub</div><div className="text-xs text-muted-foreground mt-1">Carregando...</div></div>;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold"># Creative Hub</span>
        <span className="text-[11px] text-muted-foreground">{data.totalIssues} issues</span>
      </div>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {(data.agents || []).map((a: any) => (
          <div key={a.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: `${rc(a.role)}10` }}>
            <span className={`w-1.5 h-1.5 rounded-full ${a.status === "running" ? "bg-green-500" : a.status === "idle" ? "bg-yellow-500" : "bg-muted-foreground/40"}`} />
            <span className="font-semibold" style={{ color: rc(a.role) }}>{a.name}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {data.entries.slice(0, 5).map((e: any) => (
          <div key={e.id} className="flex gap-1.5 items-start p-1.5 rounded bg-accent/20 text-[11px]">
            <Avatar name={e.authorName} size="w-5 h-5 text-[8px]" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold" style={{ color: e.authorType === "agent" ? "#8b5cf6" : "hsl(var(--primary))" }}>{e.authorName}</span>
              <span className="text-muted-foreground"> {timeAgo(e.timestamp)}</span>
              <div className="text-muted-foreground truncate">{e.text.substring(0, 80)}</div>
            </div>
          </div>
        ))}
        {!data.entries.length && <div className="text-muted-foreground text-[11px] text-center py-2">Sem atividade recente</div>}
      </div>
    </div>
  );
}
