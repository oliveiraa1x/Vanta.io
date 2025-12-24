import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import SoapFilm from '../components/SoapFilm';
import './Auth.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState(null); // 'email' | 'discord'
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = () => {
    setLoading(true);
    window.location.href = '/api/auth/discord';
  };

  return (
    <div className="auth-container">
      <SoapFilm />
      <div className="auth-card">
        <div className="brand-header">
          <img src="/favicon.png" alt="Vanta.io" className="brand-logo" />
          <h1>Vanta.io</h1>
        </div>

        {!authMethod && (
          <div className="auth-choice">
            <h2>Como quer continuar?</h2>
            <p>Conecte com Discord ou use seu email.</p>
            <div className="auth-choice-buttons">
              <button type="button" className="btn-discord" onClick={handleDiscordLogin} disabled={loading}>
                Entrar com Discord
              </button>
              <button type="button" className="btn-email" onClick={() => setAuthMethod('email')}>
                Usar email
              </button>
            </div>
            <p className="auth-link">
              Não tem conta? <Link to="/register">Criar conta</Link>
            </p>
          </div>
        )}

        {authMethod === 'email' && (
          <>
            <h2>Bem-vindo de volta</h2>
            <p>Faça login para gerenciar seu perfil</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Senha</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button type="submit" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="auth-link">
              Não tem conta? <Link to="/register">Criar conta</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
