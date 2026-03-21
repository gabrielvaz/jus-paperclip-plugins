# Changelog

## [0.2.0] - 2026-03-21

### plugin-creative-hub
- **Galeria como feed de carrosséis** — imagens agrupadas por issue com slider, thumbnails, e navegação
- **Aprovação/reprovação de carrossel inteiro** — não mais por imagem individual
- **Modal de reprovação** com 8 motivos selecionáveis + campo de texto para direcionamento
- **Agente Designer acordado automaticamente** ao reprovar para criar nova versão
- **Timeline e Galeria separados** como seções independentes no menu lateral
- **Filtros por dropdown** no topo (mobile-friendly) em vez de sidebar
- **Imagens via base64** no gallery data (funciona via Cloudflare Tunnel)
- **Lazy loading** de imagens individuais via plugin action

### plugin-content-review
- **UI Tailwind nativa** do Paperclip (bg-card, border-border, text-foreground)
- **Mobile responsivo** — kanban com scroll horizontal, filtros flex-wrap
- **Radar chart SVG** para scores do Critic (5 dimensões)
- **Sidebar clicável** com ícones SVG no padrão do Paperclip

### Correções
- Acentuação correta em todos os textos em português (41 instâncias corrigidas)
- Sidebar links como `<a>` tags com classes Tailwind nativas
- AllowedHosts no Vite para acesso via tunnel

## [0.1.0] - 2026-03-21

### Release inicial
- plugin-content-review: Kanban board, issue detail tab, dashboard widget
- plugin-creative-hub: Timeline chat, gallery, @mentions, threads
