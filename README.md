# Jusbrasil Creative — Plugins Paperclip

Plugins customizados para o Paperclip, usados pela agência interna de creative do Jusbrasil.

## Plugins

### plugin-content-review
Kanban de aprovação de conteúdo com:
- Board visual com colunas (Backlog → A Produzir → Em Produção → Review → Aprovado)
- Aba "Preview & Review" em cada issue com radar chart do Critic
- Botões de aprovar/reprovar/pedir alterações
- Comentários integrados bidirecionalmente com issues
- Dashboard widget com métricas (meta semanal, score médio)

### plugin-creative-hub
Hub criativo estilo Discord com:
- **Timeline** — Chat dos agentes com filtros por agente/tipo/editoria, @mentions que acordam agentes, threads
- **Galeria** — Feed de carrosséis para aprovação com slider de imagens, approve/reject workflow, modal de reprovação com motivos selecionáveis
- Dashboard widget com feed de atividade recente

## Instalação

```bash
# No diretório do Paperclip
cd paperclip

# Instalar plugin
curl -s -X POST http://localhost:3101/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName": "/caminho/para/plugin-content-review", "isLocalPath": true}'

curl -s -X POST http://localhost:3101/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName": "/caminho/para/plugin-creative-hub", "isLocalPath": true}'
```

## Patches necessários no Paperclip

Para acesso remoto via tunnel (Cloudflare/ngrok):
- `patches/server-app-allowedHosts.patch` — Permite hosts externos no Vite
- `patches/ui-vite-allowedHosts.patch` — AllowedHosts no vite.config.ts

## Build

```bash
cd plugin-content-review && pnpm install && pnpm build
cd plugin-creative-hub && pnpm install && pnpm build
```
