import React, { useState, useMemo, useCallback } from "react";
import { usePluginData, usePluginAction, useHostContext, usePluginToast } from "@paperclipai/plugin-sdk/ui";

// ─── Helpers ───
const TAG_COLORS: Record<string, string> = { "Seus Direitos": "#10b981", "Consulta Processual": "#3b82f6", "Jus IA": "#8b5cf6", "Employer Branding": "#f59e0b", "Institucional": "#ec4899" };
function tc(tag: string | null) { return TAG_COLORS[tag || ""] || "hsl(var(--muted-foreground))"; }
function fmtDate(s: string | null) { if (!s) return ""; return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); }
function reviewBadge(status: string | null | undefined): [string, string] {
  switch (status) { case "approved": return ["Aprovado", "text-green-500 bg-green-500/10"]; case "rejected": return ["Reprovado", "text-red-500 bg-red-500/10"]; case "changes_requested": return ["Alterações", "text-yellow-500 bg-yellow-500/10"]; default: return ["Pendente", "text-muted-foreground bg-muted/50"]; }
}

function Tag({ label }: { label: string }) {
  const c = tc(label);
  return <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border" style={{ color: c, borderColor: `${c}44`, background: `${c}12` }}>{label}</span>;
}

// ─── Radar Chart ───
function RadarChart({ score }: { score: { brand: number; clarity: number; hook: number; accuracy: number; actionability: number; average: number } }) {
  const dims = ["brand", "clarity", "hook", "accuracy", "actionability"] as const;
  const labels = ["Brand", "Clareza", "Gancho", "Precisão", "Ação"];
  const cx = 100, cy = 100, r = 70, step = (2 * Math.PI) / 5;
  const pts = dims.map((d, i) => { const a = i * step - Math.PI / 2; const v = (score[d] || 0) / 10; return { x: cx + r * v * Math.cos(a), y: cy + r * v * Math.sin(a) }; });
  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[200px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map(l => <polygon key={l} points={dims.map((_, i) => { const a = i * step - Math.PI / 2; return `${cx + r * l * Math.cos(a)},${cy + r * l * Math.sin(a)}`; }).join(" ")} fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />)}
      {dims.map((_, i) => { const a = i * step - Math.PI / 2; return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="hsl(var(--border))" strokeWidth="0.5" />; })}
      <polygon points={pts.map(p => `${p.x},${p.y}`).join(" ")} fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" />)}
      {dims.map((d, i) => { const a = i * step - Math.PI / 2; return <text key={i} x={cx + (r + 16) * Math.cos(a)} y={cy + (r + 16) * Math.sin(a)} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--muted-foreground))" fontSize="8">{labels[i]} ({(score[d] || 0).toFixed(1)})</text>; })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--primary))" fontSize="16" fontWeight="bold">{score.average.toFixed(1)}</text>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN PAGE: Content Review Board (Kanban)
// ════════════════════════════════════════════════════════════

export function ContentReviewPage() {
  const ctx = useHostContext();
  const companyId = ctx?.companyId;
  const { data: issues, loading, refresh } = usePluginData<any[]>("board-issues", { companyId });
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const columns = [
    { key: "backlog", label: "Backlog", cls: "text-muted-foreground" },
    { key: "todo", label: "A Produzir", cls: "text-blue-400" },
    { key: "in_progress", label: "Em Produção", cls: "text-yellow-400" },
    { key: "in_review", label: "Review", cls: "text-purple-400" },
    { key: "done", label: "Aprovado", cls: "text-green-400" },
  ];

  const filtered = useMemo(() => {
    if (!issues) return [];
    return issues.filter((i: any) => {
      if (filter !== "all" && i.editoria !== filter) return false;
      if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [issues, filter, search]);

  const editorias = useMemo(() => issues ? Array.from(new Set(issues.map((i: any) => i.editoria).filter(Boolean))) as string[] : [], [issues]);

  if (!companyId) return <div className="p-8 text-muted-foreground">Selecione uma empresa.</div>;

  return (
    <div className="p-4 md:p-6 min-h-screen">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Content Review Board</h1>
        <p className="text-sm text-muted-foreground mt-1">Visualize, aprove e gerencie conteúdo produzido pelos agentes.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
          className="h-9 w-full max-w-[220px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none" />
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${filter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:bg-accent"}`}>Todas</button>
        {editorias.map(ed => (
          <button key={ed} onClick={() => setFilter(ed)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${filter === ed ? "border-primary/50 bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-accent"}`}>{ed}</button>
        ))}
        <button onClick={() => refresh()} className="ml-auto px-3 py-1.5 rounded-md text-xs border border-input text-muted-foreground hover:bg-accent transition-colors">Atualizar</button>
      </div>

      {/* Kanban */}
      {loading ? <div className="text-center text-muted-foreground text-sm py-12">Carregando...</div> : (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {columns.map(col => {
            const items = filtered.filter((i: any) => i.status === col.key);
            return (
              <div key={col.key} className="min-w-[260px] max-w-[300px] flex-1">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={`font-semibold text-[13px] ${col.cls}`}>{col.label}</span>
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${col.cls} bg-current/10`} style={{ background: undefined }}>{items.length}</span>
                </div>
                <div className="space-y-2">
                  {!items.length ? <div className="rounded-lg border border-dashed border-border text-center text-muted-foreground text-xs p-6">Vazio</div>
                  : items.map((issue: any) => {
                    const [bLabel, bCls] = reviewBadge(issue.review?.status);
                    return (
                      <div key={issue.id} className="rounded-lg border border-border bg-card p-3 shadow-sm hover:border-primary/30 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          {issue.editoria && <Tag label={issue.editoria} />}
                          <span className={`text-[10px] font-semibold ${issue.priority === "high" ? "text-red-400" : "text-muted-foreground"}`}>{issue.priority}</span>
                        </div>
                        <div className="text-[13px] font-semibold leading-snug mb-2">JUS-{issue.issueNumber} {issue.title.replace(/^\[[^\]]+\]\s*/, "")}</div>
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            {issue.publishDate && <span className="text-[10px] text-muted-foreground">{fmtDate(issue.publishDate)}</span>}
                            {issue.channel && <span className="text-[9px] text-muted-foreground bg-muted/50 px-1 py-0.5 rounded">{issue.channel.includes("Instagram") ? "IG" : issue.channel.includes("LinkedIn") ? "LI" : issue.channel}</span>}
                          </div>
                          {issue.review?.status && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${bCls}`}>{bLabel}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ISSUE DETAIL TAB: Preview & Review
// ════════════════════════════════════════════════════════════

export function ContentReviewIssueTab() {
  const ctx = useHostContext();
  const companyId = ctx?.companyId;
  const issueId = ctx?.entityId;
  const { data, loading, refresh } = usePluginData<any>("issue-review-detail", { issueId, companyId });
  const approveAction = usePluginAction("approve");
  const rejectAction = usePluginAction("reject");
  const requestChangesAction = usePluginAction("request-changes");
  const addCommentAction = usePluginAction("add-comment");
  const toast = usePluginToast();
  const [note, setNote] = useState("");
  const [commentText, setCommentText] = useState("");
  const [acting, setActing] = useState(false);

  const act = useCallback(async (action: any, params: any, msg: string) => {
    setActing(true);
    try { await action(params); toast?.({ title: msg, tone: "success" }); setNote(""); refresh(); }
    catch (e: any) { toast?.({ title: "Erro", body: e.message, tone: "error" }); }
    finally { setActing(false); }
  }, [toast, refresh]);

  if (!issueId || !companyId) return <div className="p-4 text-muted-foreground text-sm">Selecione uma issue.</div>;
  if (loading) return <div className="p-4 text-muted-foreground text-sm">Carregando...</div>;
  if (!data) return <div className="p-4 text-muted-foreground text-sm">Dados não encontrados.</div>;

  const { issue, comments, review, criticScore, attachments } = data;
  const [bLabel, bCls] = reviewBadge(review?.status);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-base font-bold">Preview & Review</h3>
        {issue.editoria && <Tag label={issue.editoria} />}
        {review?.status && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${bCls}`}>{bLabel}</span>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: Metadata */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="text-[11px] font-bold text-muted-foreground tracking-wider mb-2">DETALHES</div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <span className="text-muted-foreground">Data:</span><span>{issue.publishDate || "N/A"}</span>
              <span className="text-muted-foreground">Canal:</span><span>{issue.channel || "N/A"}</span>
              <span className="text-muted-foreground">Editoria:</span><span>{issue.editoria || "N/A"}</span>
              <span className="text-muted-foreground">Prioridade:</span><span>{issue.priority}</span>
              <span className="text-muted-foreground">Status:</span><span>{issue.status}</span>
            </div>
          </div>
        </div>

        {/* Right: Score + Actions */}
        <div className="space-y-4">
          {criticScore && (
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm text-center">
              <div className="text-[11px] font-bold text-muted-foreground tracking-wider mb-2 text-left">SCORE DO CRITIC</div>
              <RadarChart score={criticScore} />
              <div className={`mt-2 text-sm font-bold ${criticScore.average >= 8 ? "text-green-500" : "text-yellow-500"}`}>
                Media: {criticScore.average.toFixed(1)}/10 {criticScore.average >= 8 ? "- Aprovado pelo Critic" : "- Requer atenção"}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="text-[11px] font-bold text-muted-foreground tracking-wider mb-3">DECISÃO</div>
            <textarea placeholder="Nota de review..." value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full min-h-[60px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm mb-3 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none" />
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => act(approveAction, { issueId, companyId, note }, "Aprovado")} disabled={acting}
                className="inline-flex items-center rounded-md text-xs font-medium h-8 px-3 border border-green-500/30 text-green-500 bg-green-500/10 hover:bg-green-500/20 disabled:opacity-50">Aprovar</button>
              <button onClick={() => { if (!note.trim()) { toast?.({ title: "Descreva as alterações", tone: "error" }); return; } act(requestChangesAction, { issueId, companyId, note }, "Alterações solicitadas"); }} disabled={acting}
                className="inline-flex items-center rounded-md text-xs font-medium h-8 px-3 border border-yellow-500/30 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 disabled:opacity-50">Pedir Alterações</button>
              <button onClick={() => { if (!note.trim()) { toast?.({ title: "Justifique a reprovação", tone: "error" }); return; } act(rejectAction, { issueId, companyId, note }, "Reprovado"); }} disabled={acting}
                className="inline-flex items-center rounded-md text-xs font-medium h-8 px-3 border border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50">Reprovar</button>
            </div>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="text-[11px] font-bold text-muted-foreground tracking-wider mb-3">COMENTÁRIOS ({comments?.length || 0})</div>
        <div className="max-h-[300px] overflow-y-auto space-y-2 mb-3">
          {(comments || []).map((c: any) => {
            const isReview = c.body.includes("[REVIEW]") || c.body.includes("[APROVADO]") || c.body.includes("[REPROVADO]");
            return (
              <div key={c.id} className={`p-2.5 rounded-lg text-sm border ${isReview ? "border-primary/30 bg-primary/5" : c.authorAgentId ? "border-border bg-accent/20" : "border-border bg-background"}`}>
                <div className="flex justify-between mb-1">
                  <span className={`font-semibold text-[11px] ${c.authorAgentId ? "text-purple-400" : "text-primary"}`}>{c.authorAgentId ? "Agente" : "Humano"}</span>
                  <span className="text-[10px] text-muted-foreground">{fmtDate(c.createdAt)}</span>
                </div>
                <div className="text-foreground leading-relaxed whitespace-pre-wrap">{c.body}</div>
              </div>
            );
          })}
          {!comments?.length && <div className="text-muted-foreground text-xs text-center py-4">Nenhum comentário.</div>}
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="Adicionar comentário de review..." value={commentText} onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && commentText.trim()) { addCommentAction({ issueId, companyId, body: commentText }); toast?.({ title: "Comentário adicionado", tone: "success" }); setCommentText(""); refresh(); } }}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none" />
          <button onClick={() => { if (commentText.trim()) { addCommentAction({ issueId, companyId, body: commentText }); toast?.({ title: "Enviado", tone: "success" }); setCommentText(""); refresh(); } }}
            className="inline-flex items-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90">Enviar</button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DASHBOARD WIDGET
// ════════════════════════════════════════════════════════════

export function ContentReviewDashboardWidget() {
  const ctx = useHostContext();
  const { data, loading } = usePluginData<any>("dashboard-metrics", { companyId: ctx?.companyId });
  if (loading || !data) return <div><div className="text-sm font-bold">Content Review</div><div className="text-xs text-muted-foreground mt-1">Carregando...</div></div>;
  const pct = data.weeklyTarget > 0 ? Math.min(100, (data.thisWeekDone / data.weeklyTarget) * 100) : 0;
  return (
    <div>
      <div className="text-sm font-bold mb-3">Content Review</div>
      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1"><span>Meta: {data.thisWeekDone}/{data.weeklyTarget}</span><span>{pct.toFixed(0)}%</span></div>
        <div className="h-1.5 bg-accent/30 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "#10b981" : "hsl(var(--primary))" }} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[["Em Review", data.pendingReview, "text-purple-400"], ["Aprovados", data.approved, "text-green-400"], ["Alterações", data.changesRequested, "text-yellow-400"], ["Score", data.averageScore?.toFixed(1) || "-", data.averageScore >= 8 ? "text-green-400" : "text-yellow-400"]].map(([l, v, c]) => (
          <div key={l as string} className="bg-accent/20 rounded-lg p-2">
            <div className={`text-lg font-bold ${c}`}>{v}</div>
            <div className="text-[10px] text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════════════════════

export function ContentReviewSidebar({ context }: { context?: any }) {
  const prefix = context?.companyPrefix || "";
  const href = prefix ? `/${prefix}/content-review` : "/content-review";
  const isActive = typeof window !== "undefined" && window.location.pathname.includes("content-review");
  return (
    <a href={href} className={`flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "bg-accent text-foreground" : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"}`}>
      <span className="relative shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg></span>
      Content Review
    </a>
  );
}

// ════════════════════════════════════════════════════════════
// COMMENT ANNOTATION
// ════════════════════════════════════════════════════════════

export function ContentReviewCommentAnnotation() {
  const ctx = useHostContext();
  const { data } = usePluginData<any>("comment-review-context", { issueId: ctx?.parentEntityId, commentId: ctx?.entityId, companyId: ctx?.companyId });
  if (!data) return null;
  if (data.score) {
    const avg = data.score.average;
    const cls = avg >= 8 ? "text-green-500 border-green-500/30 bg-green-500/10" : avg >= 6 ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/10" : "text-red-500 border-red-500/30 bg-red-500/10";
    return (
      <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded border text-[11px] ${cls}`}>
        <span className="font-bold">Score: {avg.toFixed(1)}/10</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">B:{data.score.brand.toFixed(0)} C:{data.score.clarity.toFixed(0)} G:{data.score.hook.toFixed(0)} P:{data.score.accuracy.toFixed(0)} A:{data.score.actionability.toFixed(0)}</span>
      </div>
    );
  }
  if (data.isReviewComment) return <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-[10px] text-primary font-semibold">REVIEW HUMANO</div>;
  return null;
}
