import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
function str(val) { return String(val ?? ""); }
// Category mapping: group variations into categories
const TERM_CATEGORIES = {
    "Jusbrasil": "Jusbrasil",
    "Jusbrazil": "Jusbrasil",
    "jusbrasil": "Jusbrasil",
    "jusbrasil.com.br": "Jusbrasil",
    "Jus IA": "Jus IA",
    "JusIA": "Jus IA",
    "jus ia": "Jus IA",
    "Jusbrasil Experience": "Experience",
    "Experience 2026": "Experience",
};
function categorize(term) {
    return TERM_CATEGORIES[term] || "Outros";
}
// ─── MOCK DATA: 20 postagens variadas ───
function generateMockMentions() {
    const now = Date.now();
    const h = (hours) => new Date(now - hours * 3600000).toISOString();
    return [
        { id: "tw-1", platform: "twitter", author: "Dra. Camila Oliveira", authorHandle: "@camilaoliveira_adv", authorAvatar: "", text: "Acabei de usar o Jus IA para pesquisar jurisprudência sobre rescisão indireta. Em 30 segundos encontrei o que levaria 2 horas. Impressionante a precisão das citações. 🔥", url: "https://twitter.com/camilaoliveira_adv/status/1", timestamp: h(2), matchedTerm: "Jus IA", category: "Jus IA", sentiment: "positive", engagement: { likes: 47, comments: 12, shares: 8 } },
        { id: "tw-2", platform: "twitter", author: "Rafael Mendes", authorHandle: "@rafaelmendes_law", authorAvatar: "", text: "Jusbrasil mudou completamente meu fluxo de trabalho. Antes eu passava metade do dia pesquisando. Agora a pesquisa é o começo, não o gargalo.", url: "https://twitter.com/rafaelmendes_law/status/2", timestamp: h(5), matchedTerm: "Jusbrasil", category: "Jusbrasil", sentiment: "positive", engagement: { likes: 89, comments: 23, shares: 15 } },
        { id: "ig-1", platform: "instagram", author: "Direito Descomplicado", authorHandle: "@direitodescomplicado", authorAvatar: "", text: "5 ferramentas que todo advogado precisa conhecer em 2026. O Jusbrasil com Jus IA está no topo da lista. A integração de doutrina e legislação na mesma conversa é game-changer.", url: "https://instagram.com/p/1", timestamp: h(3), matchedTerm: "Jusbrasil", category: "Jusbrasil", sentiment: "positive", engagement: { likes: 1243, comments: 87, shares: 234 }, mediaUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400" },
        { id: "tt-1", platform: "tiktok", author: "Ana Jurista", authorHandle: "@anajurista", authorAvatar: "", text: "POV: você descobre que o Jus IA encontra jurisprudência em segundos e questiona todas as horas que perdeu pesquisando manualmente 😭 #direito #advocacia #jusIA", url: "https://tiktok.com/@anajurista/video/1", timestamp: h(1), matchedTerm: "Jus IA", category: "Jus IA", sentiment: "positive", engagement: { likes: 5632, comments: 342, shares: 891 } },
        { id: "rd-1", platform: "reddit", author: "u/advogado_tech", authorHandle: "u/advogado_tech", authorAvatar: "", text: "Alguém mais aqui usa o Jusbrasil Pro? Queria saber se vale a pena o upgrade para ter acesso completo ao Jus IA. Meu escritório tem 3 advogados e estamos avaliando.", url: "https://reddit.com/r/direito/comments/1", timestamp: h(8), matchedTerm: "Jusbrasil", category: "Jusbrasil", sentiment: "neutral", engagement: { likes: 34, comments: 45, shares: 2 } },
        { id: "tw-3", platform: "twitter", author: "Escritório Souza & Lima", authorHandle: "@souzalima_adv", authorAvatar: "", text: "Treinamos toda a equipe no Jus IA. Redução de 40% no tempo de pesquisa no primeiro mês. ROI muito claro para escritórios de médio porte.", url: "https://twitter.com/souzalima_adv/status/3", timestamp: h(12), matchedTerm: "Jus IA", category: "Jus IA", sentiment: "positive", engagement: { likes: 156, comments: 34, shares: 42 } },
        { id: "li-1", platform: "linkedin", author: "Daniela Costa", authorHandle: "daniela-costa-produto", authorAvatar: "", text: "Orgulho de compartilhar: o Jusbrasil Experience 2026 está chegando. Dia 13 de abril vamos mostrar como evoluímos de plataforma de pesquisa para plataforma de trabalho jurídico. Inscrições abertas!", url: "https://linkedin.com/posts/1", timestamp: h(6), matchedTerm: "Jusbrasil Experience", category: "Experience", sentiment: "positive", engagement: { likes: 892, comments: 67, shares: 123 } },
        { id: "ig-2", platform: "instagram", author: "OAB Jovem SP", authorHandle: "@oabjovemsp", authorAvatar: "", text: "Workshop gratuito: Como usar IA na advocacia. Parceria com Jusbrasil para demonstração do Jus IA na prática. Vagas limitadas!", url: "https://instagram.com/p/2", timestamp: h(10), matchedTerm: "Jusbrasil", category: "Jusbrasil", sentiment: "positive", engagement: { likes: 567, comments: 43, shares: 89 } },
        { id: "tw-4", platform: "twitter", author: "Pedro Advocacia", authorHandle: "@pedro_adv_rj", authorAvatar: "", text: "Pessoal perguntando sobre o Jusbrazil com z... é Jusbrasil com s! E sim, o Jus IA deles é muito bom pra pesquisa jurídica.", url: "https://twitter.com/pedro_adv_rj/status/4", timestamp: h(4), matchedTerm: "Jusbrazil", category: "Jusbrasil", sentiment: "neutral", engagement: { likes: 23, comments: 8, shares: 3 } },
        { id: "tt-2", platform: "tiktok", author: "Estudante de Direito", authorHandle: "@estudantededireito", authorAvatar: "", text: "Gente o Jusbrasil liberou Jus IA para estudantes!!! Finalmente posso pesquisar jurisprudência sem morrer tentando. Obrigada @jusbrasil ❤️ #oab #direito", url: "https://tiktok.com/@estudantededireito/video/2", timestamp: h(7), matchedTerm: "Jusbrasil", category: "Jusbrasil", sentiment: "positive", engagement: { likes: 12400, comments: 876, shares: 2340 } },
        { id: "rd-2", platform: "reddit", author: "u/futuro_juiz", authorHandle: "u/futuro_juiz", authorAvatar: "", text: "Review honesto do Jus IA depois de 3 meses de uso: pontos positivos — citações verificáveis, integração com doutrina. Pontos negativos — às vezes demora em horário de pico. No geral, 8/10.", url: "https://reddit.com/r/concurseiros/comments/2", timestamp: h(15), matchedTerm: "Jus IA", category: "Jus IA", sentiment: "neutral", engagement: { likes: 67, comments: 89, shares: 5 } },
        { id: "tw-5", platform: "twitter", author: "Migalhas", authorHandle: "@migabordigital", authorAvatar: "", text: "Jusbrasil anuncia Jus IA para todos os advogados do país. Planos a partir do gratuito. Leia mais: migalhas.com.br/...", url: "https://twitter.com/migabordigital/status/5", timestamp: h(9), matchedTerm: "Jusbrasil", category: "Jusbrasil", sentiment: "neutral", engagement: { likes: 234, comments: 45, shares: 178 } },
        { id: "ig-3", platform: "instagram", author: "Direito Tech Brasil", authorHandle: "@direitotechbr", authorAvatar: "", text: "Comparativo: Jus IA vs ChatGPT para pesquisa jurídica. O Jus IA ganha em precisão de citações (94% vs 67%). ChatGPT ganha em versatilidade. Detalhe: só o Jus IA tem doutrina verificada.", url: "https://instagram.com/p/3", timestamp: h(11), matchedTerm: "Jus IA", category: "Jus IA", sentiment: "positive", engagement: { likes: 2345, comments: 156, shares: 456 }, mediaUrl: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400" },
        { id: "tt-3", platform: "tiktok", author: "Adv na Prática", authorHandle: "@advnapratica", authorAvatar: "", text: "Respondendo: sim, o Jusbrasil é seguro. A IA não inventa jurisprudência — cada citação aponta pro acórdão original. Eu confiro toda vez. #jusIA #advocacia", url: "https://tiktok.com/@advnapratica/video/3", timestamp: h(14), matchedTerm: "Jusbrasil", category: "Jusbrasil", sentiment: "positive", engagement: { likes: 3456, comments: 234, shares: 567 } },
        { id: "li-2", platform: "linkedin", author: "Marcos Ferreira", authorHandle: "marcos-ferreira-adv", authorAvatar: "", text: "Relato real: meu escritório com 4 associados reduziu o tempo de pesquisa em 60% com o Jus IA. O 'revisor silencioso' que detectou uma mudança de entendimento do STJ em 48h salvou um caso.", url: "https://linkedin.com/posts/2", timestamp: h(18), matchedTerm: "Jus IA", category: "Jus IA", sentiment: "positive", engagement: { likes: 1456, comments: 123, shares: 234 } },
        { id: "tw-6", platform: "twitter", author: "Conjur", authorHandle: "@conjabordigital", authorAvatar: "", text: "Jusbrasil Experience 2026 promete revelar novas funcionalidades da plataforma. Evento híbrido em 13 de abril. Inscrições: jusbrasil.com.br/experience", url: "https://twitter.com/conjabordigital/status/6", timestamp: h(20), matchedTerm: "Jusbrasil Experience", category: "Experience", sentiment: "neutral", engagement: { likes: 178, comments: 23, shares: 89 } },
        { id: "rd-3", platform: "reddit", author: "u/direito_digital", authorHandle: "u/direito_digital", authorAvatar: "", text: "O Jusbrasil acabou de integrar doutrina no Jus IA. Testei com um caso de direito civil e funcionou muito bem. Capítulo, autores, obra, editora — referência completa.", url: "https://reddit.com/r/direitodigital/comments/3", timestamp: h(22), matchedTerm: "Jusbrasil", category: "Jusbrasil", sentiment: "positive", engagement: { likes: 89, comments: 34, shares: 12 } },
        { id: "ig-4", platform: "instagram", author: "Juliana Advocacia", authorHandle: "@juliana.adv.go", authorAvatar: "", text: "Caso real: usei o Jus IA para encontrar um padrão de decisão que os sistemas tradicionais não mostravam. Ganhei a causa. Advogada autônoma em Goiás, e nunca tive acesso a esse nível de pesquisa antes.", url: "https://instagram.com/p/4", timestamp: h(24), matchedTerm: "Jus IA", category: "Jus IA", sentiment: "positive", engagement: { likes: 876, comments: 67, shares: 123 } },
        { id: "tt-4", platform: "tiktok", author: "Dicas Jurídicas", authorHandle: "@dicasjuridicas", authorAvatar: "", text: "Como eu pesquiso jurisprudência em 2026: abro o Jusbrasil, faço a pergunta como se fosse pra um colega, e o Jus IA responde com as fontes. Simples assim. #jusbrasil #advocacia2026", url: "https://tiktok.com/@dicasjuridicas/video/4", timestamp: h(26), matchedTerm: "Jusbrasil", category: "Jusbrasil", sentiment: "positive", engagement: { likes: 8900, comments: 456, shares: 1234 } },
        { id: "tw-7", platform: "twitter", author: "Tech Law BR", authorHandle: "@techlawbr", authorAvatar: "", text: "O Jusbrazil (sim, muita gente escreve errado) lançou acesso para estudantes de direito. Boa iniciativa de democratização. O Jus IA gratuito para NPJs é um diferencial.", url: "https://twitter.com/techlawbr/status/7", timestamp: h(28), matchedTerm: "Jusbrazil", category: "Jusbrasil", sentiment: "positive", engagement: { likes: 67, comments: 12, shares: 23 } },
    ];
}
const plugin = definePlugin({
    async setup(ctx) {
        // ─── DATA: Monitored terms ───
        ctx.data.register("terms", async (params) => {
            const companyId = str(params.companyId);
            try {
                const saved = await ctx.state.get({ scopeKind: "company", scopeId: companyId, namespace: "social-monitor", stateKey: "terms" });
                if (Array.isArray(saved) && saved.length > 0)
                    return saved;
            }
            catch { /* first use */ }
            return ["Jusbrasil", "Jus IA", "Jusbrazil", "Jusbrasil Experience", "jusbrasil.com.br"];
        });
        // ─── DATA: Feed of mentions ───
        ctx.data.register("feed", async (params) => {
            const companyId = str(params.companyId);
            const platform = params.platform ? str(params.platform) : "all";
            const sentiment = params.sentiment ? str(params.sentiment) : "all";
            const term = params.term ? str(params.term) : "all";
            // TODO: Replace with Apify integration
            // const APIFY_TOKEN = process.env.APIFY_TOKEN || await ctx.secrets.resolve("apify-token");
            // Actors to use:
            //   Twitter: apify/twitter-scraper
            //   Instagram: apify/instagram-scraper
            //   TikTok: clockworks/tiktok-scraper
            //   Reddit: trudax/reddit-scraper
            // Each actor accepts search terms and returns posts matching them.
            // The integration would:
            // 1. Run each actor with the monitored terms
            // 2. Parse results into Mention[] format
            // 3. Store in plugin state for caching
            // 4. Return filtered by platform/sentiment/term
            let mentions = generateMockMentions();
            if (platform !== "all")
                mentions = mentions.filter(m => m.platform === platform);
            if (sentiment !== "all")
                mentions = mentions.filter(m => m.sentiment === sentiment);
            if (term !== "all")
                mentions = mentions.filter(m => m.category === term);
            return mentions;
        });
        // ─── DATA: Stats ───
        ctx.data.register("stats", async () => {
            const mentions = generateMockMentions();
            const byPlatform = {};
            const bySentiment = {};
            const byTerm = {};
            let totalEngagement = 0;
            for (const m of mentions) {
                byPlatform[m.platform] = (byPlatform[m.platform] || 0) + 1;
                bySentiment[m.sentiment] = (bySentiment[m.sentiment] || 0) + 1;
                byTerm[m.category] = (byTerm[m.category] || 0) + 1;
                totalEngagement += m.engagement.likes + m.engagement.comments + m.engagement.shares;
            }
            return { total: mentions.length, byPlatform, bySentiment, byTerm, totalEngagement };
        });
        // ─── ACTION: Update monitored terms ───
        ctx.actions.register("update-terms", async (params) => {
            const companyId = str(params.companyId);
            const terms = params.terms;
            await ctx.state.set({ scopeKind: "company", scopeId: companyId, namespace: "social-monitor", stateKey: "terms" }, terms);
            return { success: true };
        });
    },
    async onHealth() {
        return { status: "ok", message: "Social Monitor running", details: { apifyIntegrated: false, mockData: true } };
    },
});
export default plugin;
runWorker(plugin, import.meta.url);
//# sourceMappingURL=worker.js.map