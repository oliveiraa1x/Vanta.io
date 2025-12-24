const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const User = require('../models/User');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const router = express.Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || '';

// Optional OAuth creds for other platforms (placeholders)
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || '';

const STEAM_API_KEY = process.env.STEAM_API_KEY || '';
const STEAM_RETURN_URL = process.env.STEAM_RETURN_URL || 'http://localhost:3000/dashboard';
const STEAM_REALM = process.env.STEAM_REALM || 'http://localhost:3000';

// Obter perfil do usuário logado
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Normalizar links antigos sem _id
    if (Array.isArray(user.links) && user.links.some(l => !l._id)) {
      const normalized = user.links.map(l => ({
        _id: l._id || new (require('mongoose')).Types.ObjectId(),
        title: l.title,
        url: l.url,
        type: l.type || 'custom',
        platform: (l.platform || 'custom').toLowerCase()
      }));
      await User.findByIdAndUpdate(user._id, { links: normalized });
      user.links = normalized;
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error.message);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// ===== Connections (Steam) =====
// Fornecer URL de autorização do Steam (OpenID)
router.get('/steam/auth-url', authenticateToken, (req, res) => {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': STEAM_RETURN_URL,
    'openid.realm': STEAM_REALM,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
  });
  const authUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
  res.json({ url: authUrl });
});

// Conectar conta do Steam usando OpenID response
router.post('/steam/connect', authenticateToken, async (req, res) => {
  try {
    const { openidParams } = req.body;
    if (!openidParams || !openidParams['openid.claimed_id']) {
      return res.status(400).json({ error: 'Parâmetros do Steam ausentes' });
    }

    // Extrair Steam ID da claimed_id
    const claimedId = openidParams['openid.claimed_id'];
    const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
    if (!steamIdMatch) {
      return res.status(400).json({ error: 'Steam ID inválido' });
    }
    const steamId = steamIdMatch[1];

    // Verificar se já está vinculado a outro usuário
    const existing = await User.findOne({ 'connections.steam.steamId': steamId });
    if (existing && existing._id.toString() !== req.user.userId) {
      return res.status(400).json({ error: 'Esta conta Steam já está vinculada a outro usuário' });
    }

    // Buscar dados do perfil Steam (se API Key disponível)
    let steamUsername = `Steam User ${steamId}`;
    if (STEAM_API_KEY) {
      try {
        const profileResp = await fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`
        );
        if (profileResp.ok) {
          const profileData = await profileResp.json();
          if (profileData.response?.players?.[0]) {
            steamUsername = profileData.response.players[0].personaname || steamUsername;
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar perfil Steam:', err.message);
      }
    }

    // Atualizar conexões do usuário
    const user = await User.findById(req.user.userId);
    const current = user.connections || {};
    current.steam = {
      steamId: steamId,
      username: steamUsername
    };
    await User.findByIdAndUpdate(req.user.userId, { connections: current });

    res.json({
      message: 'Steam conectado com sucesso',
      steam: { id: steamId, username: steamUsername }
    });
  } catch (error) {
    console.error('Erro ao conectar Steam:', error.message);
    res.status(500).json({ error: 'Erro ao conectar Steam' });
  }
});

// Buscar jogos da Steam do usuário
router.get('/steam/games', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const steamId = user.connections?.steam?.steamId;
    
    if (!steamId) {
      return res.status(400).json({ error: 'Steam não conectada' });
    }

    if (!STEAM_API_KEY) {
      return res.status(500).json({ error: 'Steam API Key não configurada' });
    }

    console.log('Buscando jogos para Steam ID:', steamId);

    const gamesResp = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`
    );

    if (!gamesResp.ok) {
      console.error('Steam API retornou erro:', gamesResp.status, gamesResp.statusText);
      return res.status(500).json({ error: 'Erro ao buscar jogos da Steam. Verifique se seu perfil está público.' });
    }

    const gamesData = await gamesResp.json();
    console.log('Resposta da Steam API:', JSON.stringify(gamesData, null, 2));
    
    const games = gamesData.response?.games || [];

    if (games.length === 0) {
      return res.json({ 
        games: [], 
        message: 'Nenhum jogo encontrado. Certifique-se de que seu perfil e biblioteca Steam estão públicos em: Perfil → Editar Perfil → Configurações de Privacidade → Detalhes do jogo: Público' 
      });
    }

    // Ordenar por tempo jogado (decrescente)
    games.sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));

    res.json({ games: games.slice(0, 50) }); // Retornar top 50
  } catch (error) {
    console.error('Erro ao buscar jogos Steam:', error.message);
    res.status(500).json({ error: 'Erro ao buscar jogos' });
  }
});

// Selecionar jogo destacado
router.post('/steam/featured-game', authenticateToken, async (req, res) => {
  try {
    const { appid, name, img_icon_url, img_logo_url, playtime_forever } = req.body;
    
    if (!appid) {
      return res.status(400).json({ error: 'App ID é obrigatório' });
    }

    const user = await User.findById(req.user.userId);
    const current = user.connections || {};
    
    if (!current.steam) {
      return res.status(400).json({ error: 'Steam não conectada' });
    }

    current.steamFeaturedGame = {
      appid,
      name,
      img_icon_url,
      img_logo_url,
      playtime_forever
    };

    await User.findByIdAndUpdate(req.user.userId, { connections: current });
    res.json({ message: 'Jogo destacado atualizado', game: current.steamFeaturedGame });
  } catch (error) {
    console.error('Erro ao atualizar jogo destacado:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar jogo' });
  }
});

// Buscar banner da Steam
router.get('/steam/banner', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const steamId = user.connections?.steam?.steamId;
    
    if (!steamId) {
      return res.status(400).json({ error: 'Steam não conectada' });
    }

    if (!STEAM_API_KEY) {
      return res.status(500).json({ error: 'Steam API Key não configurada' });
    }

    const profileResp = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`
    );

    if (!profileResp.ok) {
      return res.status(500).json({ error: 'Erro ao buscar perfil da Steam' });
    }

    const profileData = await profileResp.json();
    const player = profileData.response?.players?.[0];
    
    if (!player) {
      return res.status(404).json({ error: 'Perfil Steam não encontrado' });
    }

    // Steam profile background (se tiver)
    const bannerUrl = player.profilebackground 
      ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/items/${player.profilebackground.substring(0, player.profilebackground.indexOf('_'))}/profile_background.jpg`
      : null;

    res.json({ 
      banner: bannerUrl,
      avatar: player.avatarfull,
      profileurl: player.profileurl
    });
  } catch (error) {
    console.error('Erro ao buscar banner Steam:', error.message);
    res.status(500).json({ error: 'Erro ao buscar banner' });
  }
});

// Get current connections state
router.get('/connections', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('connections');
    const c = user?.connections || {};
    res.json({
      steam: !!c.steam,
      details: c
    });
  } catch (error) {
    console.error('Erro ao obter conexões:', error.message);
    res.status(500).json({ error: 'Erro ao obter conexões' });
  }
});

// Connect platform (simple identifier-based for agora; OAuth pode substituir depois)
router.post('/connections/:platform/connect', authenticateToken, async (req, res) => {
  try {
    const { platform } = req.params;
    const allowed = ['steam'];
    if (!allowed.includes(platform)) {
      return res.status(400).json({ error: 'Plataforma inválida' });
    }

    const { identifier } = req.body; // e.g., steamid64

    // If no identifier and OAuth creds exist, we could start OAuth here
    if (!identifier) {
      // Retorna informação sobre configuração de OAuth (futuro)
      const oauthConfigured = (platform === 'steam' && STEAM_API_KEY);
      return res.status(400).json({
        error: 'Identifier ausente',
        hint: 'Envie um identificador (steamid64) no corpo. OAuth poderá ser adicionado depois.',
        oauthConfigured
      });
    }

    const user = await User.findById(req.user.userId);
    const current = user.connections || {};
    current[platform] = identifier;
    await User.findByIdAndUpdate(req.user.userId, { connections: current });

    res.json({ message: `${platform} conectado`, connections: current });
  } catch (error) {
    console.error('Erro ao conectar plataforma:', error.message);
    res.status(500).json({ error: 'Erro ao conectar plataforma' });
  }
});

// Disconnect platform
router.post('/connections/:platform/disconnect', authenticateToken, async (req, res) => {
  try {
    const { platform } = req.params;
    const allowed = ['steam'];
    if (!allowed.includes(platform)) {
      return res.status(400).json({ error: 'Plataforma inválida' });
    }

    const user = await User.findById(req.user.userId);
    const current = user.connections || {};
    delete current[platform];
    if (platform === 'steam') {
      delete current.steamFeaturedGame;
    }
    await User.findByIdAndUpdate(req.user.userId, { connections: current });

    res.json({ message: `${platform} desconectado`, connections: current });
  } catch (error) {
    console.error('Erro ao desconectar plataforma:', error.message);
    res.status(500).json({ error: 'Erro ao desconectar plataforma' });
  }
});

// Atualizar perfil
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const { displayName, bio, theme, backgroundEffect } = req.body;
    
    // Validar tema
    const validThemes = ['dark', 'light', 'neon', 'gradient'];
    const selectedTheme = validThemes.includes(theme) ? theme : 'dark';
    
    // Validar efeito de fundo
    const validEffects = ['none', 'falling-stars', 'floating-bubbles', 'black-hole', 'video'];
    const selectedEffect = validEffects.includes(backgroundEffect) ? backgroundEffect : 'none';

    await User.findByIdAndUpdate(
      req.user.userId,
      {
        displayName: displayName?.substring(0, 50) || '',
        bio: bio?.substring(0, 500) || '',
        theme: selectedTheme,
        backgroundEffect: selectedEffect
      },
      { new: true }
    );

    const user = await User.findById(req.user.userId).select('-password');

    res.json({
      message: 'Perfil atualizado com sucesso',
      user
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// Upload de avatar
router.post('/upload/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    await User.findByIdAndUpdate(req.user.userId, { avatar: `/uploads/${req.file.filename}` });

    res.json({
      message: 'Avatar atualizado com sucesso',
      avatar: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('Erro ao fazer upload de avatar:', error.message);
    res.status(500).json({ error: 'Erro ao fazer upload de avatar' });
  }
});

// Upload de banner
router.post('/upload/banner', authenticateToken, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    await User.findByIdAndUpdate(req.user.userId, { bannerImage: `/uploads/${req.file.filename}` });

    res.json({
      message: 'Banner atualizado com sucesso',
      banner: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    console.error('Erro ao fazer upload de banner:', error.message);
    res.status(500).json({ error: 'Erro ao fazer upload de banner' });
  }
});

// Upload de mídia (imagem, gif, áudio)
router.post('/upload/media', authenticateToken, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { title, description, type } = req.body;
    const validTypes = ['image', 'gif', 'audio'];
    const mediaType = validTypes.includes(type) ? type : 'image';

    const mediaItem = {
      type: mediaType,
      title: (title || req.file.originalname).substring(0, 100),
      description: (description || '').substring(0, 500),
      url: `/uploads/${req.file.filename}`,
      createdAt: new Date().toISOString()
    };

    const user = await User.findById(req.user.userId);
    const currentMedia = user.media || [];
    currentMedia.push(mediaItem);

    await User.findByIdAndUpdate(req.user.userId, { media: currentMedia });

    res.status(201).json({
      message: 'Mídia adicionada com sucesso',
      media: mediaItem
    });
  } catch (error) {
    console.error('Erro ao fazer upload de mídia:', error.message);
    res.status(500).json({ error: 'Erro ao fazer upload de mídia' });
  }
});

// Upload de áudio de fundo (toca em segundo plano sem aparecer no perfil)
router.post('/upload/background-audio', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado' });
    }

    const audioUrl = `/uploads/${req.file.filename}`;
    const deviceType = req.body.deviceType || 'desktop'; // 'desktop' ou 'mobile'

    const updateData = {};
    if (deviceType === 'mobile') {
      updateData.backgroundAudioMobile = audioUrl;
    } else {
      updateData.backgroundAudioDesktop = audioUrl;
    }

    await User.findByIdAndUpdate(req.user.userId, updateData);

    res.status(200).json({
      message: `Áudio de fundo para ${deviceType} atualizado com sucesso`,
      url: audioUrl
    });
  } catch (error) {
    console.error('Erro ao fazer upload de áudio de fundo:', error.message);
    res.status(500).json({ error: 'Erro ao fazer upload de áudio de fundo' });
  }
});

// Upload de vídeo de fundo (até 15 segundos)
router.post('/upload/background-video', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de vídeo enviado' });
    }

    const videoUrl = `/uploads/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user.userId, { 
      backgroundVideo: videoUrl,
      backgroundEffect: 'video' // Atualizar efeito para vídeo
    });

    res.status(200).json({
      message: 'Vídeo de fundo atualizado com sucesso',
      url: videoUrl
    });
  } catch (error) {
    console.error('Erro ao fazer upload de vídeo de fundo:', error.message);
    res.status(500).json({ error: 'Erro ao fazer upload de vídeo de fundo' });
  }
});

// Deletar mídia
router.delete('/media/:mediaId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const currentMedia = user.media || [];
    const filteredMedia = currentMedia.filter((_, index) => index.toString() !== req.params.mediaId);

    await User.findByIdAndUpdate(req.user.userId, { media: filteredMedia });

    res.json({
      message: 'Mídia deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar mídia:', error.message);
    res.status(500).json({ error: 'Erro ao deletar mídia' });
  }
});

// Adicionar link
router.post('/links/add', authenticateToken, async (req, res) => {
  try {
    const { title, url, type, platform } = req.body;

    if (!title || !url) {
      return res.status(400).json({ error: 'Título e URL são obrigatórios' });
    }

    // Validar URL básica
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'URL inválida' });
    }

    const validTypes = ['website', 'social', 'custom'];
    const linkType = validTypes.includes(type) ? type : 'custom';

    const validPlatforms = ['github','instagram','youtube','reddit','discord','x','twitter','tiktok','facebook','linkedin','twitch','spotify','soundcloud','pinterest','snapchat','patreon','behance','dribbble','medium','hashnode','devto','website','custom'];
    const safePlatform = validPlatforms.includes((platform || '').toLowerCase()) ? platform.toLowerCase() : 'custom';

    const mongoose = require('mongoose');
    const link = {
      _id: new mongoose.Types.ObjectId(),
      title: title.substring(0, 100),
      url,
      type: linkType,
      platform: safePlatform
    };

    const user = await User.findById(req.user.userId);
    const currentLinks = user.links || [];
    currentLinks.push(link);

    await User.findByIdAndUpdate(req.user.userId, { links: currentLinks });

    res.status(201).json({
      message: 'Link adicionado com sucesso',
      link
    });
  } catch (error) {
    console.error('Erro ao adicionar link:', error.message);
    res.status(500).json({ error: 'Erro ao adicionar link' });
  }
});

// Deletar link
router.delete('/links/:linkId', authenticateToken, async (req, res) => {
  try {
    const { linkId } = req.params;
    if (!linkId) {
      return res.status(400).json({ error: 'linkId é obrigatório' });
    }

    const user = await User.findById(req.user.userId);
    const currentLinks = user.links || [];

    let filteredLinks = currentLinks;
    if (mongoose.Types.ObjectId.isValid(linkId)) {
      filteredLinks = currentLinks.filter((link) => {
        const linkIdStr = link._id ? link._id.toString() : null;
        return linkIdStr !== linkId;
      });
    } else if (!Number.isNaN(Number(linkId))) {
      const idx = Number(linkId);
      filteredLinks = currentLinks.filter((_, i) => i !== idx);
    } else {
      return res.status(400).json({ error: 'Formato de linkId inválido' });
    }

    console.log(`Deletando link ${linkId} do usuário ${req.user.userId}`);
    console.log(`Links antes: ${currentLinks.length}, depois: ${filteredLinks.length}`);

    await User.findByIdAndUpdate(req.user.userId, { links: filteredLinks });

    res.json({ message: 'Link deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar link:', error.message);
    res.status(500).json({ error: 'Erro ao deletar link' });
  }
});

// Deletar avatar
router.post('/delete/avatar', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, { avatar: null });
    res.json({ message: 'Avatar removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar avatar:', error.message);
    res.status(500).json({ error: 'Erro ao deletar avatar' });
  }
});

// Deletar banner
router.post('/delete/banner', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, { bannerImage: null });
    res.json({ message: 'Banner removido com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar banner:', error.message);
    res.status(500).json({ error: 'Erro ao deletar banner' });
  }
});

// Atualizar email
router.post('/update-email', authenticateToken, async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    if (!newEmail || !currentPassword) {
      return res.status(400).json({ error: 'Novo email e senha atual são obrigatórios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const existingEmail = await User.findOne({ email: newEmail.toLowerCase() });
    if (existingEmail && existingEmail.id !== req.user.userId) {
      return res.status(400).json({ error: 'Email já está registrado' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const passwordOk = await user.comparePassword(currentPassword);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Senha atual inválida' });
    }

    user.email = newEmail.toLowerCase();
    await user.save();

    res.json({ message: 'Email atualizado com sucesso', email: user.email });
  } catch (error) {
    console.error('Erro ao atualizar email:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar email' });
  }
});

// Atualizar senha
router.post('/update-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const passwordOk = await user.comparePassword(currentPassword);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Senha atual inválida' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar senha:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar senha' });
  }
});

// Fornecer URL de autorização do Discord
router.get('/discord/auth-url', authenticateToken, (req, res) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
    return res.status(500).json({ error: 'Discord OAuth não configurado' });
  }

  const scope = encodeURIComponent('identify');
  const redirect = encodeURIComponent(DISCORD_REDIRECT_URI);
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${redirect}&scope=${scope}&prompt=consent`;
  res.json({ url: authUrl });
});

// Conectar conta do Discord usando o code de OAuth
router.post('/discord/connect', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código do Discord ausente' });

    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
      return res.status(500).json({ error: 'Discord OAuth não configurado' });
    }

    const tokenParams = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI
    });

    const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Vanta.io/1.0 (https://vanta.squareweb.app)'
      },
      body: tokenParams.toString()
    });

    if (!tokenResp.ok) {
      const body = await tokenResp.text();
      console.error('Discord token error:', body);
      return res.status(400).json({ error: 'Falha ao trocar código do Discord' });
    }

    const tokenData = await tokenResp.json();
    const userResp = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `${tokenData.token_type} ${tokenData.access_token}`,
        'Accept': 'application/json',
        'User-Agent': 'Vanta.io/1.0 (https://vanta.squareweb.app)'
      }
    });

    if (!userResp.ok) {
      const body = await userResp.text();
      console.error('Discord user error:', body);
      return res.status(400).json({ error: 'Falha ao obter dados do Discord' });
    }

    const discordUser = await userResp.json();

    // Garantir unicidade de vínculo (Mongoose)
    const existing = await User.findOne({ discordId: discordUser.id });
    if (existing && existing._id.toString() !== req.user.userId) {
      return res.status(400).json({ error: 'Esta conta do Discord já está vinculada a outro usuário' });
    }

    // Converter flags do Discord em badges
    const discordBadges = [];
    const publicFlags = discordUser.public_flags || 0;
    
    const discordFlagMap = {
      1: { code: 'discord_staff', name: 'Discord Staff', iconUrl: 'https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png' },
      2: { code: 'discord_partner', name: 'Parceiro Discord', iconUrl: 'https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png' },
      4: { code: 'hypesquad_events', name: 'HypeSquad Events', iconUrl: 'https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png' },
      8: { code: 'bug_hunter_1', name: 'Bug Hunter Nível 1', iconUrl: 'https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png' },
      64: { code: 'hypesquad_bravery', name: 'HypeSquad Bravery', iconUrl: 'https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png' },
      128: { code: 'hypesquad_brilliance', name: 'HypeSquad Brilliance', iconUrl: 'https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png' },
      256: { code: 'hypesquad_balance', name: 'HypeSquad Balance', iconUrl: 'https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png' },
      512: { code: 'early_supporter', name: 'Early Supporter', iconUrl: 'https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png' },
      16384: { code: 'bug_hunter_2', name: 'Bug Hunter Nível 2', iconUrl: 'https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png' },
      131072: { code: 'verified_bot_dev', name: 'Desenvolvedor de Bot Verificado', iconUrl: 'https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png' },
      4194304: { code: 'active_developer', name: 'Desenvolvedor Ativo', iconUrl: 'https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png' }
    };

    for (const [flag, badge] of Object.entries(discordFlagMap)) {
      if ((publicFlags & parseInt(flag)) !== 0) {
        discordBadges.push({
          code: badge.code,
          name: badge.name,
          iconUrl: badge.iconUrl,
          description: `Badge do Discord: ${badge.name}`,
          source: 'discord',
          awardedAt: new Date()
        });
      }
    }

    // Adicionar badge de Nitro (premium_type)
    const premiumType = discordUser.premium_type || 0;
    if (premiumType === 2) {
      discordBadges.push({
        code: 'discord_nitro',
        name: 'Discord Nitro',
        iconUrl: 'https://cdn.discordapp.com/badge-icons/0e291f67631e374140365a44a1574eae.png',
        description: 'Discord Nitro',
        source: 'discord',
        awardedAt: new Date()
      });
    } else if (premiumType === 1) {
      discordBadges.push({
        code: 'discord_nitro_classic',
        name: 'Discord Nitro Classic',
        iconUrl: 'https://cdn.discordapp.com/badge-icons/7e46d5595367ef7588c4e87feba64666.png',
        description: 'Discord Nitro Classic',
        source: 'discord',
        awardedAt: new Date()
      });
    }

    const update = {
      discordId: discordUser.id,
      discordUsername: `${discordUser.username}${discordUser.discriminator && discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`,
      discordAvatar: discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null,
      discordPublicFlags: typeof discordUser.public_flags === 'number' ? discordUser.public_flags : undefined,
      discordAvatarDecoration: discordUser.avatar_decoration_data?.asset
        ? `https://cdn.discordapp.com/avatar-decoration-presets/${discordUser.avatar_decoration_data.asset}.png?size=256`
        : (discordUser.avatar_decoration ? `https://cdn.discordapp.com/avatar-decoration-presets/${discordUser.avatar_decoration}.png?size=256` : undefined)
    };

    // Atualizar usuário e adicionar badges do Discord
    const user = await User.findById(req.user.userId);
    Object.assign(user, update);
    
    // Remover badges antigas do Discord e adicionar novas
    user.badges = (user.badges || []).filter(b => b.source !== 'discord');
    user.badges.push(...discordBadges);
    
    await user.save();
    
    const updatedUser = await User.findById(req.user.userId).select('-password');

    res.json({
      message: 'Discord conectado com sucesso',
      discord: {
        id: updatedUser.discordId,
        username: updatedUser.discordUsername,
        avatar: updatedUser.discordAvatar
      },
      badgesAdded: discordBadges.length
    });
  } catch (error) {
    console.error('Erro ao conectar Discord:', error.message);
    res.status(500).json({ error: 'Erro ao conectar Discord' });
  }
});

module.exports = router;
