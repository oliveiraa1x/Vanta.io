const express = require('express');
const User = require('../models/User');

const router = express.Router();

console.log('Carregando rotas de perfil público');

// Listar todos os usuários públicos para a home page
router.get('/public/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('username displayName avatar bio theme')
      .limit(50)
      .sort({ createdAt: -1 });
    
    res.json(users || []);
  } catch (error) {
    console.error('Erro ao buscar usuários públicos:', error.message);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Obter perfil público por username com @
router.get('/@:username', async (req, res) => {
  try {
    let { username } = req.params;
    
    // Remove o @ do username se estiver presente
    username = username.replace(/^@/, '');
    
    console.log('Rota /@:username - Buscando:', username);

    if (!username || username.length < 1) {
      return res.status(400).json({ error: 'Username inválido' });
    }

    const user = await User.findOne({ username: username.toLowerCase() })
      .select('username displayName bio avatar bannerImage theme backgroundEffect links media createdAt');
    
    console.log('Usuário encontrado:', user ? 'SIM' : 'NÃO');
    
    if (!user) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    res.json({
      username: user.username,
      profile: {
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        bannerImage: user.bannerImage,
        theme: user.theme,
        backgroundEffect: user.backgroundEffect,
        links: user.links || [],
        media: user.media || []
      },
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Erro ao buscar perfil público:', error.message);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Obter perfil público por username SEM @
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    // Ignorar rotas de API e outras rotas conhecidas
    if (username.startsWith('api') || username === 'login' || username === 'register' || username === 'dashboard' || username === 'auth' || username === 'profile') {
      return res.status(400).json({ error: 'Username inválido' });
    }
    
    console.log('Rota /:username - Buscando:', username);

    if (!username || username.length < 1) {
      return res.status(400).json({ error: 'Username inválido' });
    }

    const user = await User.findOne({ username: username.toLowerCase() })
      .select('username displayName bio avatar bannerImage theme backgroundEffect links media createdAt');
    
    console.log('Usuário encontrado:', user ? 'SIM' : 'NÃO');
    
    if (!user) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    res.json({
      username: user.username,
      profile: {
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        bannerImage: user.bannerImage,
        theme: user.theme,
        backgroundEffect: user.backgroundEffect,
        links: user.links || [],
        media: user.media || []
      },
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Erro ao buscar perfil público:', error.message);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

// Verificar disponibilidade de username
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Validar username
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({ 
        available: false,
        reason: 'Username deve ter entre 3 e 20 caracteres'
      });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    
    res.json({
      available: !user,
      username
    });
  } catch (error) {
    console.error('Erro ao verificar username:', error.message);
    res.status(500).json({ error: 'Erro ao verificar username' });
  }
});

module.exports = router;
