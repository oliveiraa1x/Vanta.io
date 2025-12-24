import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdminDashboard() {
  const [q, setQ] = useState('');
  const [user, setUser] = useState(null);
  const [badge, setBadge] = useState({ code: '', name: '', iconUrl: '', description: '' });
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  const searchUser = async () => {
    try {
      setMsg('');
      const resp = await axios.get(`/api/admin/users/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(resp.data);
    } catch (e) {
      setUser(null);
      setMsg(e?.response?.data?.error || 'Falha na busca');
    }
  };

  const addBadge = async () => {
    try {
      if (!user?._id) return;
      const resp = await axios.post(`/api/admin/users/${user._id}/badges`, badge, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser({ ...user, badges: resp.data.badges });
      setBadge({ code: '', name: '', iconUrl: '', description: '' });
      setMsg('Badge atribuída');
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Erro ao atribuir badge');
    }
  };

  const removeBadge = async (code) => {
    try {
      if (!user?._id) return;
      const resp = await axios.delete(`/api/admin/users/${user._id}/badges/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser({ ...user, badges: resp.data.badges });
      setMsg('Badge removida');
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Erro ao remover badge');
    }
  };

  const saveBasics = async () => {
    try {
      const payload = { displayName: user.displayName, bio: user.bio, theme: user.theme };
      await axios.put(`/api/admin/users/${user._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setMsg('Perfil atualizado');
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Erro ao atualizar');
    }
  };

  return (
    <div style={{ color: '#fff', background: '#0f0f14', minHeight: '100vh' }}>
      <header style={{ background: '#1a1a2e', padding: '16px 24px', borderBottom: '1px solid #2d2d44', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/favicon.png" alt="Vanta.io" style={{ width: 32, height: 32 }} />
          <h1 style={{ margin: 0, fontSize: 20 }}>Admin Dashboard</h1>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', background: '#667eea', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Voltar ao Dashboard</button>
      </header>

      <div style={{ padding: 24 }}>
        <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 12, marginBottom: 24, border: '1px solid #2d2d44' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 18 }}>🔍 Buscar Usuário</h2>
          <p style={{ color: '#a0a0a0', marginBottom: 12, fontSize: 14 }}>Digite o username (ex: usuario123) ou ID do usuário para gerenciar perfil e badges</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <input 
              value={q} 
              onChange={e => setQ(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && searchUser()}
              placeholder="Digite username ou ID..." 
              style={{ 
                flex: 1, 
                padding: '12px 16px', 
                background: '#0f0f14', 
                border: '1px solid #2d2d44', 
                borderRadius: 8, 
                color: '#fff',
                fontSize: 14
              }} 
            />
            <button 
              onClick={searchUser} 
              style={{ 
                padding: '12px 32px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                border: 'none', 
                borderRadius: 8, 
                color: '#fff', 
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Buscar
            </button>
          </div>
        </div>

        {msg && (
          <div style={{ 
            padding: '12px 16px', 
            background: msg.toLowerCase().includes('erro') ? '#2e1a1a' : '#1a2e1a', 
            border: `1px solid ${msg.toLowerCase().includes('erro') ? '#f55' : '#5f5'}`,
            borderRadius: 8,
            marginBottom: 16,
            color: msg.toLowerCase().includes('erro') ? '#ff8888' : '#88ff88'
          }}>{msg}</div>
        )}

        {user && (
          <div style={{ display: 'grid', gap: 16, maxWidth: 900 }}>
            <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 12, border: '1px solid #2d2d44' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>👤 Perfil do Usuário</h2>
            <div style={{ display: 'grid', gap: 8 }}>
              <label>Username: <b>@{user.username}</b></label>
              <label>Email: <b>{user.email}</b></label>
              <label>Role: <b>{user.role}</b></label>
              <div>
                <div>Nome exibido</div>
                <input value={user.displayName || ''} onChange={e => setUser({ ...user, displayName: e.target.value })} style={{ width: '100%', padding: 8 }} />
              </div>
              <div>
                <div>Bio</div>
                <textarea value={user.bio || ''} onChange={e => setUser({ ...user, bio: e.target.value })} rows={3} style={{ width: '100%', padding: 8 }} />
              </div>
              <button onClick={saveBasics}>Salvar</button>
            </div>
          </div>

            <div style={{ background: '#1a1a2e', padding: 20, borderRadius: 12, border: '1px solid #2d2d44' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>🏅 Gerenciar Badges</h2>
            
            {/* Badges Quick Add */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: '#a0a0a0', marginBottom: 8 }}>🚀 Badges Rápidas:</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setBadge({ 
                    code: 'active_dev', 
                    name: 'Desenvolvedor Ativo', 
                    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2920/2920349.png',
                    description: 'Contribui ativamente para a comunidade'
                  })}
                  style={{ padding: '6px 12px', background: '#2d2d44', border: '1px solid #3d3d54', borderRadius: 6, color: '#fff', fontSize: 12, cursor: 'pointer' }}
                >
                  💻 Dev Ativo
                </button>
                <button 
                  onClick={() => setBadge({ 
                    code: 'founder_2025', 
                    name: 'Fundador 2025', 
                    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2949/2949908.png',
                    description: 'Membro fundador da plataforma'
                  })}
                  style={{ padding: '6px 12px', background: '#2d2d44', border: '1px solid #3d3d54', borderRadius: 6, color: '#fff', fontSize: 12, cursor: 'pointer' }}
                >
                  ⭐ Fundador
                </button>
                <button 
                  onClick={() => setBadge({ 
                    code: 'verified', 
                    name: 'Verificado', 
                    iconUrl: 'https://cdn-icons-png.flaticon.com/512/7595/7595571.png',
                    description: 'Conta verificada'
                  })}
                  style={{ padding: '6px 12px', background: '#2d2d44', border: '1px solid #3d3d54', borderRadius: 6, color: '#fff', fontSize: 12, cursor: 'pointer' }}
                >
                  ✓ Verificado
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              {(user.badges || []).map((b) => (
                <div key={b._id || b.code} style={{ border: '1px solid #2d2d44', borderRadius: 8, padding: 8, display: 'flex', gap: 8, alignItems: 'center', background: '#0f0f14' }}>
                  {b.iconUrl ? <img src={b.iconUrl} alt={b.name} style={{ width: 24, height: 24 }} /> : <span>🏅</span>}
                  <div>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <small style={{ color: '#aaa' }}>{b.code}</small>
                  </div>
                  <button onClick={() => removeBadge(b.code)} style={{ marginLeft: 8, padding: '4px 8px', background: '#2e1a1a', border: '1px solid #f55', borderRadius: 4, color: '#ff8888', cursor: 'pointer', fontSize: 12 }}>Remover</button>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <input value={badge.code} onChange={e => setBadge({ ...badge, code: e.target.value })} placeholder="Código (ex: founder_2025)" style={{ padding: 12, background: '#0f0f14', border: '1px solid #2d2d44', borderRadius: 8, color: '#fff' }} />
              <input value={badge.name} onChange={e => setBadge({ ...badge, name: e.target.value })} placeholder="Nome" style={{ padding: 12, background: '#0f0f14', border: '1px solid #2d2d44', borderRadius: 8, color: '#fff' }} />
              <input value={badge.iconUrl} onChange={e => setBadge({ ...badge, iconUrl: e.target.value })} placeholder="URL do ícone (opcional)" style={{ padding: 12, background: '#0f0f14', border: '1px solid #2d2d44', borderRadius: 8, color: '#fff' }} />
              <input value={badge.description} onChange={e => setBadge({ ...badge, description: e.target.value })} placeholder="Descrição (opcional)" style={{ padding: 12, background: '#0f0f14', border: '1px solid #2d2d44', borderRadius: 8, color: '#fff' }} />
              <button onClick={addBadge} style={{ padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Atribuir Badge</button>
            </div>
            </div>
          </div>
        )}

        {!user && !msg && (
          <div style={{ textAlign: 'center', padding: 40, color: '#a0a0a0' }}>
            <p>Use o campo de busca acima para encontrar um usuário</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
