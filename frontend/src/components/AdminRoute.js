import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!token) { setLoading(false); setIsAdmin(false); return; }
      try {
        const resp = await axios.get('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } });
        console.log('Admin check response:', resp.data);
        setIsAdmin(resp.data?.user?.role === 'admin');
      } catch (e) {
        console.error('Admin check error:', e.response?.status, e.response?.data);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  if (loading) return (
    <div style={{padding: 24, color: '#fff', background: '#0f0f14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div>Verificando permissões de administrador...</div>
    </div>
  );
  if (!isAdmin) return (
    <div style={{padding: 24, color: '#fff', background: '#0f0f14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{textAlign: 'center'}}>
        <h2>⛔ Acesso Negado</h2>
        <p style={{color: '#a0a0a0'}}>Você não tem permissão de administrador.</p>
        <p style={{color: '#a0a0a0', fontSize: 14}}>Se você é admin, faça logout e login novamente.</p>
        <button onClick={() => window.location.href = '/dashboard'} style={{marginTop: 16, padding: '12px 24px', background: '#667eea', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer'}}>Voltar ao Dashboard</button>
      </div>
    </div>
  );
  return children;
}

export default AdminRoute;
