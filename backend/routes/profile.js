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

// Atualizar perfil
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const { displayName, bio, theme, backgroundEffect } = req.body;
    
    // Validar tema
    const validThemes = ['dark', 'light', 'neon', 'gradient'];
    const selectedTheme = validThemes.includes(theme) ? theme : 'dark';
    
    // Validar efeito de fundo
    const validEffects = ['none', 'falling-stars', 'floating-bubbles', 'black-hole'];
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

    const update = {
      discordId: discordUser.id,
      discordUsername: `${discordUser.username}${discordUser.discriminator && discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`,
      discordAvatar: discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null
    };

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      update,
      { new: true }
    ).select('-password');

    res.json({
      message: 'Discord conectado com sucesso',
      discord: {
        id: user.discordId,
        username: user.discordUsername,
        avatar: user.discordAvatar
      }
    });
  } catch (error) {
    console.error('Erro ao conectar Discord:', error.message);
    res.status(500).json({ error: 'Erro ao conectar Discord' });
  }
});

module.exports = router;
