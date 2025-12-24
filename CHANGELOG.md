# Changelog - Vanta.io

## [V1.0.1] - 25/12/2025

### 🎖️ Sistema de Badges e Insignias
- ✅ Implementado sistema completo de badges/insignias
- ✅ Auto-conversão de badges do Discord para o perfil (Discord Staff, Partner, HypeSquad, Bug Hunter, etc)
- ✅ Armazenamento de badges em MongoDB com campos: código, nome, ícone, descrição, fonte, data
- ✅ Suporte para badges de diferentes fontes (Discord, Admin, Eventos, Sistema)

### 🛡️ Painel Administrativo
- ✅ Dashboard admin protegido com JWT token e verificação de role
- ✅ Sistema de autenticação admin baseado em emails (ADMIN_EMAILS env var)
- ✅ Busca de usuários por username ou ID
- ✅ CRUD completo para badges (criar, ler, atualizar, deletar)
- ✅ Botões rápidos para badges mais usados (Dev Ativo, Fundador, Verificado)
- ✅ Editor de perfil básico (displayName, bio, tema)
- ✅ Interface intuitiva e responsiva

### 👤 Redesign do Perfil Público
- ✅ Layout moderno inspirado em Discord
- ✅ Avatar centralizado (120px) com decoração do Discord
- ✅ Badges em destaque em círculos coloridos
- ✅ Bio do usuário centralizada
- ✅ Card do jogo Steam em destaque
- ✅ Links personalizados em linha horizontal
- ✅ Footer com CTA "Crie seu perfil"
- ✅ Remover galeria de mídia (substituída por background de vídeo)

### 🎬 Melhorias de Áudio/Vídeo
- ✅ Áudio de ambiente funcional no perfil público
- ✅ Autoplay com fallback para mute (compatível com políticas de navegadores modernos)
- ✅ Desmute automático ao primeiro clique/toque do usuário
- ✅ Suporte para múltiplos formatos (MP3, WAV, OGG, M4A)
- ✅ Vídeo de background como efeito visual
- ✅ Loop automático de áudio

### 🔒 Segurança
- ✅ Removed credenciais de `.env`
- ✅ Criado `.env.example` para documentação
- ✅ Criado guia `SQUARECLOUD_ENV_VARS.md` com todas as vars necessárias
- ✅ Proteção de rotas admin com middleware isAdmin
- ✅ Role-based access control (RBAC) via JWT

### 🔌 Integrações
- ✅ Discord OAuth 2.0 para conexão de contas
- ✅ Auto-conversão de Discord public_flags em badges (11 tipos suportados)
- ✅ Steam API para dados de jogos em destaque
- ✅ Discord avatar decoration overlay

### 📱 Responsividade
- ✅ Media queries para tablets (768px): avatar 140px
- ✅ Media queries para mobile (480px): avatar 120px com layout ajustado
- ✅ Designs fluido em todos os tamanhos de tela

### 🐛 Correções e Melhorias
- ✅ Corrigido erro de duplicação em profile.js (updatedUser)
- ✅ Melhorado sistema de autenticação com role em JWT
- ✅ Otimizado carregamento de dados no Dashboard após upload

### 📚 Documentação
- ✅ Guia completo de variáveis de ambiente (SQUARECLOUD_ENV_VARS.md)
- ✅ Comentários detalhados no código
- ✅ Instruções para configurar Discord OAuth
- ✅ Instruções para configurar Steam API

---

## Variáveis de Ambiente Novas

### Discord OAuth
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI`

### Admin Sistema
- `ADMIN_EMAILS`

### Steam API
- `STEAM_API_KEY`
- `STEAM_RETURN_URL`
- `STEAM_REALM`

---

## Dependências Adicionadas

Nenhuma dependência npm nova foi adicionada nesta versão (usando bibliotecas existentes).

---

## Breaking Changes

Nenhum breaking change nesta versão. Totalmente compatível com V1.0.0.

---

## Próximas Melhorias Planejadas

- [ ] Animações de carregamento no perfil
- [ ] Tooltips em badges com descrição completa
- [ ] Sistema de conquistas/achievements
- [ ] Integração com mais plataformas (Twitch, YouTube, etc)
- [ ] Temas customizáveis avançados
- [ ] Sistema de notificações em tempo real
- [ ] Backup automático de perfis

---

## Como Atualizar para V1.0.1

1. Atualize as variáveis de ambiente no SquareCloud (ver SQUARECLOUD_ENV_VARS.md)
2. Faça deploy da nova versão
3. Usuários podem agora conectar Discord e receber badges automáticas
4. Administradores podem acessar `/admin` para gerenciar badges

---

## Créditos

Desenvolvido por: Daniel Oliveira
Data: 25 de Dezembro de 2025
Versão: 1.0.1
Status: Production Ready

