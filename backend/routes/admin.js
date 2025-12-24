const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');
const User = require('../models/User');

const router = express.Router();

// Verificar se o token é de admin
router.get('/me', authenticateToken, isAdmin, async (req, res) => {
  try {
    const me = await User.findById(req.user.userId).select('username email role');
    res.json({ ok: true, user: me });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao verificar admin' });
  }
});

// Buscar usuário por id ou username
router.get('/users/search', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Parâmetro q é obrigatório' });
    let user = null;
    if (q.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(q).select('-password');
    }
    if (!user) {
      user = await User.findOne({ username: q.toLowerCase() }).select('-password');
    }
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (e) {
    console.error('admin search error', e);
    res.status(500).json({ error: 'Erro na busca' });
  }
});

// Atribuir badge ao usuário
router.post('/users/:id/badges', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, iconUrl, description } = req.body || {};
    if (!code || !name) return res.status(400).json({ error: 'code e name são obrigatórios' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const exists = (user.badges || []).some(b => b.code === code);
    if (exists) return res.status(400).json({ error: 'Badge já atribuída' });

    user.badges = user.badges || [];
    user.badges.push({ code, name, iconUrl, description, source: 'admin', awardedAt: new Date() });
    await user.save();

    res.json({ message: 'Badge atribuída', badges: user.badges });
  } catch (e) {
    console.error('add badge error', e);
    res.status(500).json({ error: 'Erro ao atribuir badge' });
  }
});

// Remover badge
router.delete('/users/:id/badges/:code', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id, code } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    user.badges = (user.badges || []).filter(b => b.code !== code);
    await user.save();
    res.json({ message: 'Badge removida', badges: user.badges });
  } catch (e) {
    console.error('remove badge error', e);
    res.status(500).json({ error: 'Erro ao remover badge' });
  }
});

// Editar perfil (campos básicos)
router.put('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['displayName', 'bio', 'theme'];
    const update = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];
    const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Perfil atualizado', user });
  } catch (e) {
    console.error('admin edit error', e);
    res.status(500).json({ error: 'Erro ao editar perfil' });
  }
});

module.exports = router;
