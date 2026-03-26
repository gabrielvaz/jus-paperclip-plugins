import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
function str(val) {
    return String(val ?? "");
}
function num(val, fallback = 0) {
    const n = Number(val);
    return isNaN(n) ? fallback : n;
}
// Parse @mentions from text: @Orchestrator, @Writer Subagent, etc.
function parseMentions(text) {
    const matches = text.match(/@[\w\s]+(?=\s|$|[,.])/g);
    if (!matches)
        return [];
    return matches.map((m) => m.slice(1).trim());
}
// Detect message type from content
function detectMessageType(body) {
    if (body.includes("[APROVADO]") || body.includes("[REPROVADO]") || body.includes("[ALTERACOES]"))
        return "approval";
    if (body.includes("[REPORT]") || body.includes("## Report") || body.includes("## Relatório"))
        return "report";
    if (body.includes("[QUESTION]") || body.includes("?") && body.length < 200)
        return "question";
    if (body.match(/!\[.*\]\(.*\)|\.png|\.jpg|\.jpeg|\.svg|\.webp/i))
        return "image";
    return "chat";
}
// Extract image URLs from markdown
function extractImageUrls(body) {
    const urls = [];
    const mdImages = body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g);
    for (const match of mdImages)
        urls.push(match[1]);
    return urls;
}
// Parse editoria tag from issue title
function parseTag(title) {
    const match = title.match(/^\[([^\]]+)\]/);
    return match ? match[1] : null;
}
const plugin = definePlugin({
    async setup(ctx) {
        // ─── DATA: List all agents ───
        ctx.data.register("agents", async (params) => {
            const companyId = str(params.companyId);
            const agents = await ctx.agents.list({ companyId, limit: 50 });
            return agents.map((a) => ({
                id: a.id,
                name: a.name,
                role: a.role,
                title: a.title || a.role,
                status: a.status,
            }));
        });
        // ─── DATA: Timeline feed ───
        // Merges activity log + issue comments + hub messages into one chronological stream
        ctx.data.register("timeline", async (params) => {
            const companyId = str(params.companyId);
            const rawAgent = params.filterAgent ? str(params.filterAgent) : "all";
            const rawType = params.filterType ? str(params.filterType) : "all";
            const rawTag = params.filterTag ? str(params.filterTag) : "all";
            const filterAgent = rawAgent === "all" ? null : rawAgent;
            const filterType = rawType === "all" ? null : rawType;
            const filterTag = rawTag === "all" ? null : rawTag;
            const limit = num(params.limit, 100);
            // Get agents map
            const agents = await ctx.agents.list({ companyId, limit: 50 });
            const agentMap = new Map();
            for (const a of agents) {
                agentMap.set(a.id, {
                    id: a.id,
                    name: a.name,
                    role: a.role,
                    title: a.title || a.role,
                    status: a.status,
                });
            }
            // Get all issues and their comments
            const issues = await ctx.issues.list({ companyId, limit: 200 });
            const entries = [];
            // Hub messages from plugin state
            try {
                const hubState = await ctx.state.get({
                    scopeKind: "company",
                    scopeId: companyId,
                    namespace: "creative-hub",
                    stateKey: "messages",
                });
                if (hubState && Array.isArray(hubState)) {
                    for (const msg of hubState) {
                        entries.push(msg);
                    }
                }
            }
            catch { /* no hub messages yet */ }
            // Issue comments as timeline entries (limit to 30 most recent to avoid timeout)
            const recentIssues = issues.slice(0, 30);
            for (const issue of recentIssues) {
                const tag = parseTag(issue.title);
                // Filter by tag
                if (filterTag && tag !== filterTag)
                    continue;
                let comments = [];
                try {
                    comments = await ctx.issues.listComments(issue.id, companyId);
                }
                catch {
                    continue;
                }
                for (const c of comments) {
                    const isAgent = !!c.authorAgentId;
                    const agent = isAgent ? agentMap.get(c.authorAgentId) : null;
                    const body = c.body || "";
                    const msgType = detectMessageType(body);
                    // Filter by type
                    if (filterType && filterType !== "all" && msgType !== filterType)
                        continue;
                    // Filter by agent
                    if (filterAgent && filterAgent !== "all") {
                        if (isAgent && c.authorAgentId !== filterAgent)
                            continue;
                        if (!isAgent && filterAgent !== "human")
                            continue;
                    }
                    entries.push({
                        id: c.id,
                        type: msgType,
                        timestamp: String(c.createdAt),
                        authorType: isAgent ? "agent" : "human",
                        authorId: isAgent ? c.authorAgentId : c.authorUserId || null,
                        authorName: agent?.name || (isAgent ? "Agent" : "Board"),
                        authorRole: agent?.role,
                        issueId: issue.id,
                        issueNumber: issue.issueNumber || 0,
                        issueTitle: issue.title,
                        body,
                        imageUrls: extractImageUrls(body),
                        threadId: issue.id,
                        mentions: parseMentions(body),
                        tags: tag ? [tag] : [],
                    });
                }
                // Add issue creation as system event
                entries.push({
                    id: `issue-created-${issue.id}`,
                    type: "system",
                    timestamp: String(issue.createdAt),
                    authorType: "system",
                    authorId: null,
                    authorName: "Sistema",
                    issueId: issue.id,
                    issueNumber: issue.issueNumber || 0,
                    issueTitle: issue.title,
                    body: `Issue criada: ${issue.title}`,
                    imageUrls: [],
                    tags: tag ? [tag] : [],
                    mentions: [],
                });
            }
            // Sort by timestamp descending (newest first)
            entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return entries.slice(0, limit);
        });
        // ─── DATA: Thread (all comments for an issue) ───
        ctx.data.register("thread", async (params) => {
            const issueId = str(params.issueId);
            const companyId = str(params.companyId);
            const issue = await ctx.issues.get(issueId, companyId);
            if (!issue)
                return null;
            const comments = await ctx.issues.listComments(issueId, companyId);
            const agents = await ctx.agents.list({ companyId, limit: 50 });
            const agentMap = new Map();
            for (const a of agents) {
                agentMap.set(a.id, { id: a.id, name: a.name, role: a.role, title: a.title || a.role, status: a.status });
            }
            return {
                issue: {
                    id: issue.id,
                    title: issue.title,
                    status: issue.status,
                    issueNumber: issue.issueNumber || 0,
                    description: issue.description || null,
                },
                messages: comments.map((c) => {
                    const isAgent = !!c.authorAgentId;
                    const agent = isAgent ? agentMap.get(c.authorAgentId) : null;
                    return {
                        id: c.id,
                        type: detectMessageType(c.body || ""),
                        timestamp: String(c.createdAt),
                        authorType: isAgent ? "agent" : "human",
                        authorId: isAgent ? c.authorAgentId : c.authorUserId || null,
                        authorName: agent?.name || (isAgent ? "Agent" : "Board"),
                        authorRole: agent?.role,
                        body: c.body || "",
                        imageUrls: extractImageUrls(c.body || ""),
                        mentions: parseMentions(c.body || ""),
                    };
                }),
            };
        });
        // ─── DATA: Gallery (carousels grouped by issue) ───
        ctx.data.register("gallery", async (params) => {
            const companyId = str(params.companyId);
            const issues = await ctx.issues.list({ companyId, limit: 200 });
            const agents = await ctx.agents.list({ companyId, limit: 50 });
            const agentMap = new Map();
            for (const a of agents)
                agentMap.set(a.id, a.name);
            const apiBase = process.env.PAPERCLIP_API_URL || "http://127.0.0.1:3101";
            const apiKey = process.env.PAPERCLIP_API_KEY || "";
            const headers = {};
            if (apiKey)
                headers["Authorization"] = `Bearer ${apiKey}`;
            const carousels = [];
            for (const issue of issues) {
                // Skip cancelled/discarded issues
                if (issue.status === "cancelled")
                    continue;
                const tag = parseTag(issue.title);
                try {
                    const resp = await fetch(`${apiBase}/api/issues/${issue.id}/attachments`, { headers });
                    if (!resp.ok)
                        continue;
                    const atts = await resp.json();
                    if (!Array.isArray(atts))
                        continue;
                    const imgAtts = atts.filter((a) => a.contentType?.startsWith("image/"));
                    if (imgAtts.length === 0)
                        continue;
                    let reviewStatus = "pending";
                    try {
                        const rs = await ctx.state.get({ scopeKind: "issue", scopeId: issue.id, namespace: "creative-hub", stateKey: "review-status" });
                        if (rs && typeof rs === "string")
                            reviewStatus = rs;
                    }
                    catch { /* pending */ }
                    let agentName = "Designer Subagent";
                    let description = issue.description || "";
                    try {
                        const comments = await ctx.issues.listComments(issue.id, companyId);
                        for (const c of comments) {
                            if (c.authorAgentId) {
                                agentName = agentMap.get(c.authorAgentId) || "Agente";
                                break;
                            }
                        }
                    }
                    catch { /* skip */ }
                    // Clean description for display
                    const descLines = description.split("\n").filter((l) => l.trim() && !l.startsWith("**Pipeline") && !l.includes("Research Subagent") && !l.includes("Writer Subagent") && !l.includes("Critic Subagent") && !l.includes("Output:") && !l.includes("Revisão humana"));
                    const cleanDesc = descLines.slice(0, 6).join("\n").substring(0, 300);
                    carousels.push({
                        issueId: issue.id,
                        issueNumber: issue.issueNumber || 0,
                        issueTitle: issue.title,
                        tag,
                        status: issue.status,
                        reviewStatus,
                        agentName,
                        description: cleanDesc,
                        timestamp: String(imgAtts[0].createdAt || issue.createdAt),
                        images: imgAtts.map((a) => ({
                            id: a.id,
                            filename: a.originalFilename || "",
                            contentType: a.contentType,
                            byteSize: a.byteSize || 0,
                        })),
                    });
                }
                catch { /* skip */ }
            }
            carousels.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return carousels;
        });
        // ─── DATA: Calendar (issues with publish dates) ───
        ctx.data.register("calendar", async (params) => {
            const companyId = str(params.companyId);
            const issues = await ctx.issues.list({ companyId, limit: 100 });
            const events = [];
            for (const issue of issues) {
                const desc = issue.description || "";
                const dateMatch = desc.match(/\*\*Data de publica(?:cao|ção):\*\*\s*(\d{4}-\d{2}-\d{2})/);
                if (!dateMatch)
                    continue;
                const channelMatch = desc.match(/\*\*Canal:\*\*\s*(.+)/);
                events.push({
                    id: issue.id,
                    issueNumber: issue.issueNumber || 0,
                    title: issue.title,
                    date: dateMatch[1],
                    tag: parseTag(issue.title),
                    status: issue.status,
                    channel: channelMatch ? channelMatch[1].trim() : null,
                    priority: issue.priority,
                });
            }
            events.sort((a, b) => a.date.localeCompare(b.date));
            return events;
        });
        // ─── DATA: Metrics (productivity stats) ───
        ctx.data.register("metrics", async (params) => {
            const companyId = str(params.companyId);
            const issues = await ctx.issues.list({ companyId, limit: 200 });
            const agents = await ctx.agents.list({ companyId, limit: 50 });
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 86400000);
            const monthAgo = new Date(now.getTime() - 30 * 86400000);
            // Basic counts
            const total = issues.length;
            const done = issues.filter(i => i.status === "done").length;
            const inProgress = issues.filter(i => i.status === "in_progress").length;
            const inReview = issues.filter(i => i.status === "in_review").length;
            const backlog = issues.filter(i => i.status === "backlog" || i.status === "todo").length;
            // This week
            const thisWeekDone = issues.filter(i => i.status === "done" && new Date(i.updatedAt) >= weekAgo).length;
            // By editoria
            const byEditoria = {};
            for (const issue of issues) {
                const tag = parseTag(issue.title);
                if (!tag)
                    continue;
                if (!byEditoria[tag])
                    byEditoria[tag] = { total: 0, done: 0 };
                byEditoria[tag].total++;
                if (issue.status === "done")
                    byEditoria[tag].done++;
            }
            // By agent
            const byAgent = [];
            for (const agent of agents) {
                const assigned = issues.filter(i => i.assigneeAgentId === agent.id).length;
                const agentDone = issues.filter(i => i.assigneeAgentId === agent.id && i.status === "done").length;
                const agentInProgress = issues.filter(i => i.assigneeAgentId === agent.id && (i.status === "in_progress" || i.status === "in_review")).length;
                if (assigned > 0) {
                    byAgent.push({ id: agent.id, name: agent.name, role: agent.role, assigned, done: agentDone, inProgress: agentInProgress });
                }
            }
            // Approval rate from rejection log
            let approvalRate = 100;
            try {
                const log = await ctx.state.get({
                    scopeKind: "company", scopeId: companyId,
                    namespace: "creative-hub", stateKey: "rejection-log",
                });
                if (Array.isArray(log) && log.length > 0) {
                    const recentRejections = log.filter((r) => new Date(r.timestamp) >= monthAgo).length;
                    const totalReviewed = done + recentRejections;
                    approvalRate = totalReviewed > 0 ? Math.round((done / totalReviewed) * 100) : 100;
                }
            }
            catch { /* no log */ }
            // Weekly production (last 4 weeks)
            const weeklyProduction = [];
            for (let w = 3; w >= 0; w--) {
                const start = new Date(now.getTime() - (w + 1) * 7 * 86400000);
                const end = new Date(now.getTime() - w * 7 * 86400000);
                const count = issues.filter(i => {
                    const d = new Date(i.updatedAt);
                    return i.status === "done" && d >= start && d < end;
                }).length;
                const label = `Sem ${4 - w}`;
                weeklyProduction.push({ week: label, count });
            }
            // Top rejection reasons
            let topReasons = [];
            try {
                const log = await ctx.state.get({
                    scopeKind: "company", scopeId: companyId,
                    namespace: "creative-hub", stateKey: "rejection-log",
                });
                if (Array.isArray(log)) {
                    const reasonCounts = {};
                    for (const entry of log) {
                        for (const r of entry.reasons || []) {
                            reasonCounts[r] = (reasonCounts[r] || 0) + 1;
                        }
                    }
                    topReasons = Object.entries(reasonCounts)
                        .map(([reason, count]) => ({ reason, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5);
                }
            }
            catch { /* no log */ }
            return {
                total, done, inProgress, inReview, backlog,
                thisWeekDone, weeklyTarget: 3,
                approvalRate,
                byEditoria,
                byAgent,
                weeklyProduction,
                topReasons,
            };
        });
        // ─── ACTION: Create briefing (structured issue + wake orchestrator) ───
        ctx.actions.register("create-briefing", async (params) => {
            const companyId = str(params.companyId);
            const editoria = str(params.editoria);
            const formato = str(params.formato);
            const canal = str(params.canal);
            const publico = str(params.publico);
            const data = str(params.data);
            const tema = str(params.tema);
            const descricao = str(params.descricao);
            // Find project
            const projects = await ctx.issues.list({ companyId, limit: 1 });
            const projectId = projects[0]?.projectId || undefined;
            const title = `[${editoria}] ${tema}`;
            const description = [
                `**Data de publicação:** ${data}`,
                `**Canal:** ${canal}`,
                `**Editoria:** ${editoria}`,
                `**Formato:** ${formato}`,
                `**Público:** ${publico}`,
                ``,
                `**Briefing:**`,
                descricao,
                ``,
                `**Pipeline:**`,
                `1. Research Subagent levanta contexto, base legal e dados`,
                `2. Writer Subagent gera 3 opções de gancho + copy completo + brief visual`,
                `3. Designer Subagent cria as peças visuais (cards HTML + PNGs)`,
                `4. Critic Subagent avalia (score >= 8.0 para aprovar)`,
                `5. Revisão humana final na Galeria`,
            ].join("\n");
            const issue = await ctx.issues.create({
                companyId,
                projectId,
                title,
                description,
                priority: "high",
            });
            // Post to hub timeline
            try {
                const msgs = await ctx.state.get({
                    scopeKind: "company", scopeId: companyId,
                    namespace: "creative-hub", stateKey: "messages",
                }).catch(() => []);
                const list = Array.isArray(msgs) ? msgs : [];
                list.push({
                    id: `briefing-${Date.now()}`,
                    type: "chat",
                    timestamp: new Date().toISOString(),
                    authorType: "human",
                    authorId: null,
                    authorName: "Board",
                    body: `Novo briefing criado: ${title}\nFormato: ${formato} | Canal: ${canal} | Data: ${data}`,
                    imageUrls: [],
                    mentions: [],
                    tags: [editoria],
                    issueId: issue.id,
                    issueNumber: issue.issueNumber,
                    issueTitle: title,
                });
                await ctx.state.set({ scopeKind: "company", scopeId: companyId, namespace: "creative-hub", stateKey: "messages" }, list.slice(-500));
            }
            catch { /* best effort */ }
            // Wake orchestrator
            try {
                const agents = await ctx.agents.list({ companyId, limit: 50 });
                const orch = agents.find((a) => a.role === "ceo");
                if (orch?.id) {
                    await ctx.agents.invoke(orch.id, companyId, {
                        prompt: `Novo briefing recebido: ${title}. Issue criada. Classifique e inicie o pipeline de produção delegando para os subagentes.`,
                        reason: "Novo briefing via Creative Hub",
                    });
                }
            }
            catch { /* skip */ }
            await ctx.activity.log({ companyId, message: `Briefing criado: ${title}`, entityType: "issue", entityId: issue.id });
            return { success: true, issueId: issue.id, issueNumber: issue.issueNumber };
        });
        // ─── DATA: Dashboard feed (latest 10 entries) ───
        ctx.data.register("dashboard-feed", async (params) => {
            const companyId = str(params.companyId);
            const issues = await ctx.issues.list({ companyId, limit: 50 });
            const agents = await ctx.agents.list({ companyId, limit: 50 });
            const agentMap = new Map();
            for (const a of agents)
                agentMap.set(a.id, a.name);
            const entries = [];
            for (const issue of issues.slice(0, 20)) {
                let comments = [];
                try {
                    comments = await ctx.issues.listComments(issue.id, companyId);
                }
                catch {
                    continue;
                }
                for (const c of comments.slice(-3)) {
                    const isAgent = !!c.authorAgentId;
                    entries.push({
                        id: c.id,
                        text: (c.body || "").substring(0, 120),
                        authorName: isAgent ? (agentMap.get(c.authorAgentId) || "Agent") : "Board",
                        authorType: isAgent ? "agent" : "human",
                        timestamp: String(c.createdAt),
                        type: detectMessageType(c.body || ""),
                    });
                }
            }
            entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const agentList = agents.map((a) => ({ id: a.id, name: a.name, role: a.role, status: a.status }));
            return { entries: entries.slice(0, 10), agents: agentList, totalIssues: issues.length };
        });
        // ─── ACTION: Approve a piece ───
        ctx.actions.register("approve-piece", async (params) => {
            const issueId = str(params.issueId);
            const companyId = str(params.companyId);
            const note = str(params.note || "Peça aprovada para publicação.");
            await ctx.state.set({ scopeKind: "issue", scopeId: issueId, namespace: "creative-hub", stateKey: "review-status" }, "approved");
            await ctx.issues.update(issueId, { status: "done" }, companyId);
            await ctx.issues.createComment(issueId, `[APROVADA] ${note}`, companyId);
            await ctx.activity.log({ companyId, message: `Peça aprovada na galeria`, entityType: "issue", entityId: issueId });
            return { success: true };
        });
        // ─── ACTION: Reject a piece with feedback ───
        ctx.actions.register("reject-piece", async (params) => {
            const issueId = str(params.issueId);
            const companyId = str(params.companyId);
            const reasons = params.reasons || [];
            const note = str(params.note);
            // 1. Update review status
            await ctx.state.set({ scopeKind: "issue", scopeId: issueId, namespace: "creative-hub", stateKey: "review-status" }, "rejected");
            // 2. Get issue info + find designer to assign
            const issue = await ctx.issues.get(issueId, companyId);
            const agents = await ctx.agents.list({ companyId, limit: 50 });
            const designer = agents.find((a) => a.role === "designer" && a.name.includes("Designer"));
            // Assign to designer and set in_progress
            await ctx.issues.update(issueId, {
                status: "in_progress",
                ...(designer?.id ? { assigneeAgentId: designer.id } : {}),
            }, companyId);
            const issueTitle = issue?.title || issueId;
            const issueNumber = issue?.issueNumber || "?";
            // 3. Post detailed comment on the issue (agent will see this)
            const reasonList = reasons.map((r, i) => `${i + 1}. ${r}`).join("\n");
            const commentBody = [
                `[REPROVADA] Carrossel reprovado na revisão humana.`,
                ``,
                `**Motivos:**`,
                reasonList,
                note ? `\n**Direcionamento do revisor:**\n${note}` : "",
                ``,
                `Por favor, crie uma nova versão corrigindo os pontos acima. Consulte a skill de erros recorrentes para não repetir.`,
            ].filter(Boolean).join("\n");
            await ctx.issues.createComment(issueId, commentBody, companyId);
            // 4. Log activity
            await ctx.activity.log({
                companyId,
                message: `Carrossel JUS-${issueNumber} reprovado: ${reasons.join(", ")}`,
                entityType: "issue",
                entityId: issueId,
            });
            // 5. Save to learning log (skill de erros recorrentes)
            try {
                const existing = await ctx.state.get({
                    scopeKind: "company", scopeId: companyId,
                    namespace: "creative-hub", stateKey: "rejection-log",
                }).catch(() => []);
                const log = Array.isArray(existing) ? existing : [];
                log.push({
                    issueId,
                    issueNumber,
                    issueTitle,
                    reasons,
                    note,
                    timestamp: new Date().toISOString(),
                });
                // Keep last 100 rejections
                await ctx.state.set({ scopeKind: "company", scopeId: companyId, namespace: "creative-hub", stateKey: "rejection-log" }, log.slice(-100));
            }
            catch { /* best effort */ }
            // 6. Post to hub timeline (broadcast)
            try {
                const hubMessages = await ctx.state.get({
                    scopeKind: "company", scopeId: companyId,
                    namespace: "creative-hub", stateKey: "messages",
                }).catch(() => []);
                const msgs = Array.isArray(hubMessages) ? hubMessages : [];
                msgs.push({
                    id: `reject-${Date.now()}`,
                    type: "approval",
                    timestamp: new Date().toISOString(),
                    authorType: "human",
                    authorId: null,
                    authorName: "Board",
                    body: `[REPROVADA] JUS-${issueNumber} — ${issueTitle.replace(/^\[[^\]]+\]\s*/, "")}\nMotivos: ${reasons.join(", ")}${note ? `\nDirecionamento: ${note}` : ""}`,
                    imageUrls: [],
                    mentions: [],
                    tags: [],
                    issueId,
                    issueNumber,
                    issueTitle,
                });
                await ctx.state.set({ scopeKind: "company", scopeId: companyId, namespace: "creative-hub", stateKey: "messages" }, msgs.slice(-500));
            }
            catch { /* best effort */ }
            // 7. Wake the designer agent to rework
            try {
                if (designer?.id) {
                    await ctx.agents.invoke(designer.id, companyId, {
                        prompt: `Carrossel JUS-${issueNumber} reprovado na revisão humana.\n\nMotivos: ${reasons.join(", ")}\n${note ? `Direcionamento: ${note}\n` : ""}\nVá até a issue ${issueId}, leia o feedback completo nos comentários, consulte a skill de erros recorrentes, e crie uma nova versão corrigida.`,
                        reason: `Carrossel JUS-${issueNumber} reprovado — refazer`,
                    });
                }
            }
            catch { /* agent may be busy */ }
            return { success: true };
        });
        // ─── ACTION: Discard a piece (archive without feedback) ───
        ctx.actions.register("discard-piece", async (params) => {
            const issueId = str(params.issueId);
            const companyId = str(params.companyId);
            await ctx.state.set({ scopeKind: "issue", scopeId: issueId, namespace: "creative-hub", stateKey: "review-status" }, "discarded");
            await ctx.issues.update(issueId, { status: "cancelled" }, companyId);
            await ctx.issues.createComment(issueId, "[DESCARTADA] Peça descartada definitivamente. Issue arquivada sem feedback ao agente.", companyId);
            await ctx.activity.log({ companyId, message: "Peça descartada e arquivada", entityType: "issue", entityId: issueId });
            return { success: true };
        });
        // ─── ACTION: Get single image as base64 ───
        ctx.actions.register("get-image", async (params) => {
            const attachmentId = str(params.attachmentId);
            const apiBase = process.env.PAPERCLIP_API_URL || "http://127.0.0.1:3101";
            const apiKey = process.env.PAPERCLIP_API_KEY || "";
            const headers = {};
            if (apiKey)
                headers["Authorization"] = `Bearer ${apiKey}`;
            const resp = await fetch(`${apiBase}/api/attachments/${attachmentId}/content`, { headers });
            if (!resp.ok)
                return { dataUrl: "" };
            const ct = resp.headers.get("content-type") || "image/png";
            const buffer = Buffer.from(await resp.arrayBuffer());
            return { dataUrl: `data:${ct};base64,${buffer.toString("base64")}` };
        });
        // ─── ACTION: Send message to an issue thread ───
        ctx.actions.register("send-message", async (params) => {
            const companyId = str(params.companyId);
            const issueId = str(params.issueId);
            const body = str(params.body);
            const mentions = parseMentions(body);
            // Create comment on the issue
            await ctx.issues.createComment(issueId, body, companyId);
            // If @mentions detected, wake those agents
            if (mentions.length > 0) {
                const agents = await ctx.agents.list({ companyId, limit: 50 });
                for (const mention of mentions) {
                    const agent = agents.find((a) => a.name.toLowerCase() === mention.toLowerCase());
                    if (agent && agent.id) {
                        try {
                            await ctx.agents.invoke(agent.id, companyId, {
                                prompt: `Nova mensagem no Creative Hub mencionando você na issue ${issueId}:\n\n${body}`,
                                reason: `@mention in Creative Hub`,
                            });
                        }
                        catch {
                            // Agent may be paused or already running
                        }
                    }
                }
            }
            await ctx.activity.log({
                companyId,
                message: `Hub message sent to issue ${issueId}${mentions.length > 0 ? ` (mentioned: ${mentions.join(", ")})` : ""}`,
                entityType: "issue",
                entityId: issueId,
            });
            return { success: true, mentionsWoken: mentions };
        });
        // ─── ACTION: Send broadcast message (creates new issue as thread) ───
        ctx.actions.register("send-broadcast", async (params) => {
            const companyId = str(params.companyId);
            const body = str(params.body);
            const projectId = params.projectId ? str(params.projectId) : undefined;
            const mentions = parseMentions(body);
            // Store as hub message in plugin state
            const existingState = await ctx.state.get({
                scopeKind: "company",
                scopeId: companyId,
                namespace: "creative-hub",
                stateKey: "messages",
            }).catch(() => []);
            const messages = Array.isArray(existingState) ? existingState : [];
            const newMsg = {
                id: `hub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                type: "chat",
                timestamp: new Date().toISOString(),
                authorType: "human",
                authorId: null,
                authorName: "Board",
                body,
                imageUrls: extractImageUrls(body),
                mentions,
                tags: [],
            };
            messages.push(newMsg);
            // Keep last 500 messages
            const trimmed = messages.slice(-500);
            await ctx.state.set({ scopeKind: "company", scopeId: companyId, namespace: "creative-hub", stateKey: "messages" }, trimmed);
            // Wake mentioned agents
            if (mentions.length > 0) {
                const agents = await ctx.agents.list({ companyId, limit: 50 });
                for (const mention of mentions) {
                    const agent = agents.find((a) => a.name.toLowerCase() === mention.toLowerCase());
                    if (agent?.id) {
                        try {
                            await ctx.agents.invoke(agent.id, companyId, {
                                prompt: `Nova mensagem broadcast no Creative Hub:\n\n${body}`,
                                reason: `@mention broadcast in Creative Hub`,
                            });
                        }
                        catch { /* skip */ }
                    }
                }
            }
            return { success: true, messageId: newMsg.id };
        });
        // ─── EVENT: Log new comments to hub activity ───
        ctx.events.on("issue.comment.created", async (event) => {
            // Events are automatically visible in timeline via data handler
        });
    },
    async onHealth() {
        return {
            status: "ok",
            message: "Creative Hub plugin running",
            details: { plugin: "creative-hub" },
        };
    },
});
export default plugin;
runWorker(plugin, import.meta.url);
//# sourceMappingURL=worker.js.map