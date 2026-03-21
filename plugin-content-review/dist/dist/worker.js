import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
function parseEditoria(title) {
    const match = title.match(/^\[([^\]]+)\]/);
    return match ? match[1] : null;
}
function parsePublishDate(description) {
    if (!description)
        return null;
    const match = description.match(/\*\*Data de publica(?:cao|ção):\*\*\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}
function parseChannel(description) {
    if (!description)
        return null;
    const match = description.match(/\*\*Canal:\*\*\s*(.+)/);
    return match ? match[1].trim() : null;
}
function parseCriticScore(body) {
    const patterns = {
        brand: /Brand[:\s]*(\d+(?:\.\d+)?)/i,
        clarity: /Clar(?:eza|ity)[:\s]*(\d+(?:\.\d+)?)/i,
        hook: /(?:Gancho|Hook)[:\s]*(\d+(?:\.\d+)?)/i,
        accuracy: /(?:Precis[aã]o|Accuracy)[:\s]*(\d+(?:\.\d+)?)/i,
        actionability: /(?:Acionabilidade|Actionability)[:\s]*(\d+(?:\.\d+)?)/i,
    };
    const scores = {};
    let found = false;
    for (const [key, regex] of Object.entries(patterns)) {
        const match = body.match(regex);
        if (match) {
            scores[key] = parseFloat(match[1]);
            found = true;
        }
    }
    if (!found)
        return null;
    const values = Object.values(scores).filter((v) => v !== undefined);
    scores.average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return {
        brand: scores.brand ?? 0,
        clarity: scores.clarity ?? 0,
        hook: scores.hook ?? 0,
        accuracy: scores.accuracy ?? 0,
        actionability: scores.actionability ?? 0,
        average: scores.average,
    };
}
function isThisWeek(dateInput) {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return date >= startOfWeek;
}
function str(val) {
    return String(val ?? "");
}
const plugin = definePlugin({
    async setup(ctx) {
        // ─── DATA HANDLERS ───
        // Board data: all issues with review state and parsed metadata
        ctx.data.register("board-issues", async (params) => {
            const companyId = str(params.companyId);
            const projectId = params.projectId ? str(params.projectId) : undefined;
            const issues = await ctx.issues.list({
                companyId,
                projectId,
                limit: 200,
            });
            const enriched = [];
            for (const issue of issues) {
                let review = null;
                try {
                    const state = await ctx.state.get({
                        scopeKind: "issue",
                        scopeId: issue.id,
                        namespace: "content-review",
                        stateKey: "review",
                    });
                    if (state)
                        review = state;
                }
                catch {
                    // No review state yet
                }
                const desc = issue.description || null;
                enriched.push({
                    id: issue.id,
                    title: issue.title,
                    description: desc,
                    status: issue.status,
                    priority: issue.priority,
                    issueNumber: issue.issueNumber || 0,
                    assigneeAgentId: issue.assigneeAgentId || null,
                    createdAt: String(issue.createdAt),
                    updatedAt: String(issue.updatedAt),
                    review,
                    attachments: [],
                    editoria: parseEditoria(issue.title),
                    publishDate: parsePublishDate(desc),
                    channel: parseChannel(desc),
                });
            }
            return enriched;
        });
        // Issue detail with comments and full review data
        ctx.data.register("issue-review-detail", async (params) => {
            const issueId = str(params.issueId);
            const companyId = str(params.companyId);
            const issue = await ctx.issues.get(issueId, companyId);
            if (!issue)
                return null;
            const comments = await ctx.issues.listComments(issueId, companyId);
            let review = null;
            try {
                const state = await ctx.state.get({
                    scopeKind: "issue",
                    scopeId: issueId,
                    namespace: "content-review",
                    stateKey: "review",
                });
                if (state)
                    review = state;
            }
            catch {
                // No review
            }
            // Parse critic scores from comments
            let criticScore = null;
            for (const comment of comments) {
                const score = parseCriticScore(comment.body);
                if (score) {
                    criticScore = score;
                    break;
                }
            }
            const desc = issue.description || null;
            return {
                issue: {
                    ...issue,
                    createdAt: String(issue.createdAt),
                    updatedAt: String(issue.updatedAt),
                    editoria: parseEditoria(issue.title),
                    publishDate: parsePublishDate(desc),
                    channel: parseChannel(desc),
                },
                comments: comments.map((c) => ({
                    ...c,
                    createdAt: String(c.createdAt),
                    updatedAt: String(c.updatedAt),
                })),
                review,
                criticScore,
                attachments: [],
            };
        });
        // Dashboard metrics
        ctx.data.register("dashboard-metrics", async (params) => {
            const companyId = str(params.companyId);
            const issues = await ctx.issues.list({ companyId, limit: 200 });
            let pendingReview = 0;
            let approved = 0;
            let rejected = 0;
            let changesRequested = 0;
            let totalScore = 0;
            let scoredCount = 0;
            for (const issue of issues) {
                if (issue.status === "in_review")
                    pendingReview++;
                try {
                    const state = await ctx.state.get({
                        scopeKind: "issue",
                        scopeId: issue.id,
                        namespace: "content-review",
                        stateKey: "review",
                    });
                    if (state) {
                        const r = state;
                        if (r.status === "approved")
                            approved++;
                        if (r.status === "rejected")
                            rejected++;
                        if (r.status === "changes_requested")
                            changesRequested++;
                        if (r.criticScore?.average) {
                            totalScore += r.criticScore.average;
                            scoredCount++;
                        }
                    }
                }
                catch {
                    // skip
                }
            }
            const byStatus = {};
            for (const issue of issues) {
                byStatus[issue.status] = (byStatus[issue.status] || 0) + 1;
            }
            const byEditoria = {};
            for (const issue of issues) {
                const ed = parseEditoria(issue.title);
                if (ed)
                    byEditoria[ed] = (byEditoria[ed] || 0) + 1;
            }
            return {
                total: issues.length,
                pendingReview,
                approved,
                rejected,
                changesRequested,
                averageScore: scoredCount > 0 ? totalScore / scoredCount : null,
                byStatus,
                byEditoria,
                weeklyTarget: 3,
                thisWeekDone: issues.filter((i) => i.status === "done" && isThisWeek(i.updatedAt)).length,
            };
        });
        // Comment context for annotation
        ctx.data.register("comment-review-context", async (params) => {
            const issueId = str(params.issueId);
            const commentId = str(params.commentId);
            const companyId = str(params.companyId);
            const comments = await ctx.issues.listComments(issueId, companyId);
            const comment = comments.find((c) => c.id === commentId);
            if (!comment)
                return null;
            const score = parseCriticScore(comment.body);
            const isAgentComment = !!comment.authorAgentId;
            const isReviewComment = comment.body.includes("[REVIEW]") || comment.body.includes("[APROVADO]") || comment.body.includes("[REPROVADO]") || comment.body.includes("[ALTERACOES]");
            return {
                score,
                isAgentComment,
                isReviewComment,
                authorAgentId: comment.authorAgentId || null,
            };
        });
        // ─── ACTIONS ───
        // Approve content
        ctx.actions.register("approve", async (params) => {
            const issueId = str(params.issueId);
            const companyId = str(params.companyId);
            const note = str(params.note || "Aprovado");
            const review = {
                status: "approved",
                reviewerNote: note,
                reviewedAt: new Date().toISOString(),
            };
            try {
                const existing = await ctx.state.get({
                    scopeKind: "issue",
                    scopeId: issueId,
                    namespace: "content-review",
                    stateKey: "review",
                });
                if (existing && existing.criticScore) {
                    review.criticScore = existing.criticScore;
                }
            }
            catch { /* first review */ }
            await ctx.state.set({ scopeKind: "issue", scopeId: issueId, namespace: "content-review", stateKey: "review" }, review);
            await ctx.issues.update(issueId, { status: "done" }, companyId);
            await ctx.issues.createComment(issueId, `[APROVADO] ${note}`, companyId);
            await ctx.activity.log({
                companyId,
                message: `Content approved for issue`,
                entityType: "issue",
                entityId: issueId,
            });
            return { success: true };
        });
        // Reject content
        ctx.actions.register("reject", async (params) => {
            const issueId = str(params.issueId);
            const companyId = str(params.companyId);
            const note = str(params.note);
            const review = {
                status: "rejected",
                reviewerNote: note,
                reviewedAt: new Date().toISOString(),
            };
            await ctx.state.set({ scopeKind: "issue", scopeId: issueId, namespace: "content-review", stateKey: "review" }, review);
            await ctx.issues.update(issueId, { status: "cancelled" }, companyId);
            await ctx.issues.createComment(issueId, `[REPROVADO] ${note}`, companyId);
            await ctx.activity.log({
                companyId,
                message: `Content rejected for issue`,
                entityType: "issue",
                entityId: issueId,
            });
            return { success: true };
        });
        // Request changes
        ctx.actions.register("request-changes", async (params) => {
            const issueId = str(params.issueId);
            const companyId = str(params.companyId);
            const note = str(params.note);
            const review = {
                status: "changes_requested",
                reviewerNote: note,
                reviewedAt: new Date().toISOString(),
            };
            await ctx.state.set({ scopeKind: "issue", scopeId: issueId, namespace: "content-review", stateKey: "review" }, review);
            await ctx.issues.update(issueId, { status: "in_progress" }, companyId);
            await ctx.issues.createComment(issueId, `[ALTERACOES] ${note}`, companyId);
            await ctx.activity.log({
                companyId,
                message: `Changes requested for issue`,
                entityType: "issue",
                entityId: issueId,
            });
            return { success: true };
        });
        // Add review comment
        ctx.actions.register("add-comment", async (params) => {
            const issueId = str(params.issueId);
            const companyId = str(params.companyId);
            const body = str(params.body);
            await ctx.issues.createComment(issueId, `[REVIEW] ${body}`, companyId);
            return { success: true };
        });
        // ─── EVENT LISTENERS ───
        ctx.events.on("issue.updated", async (event) => {
            try {
                const payload = event.payload;
                if (payload?.status === "in_review") {
                    const comments = await ctx.issues.listComments(payload.issueId || event.entityId || "", event.companyId);
                    for (const comment of comments) {
                        const score = parseCriticScore(comment.body);
                        if (score) {
                            const existing = await ctx.state.get({
                                scopeKind: "issue",
                                scopeId: payload.issueId || event.entityId || "",
                                namespace: "content-review",
                                stateKey: "review",
                            }).catch(() => null);
                            await ctx.state.set({ scopeKind: "issue", scopeId: payload.issueId || event.entityId || "", namespace: "content-review", stateKey: "review" }, { ...(existing || { status: "pending" }), criticScore: score });
                            break;
                        }
                    }
                }
            }
            catch {
                // Best-effort scoring
            }
        });
    },
    async onHealth() {
        return {
            status: "ok",
            message: "Content Review plugin running",
            details: { plugin: "content-review" },
        };
    },
});
export default plugin;
runWorker(plugin, import.meta.url);
//# sourceMappingURL=worker.js.map