const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_aqui';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const TOKEN_EXPIRY = '30d';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_REDIRECT_URI_OVERRIDE = process.env.DISCORD_REDIRECT_URI || ''; // Fallback se precisar
// Callback dinâmico: detecta automaticamente https://<host>/api/auth/discord/callback
function getBackendDiscordRedirect(req) {
  // Se houver DISCORD_REDIRECT_URI explícito, use
  if (DISCORD_REDIRECT_URI_OVERRIDE) return DISCORD_REDIRECT_URI_OVERRIDE;
  
  const protocol = req.protocol || (req.secure ? 'https' : 'http');
  const host = req.get('host') || 'localhost:5000';
  // Remove port padrão da URL
  const displayHost = host.replace(':80', '').replace(':443', '');
  return `${protocol}://${displayHost}/api/auth/discord/callback`;
}

// Registro
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Validar senha (mínimo 6 caracteres)
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }

    // Verificar se username já existe
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username já está em uso' });
    }

    // Verificar se email já existe
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email já está registrado' });
    }

    // Criar novo usuário
    let role = 'user';
    if (ADMIN_EMAILS.includes(email.toLowerCase())) role = 'admin';

    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      displayName: username,
      role
    });

    // Gerar token
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.status(201).json({
      message: 'Usuário registrado com sucesso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erro ao registrar:', error.message);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Encontrar usuário
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Verificar senha
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Marcar admin por email se aplicável
    if (ADMIN_EMAILS.includes(user.email.toLowerCase()) && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    // Gerar token
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error.message);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

module.exports = router;

// ==========================
// OAuth Discord (Login)
// ==========================

// Iniciar OAuth do Discord (redireciona para Discord)
router.get('/discord', (req, res) => {
  try {
    if (!DISCORD_CLIENT_ID) {
      return res.status(500).send('Discord OAuth não configurado');
    }
    const redirectUri = encodeURIComponent(getBackendDiscordRedirect(req));
    const scope = encodeURIComponent('identify email');
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}&prompt=consent`;
    return res.redirect(authUrl);
  } catch (e) {
    console.error('Erro ao iniciar OAuth Discord:', e.message);
    return res.status(500).send('Erro ao iniciar OAuth Discord');
  }
});

// Callback do Discord -> cria/loga usuário e redireciona para o frontend com token
router.get('/discord/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Código ausente');
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      return res.status(500).send('Discord OAuth não configurado');
    }

    const redirectUri = getBackendDiscordRedirect(req);
    const tokenParams = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    });

    const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: tokenParams.toString()
    });
    if (!tokenResp.ok) {
      const body = await tokenResp.text();
      console.error('Discord token error (auth):', body);
      return res.status(400).send('Falha ao trocar código do Discord');
    }
    const tokenData = await tokenResp.json();

    const userResp = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `${tokenData.token_type} ${tokenData.access_token}`, 'Accept': 'application/json' }
    });
    if (!userResp.ok) {
      const body = await userResp.text();
      console.error('Discord user error (auth):', body);
      return res.status(400).send('Falha ao obter dados do Discord');
    }
    const discordUser = await userResp.json();

    // Construir username e email
    const baseUsername = String(discordUser.username || `user_${discordUser.id}`).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    let username = baseUsername || `user_${discordUser.id}`;
    // Garantir unicidade
    let suffix = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await User.findOne({ username });
      if (!existing) break;
      suffix += 1;
      username = `${baseUsername}${suffix}`.slice(0, 20);
    }

    // Email do Discord pode não existir sem escopo; fallback
    const email = (discordUser.email || `${discordUser.id}@discord.local`).toLowerCase();

    // Converter Discord public flags em badges
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
    // Adicionar Nitro/Nitro Classic
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

    // Encontrar usuário por discordId ou email
    let user = await User.findOne({ $or: [{ discordId: discordUser.id }, { email }] });
    if (!user) {
      const randomPass = require('crypto').randomBytes(16).toString('hex');
      let role = 'user';
      if (email && ADMIN_EMAILS.includes(email)) role = 'admin';
      user = await User.create({
        username,
        email,
        password: randomPass,
        displayName: discordUser.global_name || discordUser.username || username,
        role,
        discordId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : undefined,
        discordPublicFlags: discordUser.public_flags,
        discordAvatarDecoration: discordUser.avatar_decoration_data?.asset ? `https://cdn.discordapp.com/avatar-decoration-presets/${discordUser.avatar_decoration_data.asset}.png` : undefined,
        badges: discordBadges
      });
    } else {
      // Atualizar dados básicos do Discord
      user.discordId = discordUser.id;
      user.discordUsername = discordUser.username;
      user.discordAvatar = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : user.discordAvatar;
      user.discordPublicFlags = discordUser.public_flags;
      user.discordAvatarDecoration = discordUser.avatar_decoration_data?.asset ? `https://cdn.discordapp.com/avatar-decoration-presets/${discordUser.avatar_decoration_data.asset}.png` : user.discordAvatarDecoration;
      // Atualizar badges do Discord (remover antigas, adicionar novas)
      user.badges = user.badges.filter(b => b.source !== 'discord');
      user.badges.push(...discordBadges);
      if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) user.role = 'admin';
      await user.save();
    }

    // Gerar token JWT
    const token = jwt.sign({ userId: user._id.toString(), username: user.username, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    const frontendBase = (process.env.FRONTEND_URL || '').split(',')[0]?.trim() || 'http://localhost:3000';
    const redirectFinal = `${frontendBase}/dashboard?token=${encodeURIComponent(token)}`;
    return res.redirect(302, redirectFinal);
  } catch (e) {
    console.error('Erro no callback do Discord (auth):', e.message);
    return res.status(500).send('Erro no login com Discord');
  }
});
