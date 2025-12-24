import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import SoapFilm from '../components/SoapFilm';
import './Auth.css';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [authMethod, setAuthMethod] = useState(null); // 'email' | 'discord'
  const navigate = useNavigate();

  const checkUsername = async (name) => {
    if (name.length < 3) return;
    
    try {
      const response = await axios.get(`/api/auth/check-username/${name}`);
      setUsernameAvailable(response.data.available);
    } catch (err) {
      console.error('Erro ao verificar username');
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(value);
    checkUsername(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não correspondem');
      return;
    }

    if (usernameAvailable === false) {
      setError('Username já está em uso');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/register', {
        username,
        email,
        password
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar');
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
              Já tem conta? <Link to="/login">Fazer login</Link>
            </p>
          </div>
        )}

        {authMethod === 'email' && (
          <>
            <h2>Crie sua conta</h2>
            <p>Comece seu perfil personalizado agora</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">
                  Username 
                  {usernameAvailable === true && <span className="status-ok">✓</span>}
                  {usernameAvailable === false && <span className="status-error">✗</span>}
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="seu_username"
                  required
                  maxLength="20"
                />
                <small>Seu perfil estará em vanta.io/@{username || 'username'}</small>
              </div>

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
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmar Senha</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength="6"
                />
              </div>

              <button type="submit" disabled={loading || usernameAvailable === false}>
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>

            <p className="auth-link">
              Já tem conta? <Link to="/login">Fazer login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Register;
