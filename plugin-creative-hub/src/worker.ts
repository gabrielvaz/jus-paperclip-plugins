import { definePlugin, runWorker, type PluginContext } from "@paperclipai/plugin-sdk";

function str(val: unknown): string {
  return String(val ?? "");
}

function num(val: unknown, fallback = 0): number {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

interface TimelineEntry {
  id: string;
  type: "chat" | "image" | "report" | "question" | "approval" | "system" | "comment";
  timestamp: string;
  authorType: "agent" | "human" | "system";
  authorId: string | null;
  authorName: string;
  authorRole?: string;
  issueId?: string;
  issueNumber?: number;
  issueTitle?: string;
  body: string;
  imageUrls: string[];
  threadId?: string;
  threadCount?: number;
  mentions: string[];
  tags: string[];
}

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  title: string;
  status: string;
}

// Parse @mentions from text: @Orchestrator, @Writer Subagent, etc.
function parseMentions(text: string): string[] {
  const matches = text.match(/@[\w\s]+(?=\s|$|[,.])/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1).trim());
}

// Detect message type from content
function detectMessageType(body: string): TimelineEntry["type"] {
  if (body.includes("[APROVADO]") || body.includes("[REPROVADO]") || body.includes("[ALTERACOES]")) return "approval";
  if (body.includes("[REPORT]") || body.includes("## Report") || body.includes("## Relatório")) return "report";
  if (body.includes("[QUESTION]") || body.includes("?") && body.length < 200) return "question";
  if (body.match(/!\[.*\]\(.*\)|\.png|\.jpg|\.jpeg|\.svg|\.webp/i)) return "image";
  return "chat";
}

// Extract image URLs from markdown
function extractImageUrls(body: string): string[] {
  const urls: string[] = [];
  const mdImages = body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g);
  for (const match of mdImages) urls.push(match[1]);
  return urls;
}

// Parse editoria tag from issue title
function parseTag(title: string): string | null {
  const match = title.match(/^\[([^\]]+)\]/);
  return match ? match[1] : null;
}

const plugin = definePlugin({
  async setup(ctx: PluginContext) {

    // ─── DATA: List all agents ───
    ctx.data.register("agents", async (params) => {
      const companyId = str(params.companyId);
      const agents = await ctx.agents.list({ companyId, limit: 50 });
      return agents.map((a: any) => ({
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
      const agentMap = new Map<string, AgentInfo>();
      for (const a of agents) {
        agentMap.set(a.id!, {
          id: a.id!,
          name: a.name,
          role: a.role,
          title: (a as any).title || a.role,
          status: a.status,
        });
      }

      // Get all issues and their comments
      const issues = await ctx.issues.list({ companyId, limit: 200 });
      const entries: TimelineEntry[] = [];

      // Hub messages from plugin state
      try {
        const hubState = await ctx.state.get({
          scopeKind: "company",
          scopeId: companyId,
          namespace: "creative-hub",
          stateKey: "messages",
        });
        if (hubState && Array.isArray(hubState)) {
          for (const msg of hubState as TimelineEntry[]) {
            entries.push(msg);
          }
        }
      } catch { /* no hub messages yet */ }

      // Issue comments as timeline entries (limit to 30 most recent to avoid timeout)
      const recentIssues = issues.slice(0, 30);
      for (const issue of recentIssues) {
        const tag = parseTag(issue.title);

        // Filter by tag
        if (filterTag && tag !== filterTag) continue;

        let comments: any[] = [];
        try {
          comments = await ctx.issues.listComments(issue.id!, companyId);
        } catch { continue; }

        for (const c of comments) {
          const isAgent = !!c.authorAgentId;
          const agent = isAgent ? agentMap.get(c.authorAgentId) : null;
          const body = c.body || "";
          const msgType = detectMessageType(body);

          // Filter by type
          if (filterType && filterType !== "all" && msgType !== filterType) continue;

          // Filter by agent
          if (filterAgent && filterAgent !== "all") {
            if (isAgent && c.authorAgentId !== filterAgent) continue;
            if (!isAgent && filterAgent !== "human") continue;
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
            issueNumber: (issue as any).issueNumber || 0,
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
          issueNumber: (issue as any).issueNumber || 0,
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
      if (!issue) return null;

      const comments = await ctx.issues.listComments(issueId, companyId);
      const agents = await ctx.agents.list({ companyId, limit: 50 });
      const agentMap = new Map<string, AgentInfo>();
      for (const a of agents) {
        agentMap.set(a.id!, { id: a.id!, name: a.name, role: a.role, title: (a as any).title || a.role, status: a.status });
      }

      return {
        issue: {
          id: issue.id,
          title: issue.title,
          status: issue.status,
          issueNumber: (issue as any).issueNumber || 0,
          description: (issue as any).description || null,
        },
        messages: comments.map((c: any) => {
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
      const issues = await ctx.issues.list({ companyId, limit: 50 });

      const agents = await ctx.agents.list({ companyId, limit: 50 });
      const agentMap = new Map<string, string>();
      for (const a of agents) agentMap.set(a.id!, a.name);

      const apiBase = process.env.PAPERCLIP_API_URL || "http://127.0.0.1:3101";
      const apiKey = process.env.PAPERCLIP_API_KEY || "";
      const headers: Record<string, string> = {};
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const carousels: Array<{
        issueId: string;
        issueNumber: number;
        issueTitle: string;
        tag: string | null;
        status: string;
        reviewStatus: string;
        agentName: string;
        description: string;
        timestamp: string;
        images: Array<{ id: string; filename: string; contentType: string; byteSize: number }>;
      }> = [];

      for (const issue of issues.slice(0, 30)) {
        const tag = parseTag(issue.title);
        try {
          const resp = await fetch(`${apiBase}/api/issues/${issue.id}/attachments`, { headers });
          if (!resp.ok) continue;
          const atts = await resp.json() as any[];
          if (!Array.isArray(atts)) continue;

          const imgAtts = atts.filter((a: any) => a.contentType?.startsWith("image/"));
          if (imgAtts.length === 0) continue;

          let reviewStatus = "pending";
          try {
            const rs = await ctx.state.get({ scopeKind: "issue", scopeId: issue.id!, namespace: "creative-hub", stateKey: "review-status" });
            if (rs && typeof rs === "string") reviewStatus = rs;
          } catch { /* pending */ }

          let agentName = "Designer Subagent";
          let description = (issue as any).description || "";
          try {
            const comments = await ctx.issues.listComments(issue.id!, companyId);
            for (const c of comments) {
              if ((c as any).authorAgentId) {
                agentName = agentMap.get((c as any).authorAgentId) || "Agente";
                break;
              }
            }
          } catch { /* skip */ }

          // Clean description for display
          const descLines = description.split("\n").filter((l: string) => l.trim() && !l.startsWith("**Pipeline") && !l.includes("Research Subagent") && !l.includes("Writer Subagent") && !l.includes("Critic Subagent") && !l.includes("Output:") && !l.includes("Revisão humana"));
          const cleanDesc = descLines.slice(0, 6).join("\n").substring(0, 300);

          carousels.push({
            issueId: issue.id!,
            issueNumber: (issue as any).issueNumber || 0,
            issueTitle: issue.title,
            tag,
            status: issue.status,
            reviewStatus,
            agentName,
            description: cleanDesc,
            timestamp: String(imgAtts[0].createdAt || issue.createdAt),
            images: imgAtts.map((a: any) => ({
              id: a.id,
              filename: a.originalFilename || "",
              contentType: a.contentType,
              byteSize: a.byteSize || 0,
            })),
          });
        } catch { /* skip */ }
      }

      carousels.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return carousels;
    });

    // ─── DATA: Dashboard feed (latest 10 entries) ───
    ctx.data.register("dashboard-feed", async (params) => {
      const companyId = str(params.companyId);
      const issues = await ctx.issues.list({ companyId, limit: 50 });
      const agents = await ctx.agents.list({ companyId, limit: 50 });
      const agentMap = new Map<string, string>();
      for (const a of agents) agentMap.set(a.id!, a.name);

      const entries: Array<{ id: string; text: string; authorName: string; authorType: string; timestamp: string; type: string }> = [];

      for (const issue of issues.slice(0, 20)) {
        let comments: any[] = [];
        try { comments = await ctx.issues.listComments(issue.id!, companyId); } catch { continue; }

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

      const agentList = agents.map((a: any) => ({ id: a.id, name: a.name, role: a.role, status: a.status }));

      return { entries: entries.slice(0, 10), agents: agentList, totalIssues: issues.length };
    });

    // ─── ACTION: Approve a piece ───
    ctx.actions.register("approve-piece", async (params) => {
      const issueId = str(params.issueId);
      const companyId = str(params.companyId);
      const note = str(params.note || "Peça aprovada para publicação.");

      await ctx.state.set(
        { scopeKind: "issue", scopeId: issueId, namespace: "creative-hub", stateKey: "review-status" },
        "approved",
      );
      await ctx.issues.update(issueId, { status: "done" }, companyId);
      await ctx.issues.createComment(issueId, `[APROVADA] ${note}`, companyId);
      await ctx.activity.log({ companyId, message: `Peça aprovada na galeria`, entityType: "issue", entityId: issueId });
      return { success: true };
    });

    // ─── ACTION: Reject a piece with feedback ───
    ctx.actions.register("reject-piece", async (params) => {
      const issueId = str(params.issueId);
      const companyId = str(params.companyId);
      const reasons = (params.reasons as string[]) || [];
      const note = str(params.note);

      await ctx.state.set(
        { scopeKind: "issue", scopeId: issueId, namespace: "creative-hub", stateKey: "review-status" },
        "rejected",
      );
      await ctx.issues.update(issueId, { status: "in_progress" }, companyId);

      const body = `[REPROVADA] Motivos: ${reasons.join(", ")}${note ? `\n\nDirecionamento: ${note}` : ""}\n\nPor favor, crie uma nova versão com base nesse feedback.`;
      await ctx.issues.createComment(issueId, body, companyId);
      await ctx.activity.log({ companyId, message: `Peça reprovada na galeria`, entityType: "issue", entityId: issueId });

      // Wake the designer agent to rework
      try {
        const agents = await ctx.agents.list({ companyId, limit: 50 });
        const designer = agents.find((a: any) => a.role === "designer" && a.name.includes("Designer"));
        if (designer?.id) {
          await ctx.agents.invoke(designer.id, companyId, {
            prompt: `Peça reprovada na issue ${issueId}. Feedback: ${reasons.join(", ")}. ${note}. Crie uma nova versão.`,
            reason: "Peça reprovada na galeria — refazer",
          });
        }
      } catch { /* agent may be busy */ }

      return { success: true };
    });

    // ─── ACTION: Get single image as base64 ───
    ctx.actions.register("get-image", async (params) => {
      const attachmentId = str(params.attachmentId);
      const apiBase = process.env.PAPERCLIP_API_URL || "http://127.0.0.1:3101";
      const apiKey = process.env.PAPERCLIP_API_KEY || "";
      const headers: Record<string, string> = {};
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const resp = await fetch(`${apiBase}/api/attachments/${attachmentId}/content`, { headers });
      if (!resp.ok) return { dataUrl: "" };
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
          const agent = agents.find(
            (a: any) => a.name.toLowerCase() === mention.toLowerCase()
          );
          if (agent && agent.id) {
            try {
              await ctx.agents.invoke(agent.id, companyId, {
                prompt: `Nova mensagem no Creative Hub mencionando você na issue ${issueId}:\n\n${body}`,
                reason: `@mention in Creative Hub`,
              });
            } catch {
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
      const newMsg: TimelineEntry = {
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
      await ctx.state.set(
        { scopeKind: "company", scopeId: companyId, namespace: "creative-hub", stateKey: "messages" },
        trimmed,
      );

      // Wake mentioned agents
      if (mentions.length > 0) {
        const agents = await ctx.agents.list({ companyId, limit: 50 });
        for (const mention of mentions) {
          const agent = agents.find((a: any) => a.name.toLowerCase() === mention.toLowerCase());
          if (agent?.id) {
            try {
              await ctx.agents.invoke(agent.id, companyId, {
                prompt: `Nova mensagem broadcast no Creative Hub:\n\n${body}`,
                reason: `@mention broadcast in Creative Hub`,
              });
            } catch { /* skip */ }
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
      status: "ok" as const,
      message: "Creative Hub plugin running",
      details: { plugin: "creative-hub" },
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
