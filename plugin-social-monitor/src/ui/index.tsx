import React, { useState, useMemo, useCallback } from "react";
import { usePluginData, usePluginAction, useHostContext, usePluginToast } from "@paperclipai/plugin-sdk/ui";

const PLATFORM_META: Record<string, { label: string; color: string; icon: string }> = {
  twitter: { label: "Twitter/X", color: "#1DA1F2", icon: "𝕏" },
  instagram: { label: "Instagram", color: "#E4405F", icon: "IG" },
  tiktok: { label: "TikTok", color: "#00F2EA", icon: "TT" },
  reddit: { label: "Reddit", color: "#FF4500", icon: "R" },
  linkedin: { label: "LinkedIn", color: "#0A66C2", icon: "in" },
};

const SENTIMENT_META: Record<string, { label: string; color: string }> = {
  positive: { label: "Positivo", color: "#10b981" },
  neutral: { label: "Neutro", color: "#94a3b8" },
  negative: { label: "Negativo", color: "#ef4444" },
};

function timeAgo(ts: string): string {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function fmtNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

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

// ─── Mention Card ───
function MentionCard({ mention }: { mention: any }) {
  const pm = PLATFORM_META[mention.platform] || { label: mention.platform, color: "#666", icon: "?" };
  const sm = SENTIMENT_META[mention.sentiment] || SENTIMENT_META.neutral;
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: `${pm.color}22`, color: pm.color }}>
          {pm.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{mention.author}</span>
            <span className="text-xs text-muted-foreground">{mention.authorHandle}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${pm.color}15`, color: pm.color }}>{pm.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${sm.color}15`, color: sm.color }}>{sm.label}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(mention.timestamp)}</span>
          </div>
          {/* Text */}
          <p className="text-sm mt-2 leading-relaxed text-foreground/90">{mention.text}</p>
          {/* Media */}
          {mention.mediaUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border border-border max-w-sm">
              <img src={mention.mediaUrl} alt="" className="w-full h-40 object-cover" loading="lazy" />
            </div>
          )}
          {/* Footer */}
          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              {fmtNum(mention.engagement.likes)}
            </span>
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              {fmtNum(mention.engagement.comments)}
            </span>
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              {fmtNum(mention.engagement.shares)}
            </span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-accent/30 text-foreground/70">
              {mention.category || mention.matchedTerm}
            </span>
            <a href={mention.url} target="_blank" rel="noopener" className="text-primary hover:underline">Ver original</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════

export function SocialMonitorPage() {
  const ctx = useHostContext();
  const companyId = ctx?.companyId;
  const [platform, setPlatform] = useState("all");
  const [sentiment, setSentiment] = useState("all");
  const [term, setTerm] = useState("all");
  const [showTermEditor, setShowTermEditor] = useState(false);

  const { data: feed, loading, refresh } = usePluginData<any[]>("feed", { companyId, platform, sentiment, term });
  const { data: terms } = usePluginData<string[]>("terms", { companyId });
  const { data: stats } = usePluginData<any>("stats", { companyId });
  const updateTerms = usePluginAction("update-terms");
  const toast = usePluginToast();

  const [editTerms, setEditTerms] = useState("");

  const platformOptions = [
    { key: "all", label: "Todas" },
    ...Object.entries(PLATFORM_META).map(([k, v]) => ({ key: k, label: v.label, color: v.color })),
  ];
  const sentimentOptions = [
    { key: "all", label: "Todos" },
    ...Object.entries(SENTIMENT_META).map(([k, v]) => ({ key: k, label: v.label, color: v.color })),
  ];
  const CATEGORY_COLORS: Record<string, string> = { "Jusbrasil": "#10b981", "Jus IA": "#8b5cf6", "Experience": "#f59e0b" };
  const categories = useMemo(() => {
    if (!stats?.byTerm) return [];
    return Object.keys(stats.byTerm).filter(c => stats.byTerm[c] > 0);
  }, [stats]);
  const termOptions = useMemo(() => [
    { key: "all", label: "Todas" },
    ...categories.map(c => ({ key: c, label: c, color: CATEGORY_COLORS[c] })),
  ], [categories]);

  const handleSaveTerms = useCallback(async () => {
    if (!companyId) return;
    const newTerms = editTerms.split("\n").map(t => t.trim()).filter(Boolean);
    try {
      await updateTerms({ companyId, terms: newTerms });
      toast?.({ title: "Termos atualizados", tone: "success" });
      setShowTermEditor(false);
      refresh();
    } catch (e: any) { toast?.({ title: "Erro", body: e.message, tone: "error" }); }
  }, [companyId, editTerms, updateTerms, toast, refresh]);

  if (!companyId) return <div className="p-8 text-muted-foreground">Selecione uma empresa.</div>;

  return (
    <div className="flex flex-col h-full text-foreground overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span className="text-sm font-semibold mr-2">Social Monitor</span>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <DropdownFilter label="Rede" value={platform} options={platformOptions} onChange={setPlatform} />
        <DropdownFilter label="Sentimento" value={sentiment} options={sentimentOptions} onChange={setSentiment} />
        <DropdownFilter label="Categoria" value={term} options={termOptions} onChange={setTerm} />
        <button onClick={() => { setEditTerms((terms || []).join("\n")); setShowTermEditor(true); }}
          className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-input text-muted-foreground hover:bg-accent transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Editar termos
        </button>
        <button onClick={() => refresh()} className="p-1.5 rounded-md border border-input text-muted-foreground hover:bg-accent transition-colors" title="Atualizar">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56" /><polyline points="21 3 21 9 15 9" /></svg>
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-4 flex-wrap text-[11px] bg-card/50">
          <span className="font-semibold text-foreground">{stats.total} menções</span>
          <span className="text-muted-foreground">|</span>
          {Object.entries(stats.byPlatform).map(([p, c]) => (
            <span key={p} className="flex items-center gap-1" style={{ color: PLATFORM_META[p]?.color }}>
              <span className="font-bold">{PLATFORM_META[p]?.icon}</span> {c as number}
            </span>
          ))}
          <span className="text-muted-foreground">|</span>
          <span className="text-green-500">{stats.bySentiment?.positive || 0} positivos</span>
          <span className="text-muted-foreground">{stats.bySentiment?.neutral || 0} neutros</span>
          <span className="text-red-500">{stats.bySentiment?.negative || 0} negativos</span>
          <span className="text-muted-foreground ml-auto">Engajamento total: {fmtNum(stats.totalEngagement)}</span>
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-3 md:p-4 space-y-3">
          {loading ? <div className="text-center text-muted-foreground text-sm p-8">Carregando menções...</div>
          : !(feed || []).length ? <div className="text-center text-muted-foreground text-sm p-12">Nenhuma menção encontrada para esses filtros.</div>
          : (feed || []).map((m: any) => <MentionCard key={m.id} mention={m} />)}
        </div>
      </div>

      {/* Term editor modal */}
      {showTermEditor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowTermEditor(false)}>
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-base font-bold">Termos monitorados</h3>
              <p className="text-xs text-muted-foreground mt-1">Um termo por linha. O monitor busca menções desses termos nas redes sociais.</p>
            </div>
            <textarea value={editTerms} onChange={e => setEditTerms(e.target.value)} rows={8}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none font-mono" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowTermEditor(false)} className="px-4 py-2 rounded-md text-sm border border-input text-muted-foreground hover:bg-accent">Cancelar</button>
              <button onClick={handleSaveTerms} className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">Salvar termos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════

export function SocialMonitorSidebar({ context }: { context?: any }) {
  const prefix = context?.companyPrefix || "";
  const href = prefix ? `/${prefix}/social-monitor` : "/social-monitor";
  const isActive = typeof window !== "undefined" && window.location.pathname.includes("/social-monitor");
  return (
    <a href={href} className={`flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"}`}>
      <span className="relative shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
      Social Monitor
    </a>
  );
}

// ════════════════════════════════════════
// DASHBOARD WIDGET
// ════════════════════════════════════════

export function SocialMonitorWidget() {
  const ctx = useHostContext();
  const { data: stats, loading } = usePluginData<any>("stats", { companyId: ctx?.companyId });
  const { data: feed } = usePluginData<any[]>("feed", { companyId: ctx?.companyId, platform: "all", sentiment: "all", term: "all" });

  if (loading || !stats) return <div><div className="text-sm font-bold">Social Monitor</div><div className="text-xs text-muted-foreground mt-1">Carregando...</div></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold">Social Monitor</span>
        <span className="text-[11px] text-muted-foreground">{stats.total} menções</span>
      </div>
      <div className="flex gap-2 mb-3 flex-wrap">
        {Object.entries(stats.byPlatform).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: `${PLATFORM_META[p]?.color}15`, color: PLATFORM_META[p]?.color }}>
            <span className="font-bold">{PLATFORM_META[p]?.icon}</span> {c as number}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {(feed || []).slice(0, 3).map((m: any) => (
          <div key={m.id} className="flex gap-2 items-start p-1.5 rounded bg-accent/20 text-[11px]">
            <span className="font-bold shrink-0" style={{ color: PLATFORM_META[m.platform]?.color }}>{PLATFORM_META[m.platform]?.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold">{m.author}</span>
              <span className="text-muted-foreground"> {timeAgo(m.timestamp)}</span>
              <div className="text-muted-foreground truncate">{m.text.substring(0, 80)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
