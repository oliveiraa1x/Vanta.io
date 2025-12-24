import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HolographicWaves from '../components/HolographicWaves';
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
      console.log('Usuários recebidos:', response.data);
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
    <div className="home-page">
      <HolographicWaves />

      <header className="home-header">
        <div className="header-inner">
          <div className="brand">
            <img src="/favicon.png" alt="Vanta.io" className="brand-logo" />
            <div>
              <p className="brand-name">Vanta.io</p>
              <p className="brand-tag">Identidades digitais</p>
            </div>
          </div>

          <nav className="top-links">
            <button onClick={() => document.getElementById('profiles')?.scrollIntoView({ behavior: 'smooth' })} className="link">Perfis</button>
            <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="link">Sobre</button>
            <button onClick={() => document.getElementById('connections')?.scrollIntoView({ behavior: 'smooth' })} className="link">Conexões</button>
          </nav>

          <div className="header-actions">
            {token ? (
              <>
                <button className="btn-outline" onClick={() => navigate('/dashboard')}>Dashboard</button>
                <button className="btn-ghost" onClick={handleLogout}>Sair</button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => navigate('/login')}>Login</button>
                <button className="btn-primary" onClick={() => navigate('/register')}>Criar perfil</button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Login / Cadastro</p>
            <h1>VANTA.IO</h1>
            <p className="hero-sub">Seja bem-vindo(a)</p>
            <div className="hero-cta">
              <button className="btn-primary" onClick={() => navigate('/register')}>Criar perfil</button>
              <button className="btn-outline" onClick={() => navigate('/login')}>Entrar</button>
            </div>
          </div>
        </section>

        <section id="about" className="info-panels">
          <div className="panel">
            <div className="panel-title">Sobre</div>
            <div className="panel-body">
              <ul>
                <li>Com o Vanta.io, personalize seu perfil de maneira única.</li>
                <li>Conecte Discord, Steam e Xbox e adicione música, GIFs em banner e avatar.</li>
                <li>Conquiste insignias exclusivas para o seu perfil.</li>
              </ul>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Agradecimentos</div>
            <div className="panel-body">
              <ul>
                <li>Agradecemos por escolher o Vanta.io! Entre no Discord e compartilhe feedback.</li>
                <li>Estamos evoluindo junto com a comunidade.</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="connections" className="connections">
          <div className="connections-visual">
            <h2>Suas conexões</h2>
            <p>Integre suas plataformas e mantenha tudo em um link.</p>
          </div>

          <div className="timeline">
            <div className="timeline-item">
              <span className="dot" />
              <div>
                <h4>Discord</h4>
                <p>Personalize com banner, avatar e elementos exclusivos sincronizados.</p>
              </div>
            </div>
            <div className="timeline-item">
              <span className="dot" />
              <div>
                <h4>Steam</h4>
                <p>Mostre jogos favoritos e conquistas em uma experiência única.</p>
              </div>
            </div>
            <div className="timeline-item">
              <span className="dot" />
              <div>
                <h4>Xbox</h4>
                <p>Exiba jogos, conquistas e personalizações direto no seu perfil.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="profiles" className="profiles-block">
          <div className="profiles-header">
            <h2>Perfis Online</h2>
            {!loading && <span className="count">{users.length} publicados</span>}
          </div>

          {loading && <div className="loading">Carregando perfis...</div>}
          {error && <div className="error">{error}</div>}

          {!loading && users.length === 0 && (
            <div className="empty-state">
              <p>Nenhum perfil publicado ainda. Seja o primeiro a criar o seu.</p>
              <button className="btn-primary" onClick={() => navigate('/register')}>Criar perfil agora</button>
            </div>
          )}

          {!loading && users.length > 0 && (
            <div className="profiles-grid">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="profile-card"
                  onClick={() => navigate(`/@${user.username}`)}
                >
                  <div className="profile-thumb">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.displayName || user.username} />
                    ) : (
                      <div className="avatar-placeholder">
                        {(user.displayName || user.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="profile-meta">
                    <h4>{user.displayName || user.username}</h4>
                    <p className="username">@{user.username}</p>
                    {user.bio && <p className="bio">{user.bio.substring(0, 40)}...</p>}
                  </div>
                  <div className="profile-link">Ver perfil →</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="cta-final">
          <div className="cta-card">
            <div>
              <p className="eyebrow">Tudo em um link</p>
              <h3>Publique seu perfil e mostre quem você é.</h3>
            </div>
            <div className="cta-actions">
              <button className="btn-primary" onClick={() => navigate('/register')}>Criar perfil</button>
              <button className="btn-outline" onClick={() => navigate('/login')}>Entrar</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
