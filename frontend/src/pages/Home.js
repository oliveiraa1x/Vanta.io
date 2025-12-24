import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import FloatingBubbles from '../components/FloatingBubbles';
import './Home.css';

function Home() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/public/users');
      setUsers(response.data || []);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setError('Erro ao carregar perfis');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  return (
    <div className="home-container">
      <FloatingBubbles primaryColor="#06b6d4" secondaryColor="#8b5cf6" />
      
      {/* Header */}
      <header className="home-header">
        <div className="header-content">
          <h1 className="logo">🎯 Vanta.io</h1>
          <div className="header-actions">
            {token ? (
              <>
                <button onClick={() => navigate('/dashboard')} className="btn-primary">
                  Dashboard
                </button>
                <button onClick={handleLogout} className="btn-secondary">
                  Sair
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="btn-secondary">
                  Login
                </button>
                <button onClick={() => navigate('/register')} className="btn-primary">
                  Registrar
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h2>Bem-vindo ao Vanta.io</h2>
          <p>Explore perfis personalizados únicos e inspire-se</p>
        </div>
      </section>

      {/* Profiles Section */}
      <section className="profiles-section">
        <div className="section-container">
          <div className="section-header">
            <h3 className="section-title">Perfis Online</h3>
            {!loading && (
              <span className="section-subtitle">Perfis cadastrados: {users.length}</span>
            )}
          </div>
          
          {loading && <div className="loading">Carregando perfis...</div>}
          {error && <div className="error">{error}</div>}
          
          {!loading && users.length === 0 && (
            <div className="empty-state">
              <p>Nenhum perfil cadastrado ainda. Seja o primeiro!</p>
              <button onClick={() => navigate('/register')} className="btn-primary">
                Criar Perfil
              </button>
            </div>
          )}

          {!loading && users.length > 0 && (
            <div className="profiles-grid">
              {users.map(user => (
                <div
                  key={user._id}
                  className="profile-card"
                  onClick={() => navigate(`/@${user.username}`)}
                >
                  <div className="profile-image">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.displayName || user.username} />
                    ) : (
                      <div className="avatar-placeholder">
                        {(user.displayName || user.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="profile-info">
                    <h4>{user.displayName || user.username}</h4>
                    <p className="username">@{user.username}</p>
                    {user.bio && <p className="bio">{user.bio.substring(0, 60)}...</p>}
                  </div>
                  <div className="profile-hover">
                    <span>Ver Perfil →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;
