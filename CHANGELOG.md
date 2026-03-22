# Changelog

## [0.3.0] - 2026-03-22

### Galeria
- Botão "Back" removido das páginas de plugin (PluginPage.tsx patch)
- Toolbar integrada com ícone + filtros dropdown compactos (sem título redundante)
- Botão atualizar com ícone de refresh
- Ao reprovar carrossel: botão de aprovar desaparece, link "Ver issue JUS-XX" aparece
- Reprovação registra no log de aprendizado + posta na timeline + comenta na issue

### Timeline
- Toolbar unificada com ícone de chat + filtros inline
- Backdrop blur no header para efeito de profundidade
- Contador de mensagens visível apenas em desktop

### Content Review
- Toolbar integrada no topo com ícone de check, busca e filtros por editoria inline
- Layout flex-col h-full para ocupar tela inteira

### Critic Agent
- Logo Jusbrasil/Jus IA obrigatório em toda peça visual — reprovação imediata se ausente
- Acentuação incorreta como critério de reprovação imediata

### Patches Paperclip
- `ui-pluginpage-no-back.patch` — Remove botão Back e wrapper das plugin pages

## [0.2.0] - 2026-03-21

### plugin-creative-hub
- Galeria como feed de carrosséis com slider e thumbnails
- Aprovação/reprovação de carrossel inteiro
- Modal de reprovação com 8 motivos + direcionamento
- Timeline e Galeria como seções separadas no menu
- Imagens via base64 (funciona via Cloudflare Tunnel)
- Lazy loading de imagens via plugin action

### plugin-content-review
- UI Tailwind nativa do Paperclip
- Mobile responsivo
- Radar chart SVG para scores do Critic

## [0.1.0] - 2026-03-21

### Release inicial
- plugin-content-review: Kanban board, issue detail tab, dashboard widget
- plugin-creative-hub: Timeline chat, gallery, @mentions, threads
