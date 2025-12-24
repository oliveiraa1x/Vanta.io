const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso de administrador necessário' });
  }
  next();
};

module.exports = { isAdmin };
