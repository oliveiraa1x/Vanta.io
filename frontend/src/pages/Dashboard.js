import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [theme, setTheme] = useState('dark');
  const [backgroundEffect, setBackgroundEffect] = useState('none');
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [links, setLinks] = useState([]);
  const [media, setMedia] = useState([]);
  const [newLink, setNewLink] = useState({ title: '', url: '', platform: 'custom' });
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordUsername, setDiscordUsername] = useState('');
  const [discordAuthUrl, setDiscordAuthUrl] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  // Social connections
  const [connections, setConnections] = useState({ steam: false });
  const [steamGames, setSteamGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loadingGames, setLoadingGames] = useState(false);
  // Background audio e video
  const [backgroundAudio, setBackgroundAudio] = useState('');
  const [backgroundAudioDesktop, setBackgroundAudioDesktop] = useState('');
  const [backgroundAudioMobile, setBackgroundAudioMobile] = useState('');
  const [backgroundVideo, setBackgroundVideo] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
    // Detectar se é mobile
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    setIsMobile(/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua.toLowerCase()));
  }, []);

  const fetchDiscordAuthUrl = async () => {
    try {
      const token = localStorage.getItem('token');
      const resp = await axios.get('/api/profile/discord/auth-url', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDiscordAuthUrl(resp.data.url);
    } catch (error) {
      console.error('Erro ao obter URL do Discord:', error?.response?.data || error.message);
    }
  };

  useEffect(() => {
    fetchDiscordAuthUrl();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromCallback = params.get('token');
    if (tokenFromCallback) {
      localStorage.setItem('token', tokenFromCallback);
      // Limpar token da URL
      params.delete('token');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
      // Carregar dados com o novo token
      fetchUserData();
    }
    const discordCode = params.get('code');
    if (discordCode) {
      handleConnectDiscord(discordCode);
      params.delete('code');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }

    // Handle Steam OpenID callback
    const steamMode = params.get('openid.mode');
    if (steamMode === 'id_res') {
      handleConnectSteam(params);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/profile/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Dados do usuário carregados:', response.data);
      setUser(response.data);
      setDisplayName(response.data.displayName || '');
      setBio(response.data.bio || '');
      setTheme(response.data.theme || 'dark');
      setBackgroundEffect(response.data.backgroundEffect || 'none');
      setBackgroundAudio(response.data.backgroundAudio || '');
      setBackgroundAudioDesktop(response.data.backgroundAudioDesktop || '');
      setBackgroundAudioMobile(response.data.backgroundAudioMobile || '');
      setBackgroundVideo(response.data.backgroundVideo || '');
      setLinks(response.data.links || []);
      setMedia(response.data.media || []);
      // badges são somente leitura para membros
      // response.data.badges disponível após atualização do backend
      // If backend returns connections within user object
      if (response.data.connections) {
        setConnections({
          steam: !!response.data.connections.steam,
        });
      }
      // Discord connection status would come from backend when available
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const token = localStorage.getItem('token');
      const resp = await axios.get('/api/profile/connections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = resp.data || {};
      setConnections({
        steam: !!data.steam,
      });

      // Se Steam conectada, buscar jogos
      if (data.steam) {
        fetchSteamGames();
      }
    } catch (error) {
      console.warn('Não foi possível buscar conexões', error?.response?.data || error.message);
    }
  };

  const fetchSteamGames = async () => {
    try {
      setLoadingGames(true);
      const token = localStorage.getItem('token');
      const resp = await axios.get('/api/profile/steam/games', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSteamGames(resp.data.games || []);
    } catch (error) {
      console.warn('Erro ao buscar jogos Steam:', error?.response?.data || error.message);
    } finally {
      setLoadingGames(false);
    }
  };

  const handleSelectGame = async (game) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/profile/steam/featured-game', game, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedGame(game);
      setMessage('Jogo destacado atualizado!');
    } catch (error) {
      setMessage(error?.response?.data?.error || 'Erro ao selecionar jogo');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  useEffect(() => { fetchConnections(); }, []);

  const handleConnectPlatform = async (platform) => {
    try {
      if (platform === 'steam') {
        // Redirecionar para Steam OpenID
        const token = localStorage.getItem('token');
        const resp = await axios.get('/api/profile/steam/auth-url', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.data.url) {
          window.location.href = resp.data.url;
        }
        return;
      }

      const token = localStorage.getItem('token');
      await axios.post(`/api/profile/connections/${platform}/connect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(`${platform} conectado com sucesso!`);
      await fetchConnections();
    } catch (error) {
      setMessage(error?.response?.data?.error || `Erro ao conectar ${platform}`);
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDisconnectPlatform = async (platform) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/profile/connections/${platform}/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(`${platform} desconectado com sucesso!`);
      await fetchConnections();
    } catch (error) {
      setMessage(error?.response?.data?.error || `Erro ao desconectar ${platform}`);
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('/api/profile/update', {
        displayName,
        bio,
        theme,
        backgroundEffect
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Perfil atualizado com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/profile/upload/avatar', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage('Avatar atualizado com sucesso!');
      fetchUserData();
    } catch (error) {
      setMessage('Erro ao fazer upload do avatar');
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/profile/delete/avatar', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Avatar removido com sucesso!');
      fetchUserData();
    } catch (error) {
      setMessage('Erro ao remover avatar');
    }
  };

  const handleDeleteBanner = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/profile/delete/banner', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Banner removido com sucesso!');
      fetchUserData();
    } catch (error) {
      setMessage('Erro ao remover banner');
    }
  };


  const handleUploadMedia = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const mediaType = file.type.startsWith('audio') ? 'audio' : 
                      file.type.startsWith('image') ? 'image' : 'image';

    const formData = new FormData();
    formData.append('media', file);
    formData.append('title', file.name);
    formData.append('type', mediaType);

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/profile/upload/media', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage('Mídia adicionada com sucesso!');
      fetchUserData();
    } catch (error) {
      setMessage('Erro ao fazer upload da mídia');
    }
  };

  const handleUploadBackgroundAudio = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('deviceType', isMobile ? 'mobile' : 'desktop');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/profile/upload/background-audio', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (isMobile) {
        setBackgroundAudioMobile(response.data.url);
      } else {
        setBackgroundAudioDesktop(response.data.url);
      }
      setMessage(`Áudio de fundo atualizado para ${isMobile ? 'mobile' : 'desktop'}!`);
      // Recarregar dados do usuário para garantir sincronização
      await fetchUserData();
    } catch (error) {
      setMessage('Erro ao fazer upload do áudio de fundo');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleUploadBackgroundVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar duração do vídeo (15s)
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = async function() {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > 15) {
        setMessage('O vídeo deve ter no máximo 15 segundos!');
        return;
      }

      const formData = new FormData();
      formData.append('video', file);

      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('/api/profile/upload/background-video', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setBackgroundVideo(response.data.url);
        setBackgroundEffect('video');
        setMessage('Vídeo de fundo atualizado!');
        // Recarregar dados do usuário para garantir sincronização
        await fetchUserData();
      } catch (error) {
        setMessage('Erro ao fazer upload do vídeo de fundo');
      } finally {
        setTimeout(() => setMessage(''), 3000);
      }
    };

    video.src = URL.createObjectURL(file);
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!newLink.title || !newLink.url) return;

    try {
      const token = localStorage.getItem('token');
      const platform = (newLink.platform || 'custom').toLowerCase();
      const derivedType = ['github','instagram','youtube','reddit','discord','x','twitter','tiktok','facebook','linkedin','twitch'].includes(platform) ? 'social' : (platform === 'website' ? 'website' : 'custom');

      await axios.post('/api/profile/links/add', { 
        title: newLink.title,
        url: newLink.url,
        type: derivedType,
        platform
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewLink({ title: '', url: '', platform: 'custom' });
      setMessage('Link adicionado com sucesso!');
      fetchUserData();
    } catch (error) {
      setMessage('Erro ao adicionar link');
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/profile/media/${mediaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Mídia deletada com sucesso!');
      fetchUserData();
    } catch (error) {
      setMessage('Erro ao deletar mídia');
    }
  };

  const handleDeleteLink = async (linkId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/profile/links/${linkId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Link deletado com sucesso!');
      fetchUserData();
    } catch (error) {
      setMessage('Erro ao deletar link');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleConnectDiscord = async (codeFromCallback) => {
    try {
      if (codeFromCallback) {
        const token = localStorage.getItem('token');
        await axios.post('/api/profile/discord/connect', { code: codeFromCallback }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessage('Discord conectado com sucesso!');
        fetchUserData();
        return;
      }

      if (discordAuthUrl) {
        window.location.href = discordAuthUrl;
      } else {
        setMessage('Discord OAuth não configurado');
      }
    } catch (error) {
      console.error('Erro ao conectar Discord', error?.response?.data || error.message);
      setMessage(error?.response?.data?.error || 'Erro ao conectar Discord');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleConnectSteam = async (params) => {
    try {
      const token = localStorage.getItem('token');
      const openidParams = {};
      for (const [key, value] of params.entries()) {
        if (key.startsWith('openid.')) {
          openidParams[key] = value;
        }
      }

      await axios.post('/api/profile/steam/connect', { openidParams }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Steam conectado com sucesso!');
      fetchUserData();
      fetchConnections();
      
      // Limpar URL
      window.history.replaceState({}, '', window.location.pathname);
    } catch (error) {
      console.error('Erro ao conectar Steam', error?.response?.data || error.message);
      setMessage(error?.response?.data?.error || 'Erro ao conectar Steam');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/profile/update-email', {
        newEmail,
        currentPassword: emailPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Email atualizado com sucesso!');
      setNewEmail('');
      setEmailPassword('');
      fetchUserData();
    } catch (error) {
      setMessage(error?.response?.data?.error || 'Erro ao atualizar email');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/profile/update-password', {
        currentPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Senha atualizada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      setMessage(error?.response?.data?.error || 'Erro ao atualizar senha');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const uidTag = user?._id ? `#${user._id.slice(-6)}` : '#000000';
  const maskedEmail = user?.email
    ? `${user.email.slice(0, 2)}***${user.email.slice(-8)}`
    : 'email não definido';
  const completionPercent = Math.min(
    100,
    20 + (user?.avatar ? 20 : 0) + (bio ? 20 : 0) + (links.length ? 20 : 0) + (media.length ? 20 : 0)
  );

  const accountTasks = [
    { label: 'Enviar um avatar', done: !!user?.avatar },
    { label: 'Adicionar uma descrição', done: !!bio },
    { label: 'Vincular conta do Discord', done: discordConnected },
    { label: 'Adicionar redes sociais', done: links.length > 0 },
  ];

  if (loading) return <div className="loading">Carregando...</div>;

  const profileUrl = `${window.location.origin}/${user?.username}`;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-brand">
            <img src="/favicon.png" alt="Vanta.io" className="brand-logo" />
            <h1>Vanta.io Dashboard</h1>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {user?.role === 'admin' && (
              <button onClick={() => navigate('/admin')} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                🔧 Admin
              </button>
            )}
            <button onClick={handleLogout} className="logout-btn">Sair</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <nav className="dashboard-nav">
          <button 
            className={`nav-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            Conta
          </button>
          <button 
            className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Perfil
          </button>
          <button 
            className={`nav-btn ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            Mídia
          </button>
          <button 
            className={`nav-btn ${activeTab === 'links' ? 'active' : ''}`}
            onClick={() => setActiveTab('links')}
          >
            Links
          </button>
          <button 
            className={`nav-btn ${activeTab === 'connections' ? 'active' : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            Conexões
          </button>
          <button 
            className={`nav-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Pré-visualização
          </button>
        </nav>

        <div className="dashboard-main">
          {message && <div className={`message ${message.includes('sucesso') ? 'success' : 'error'}`}>{message}</div>}

          {activeTab === 'profile' && (
            <section className="section">
              <h2>Configurações do Perfil</h2>
              
              <div className="profile-url">
                <p>Seu perfil está em:</p>
                <code>{profileUrl}</code>
                <button onClick={() => {
                  navigator.clipboard.writeText(profileUrl);
                  setMessage('URL copiada!');
                }}>Copiar URL</button>
              </div>

              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label>Avatar</label>
                  {user?.avatar && (
                    <div className="avatar-container">
                      <img src={user.avatar} alt="Avatar" className="avatar-preview" />
                      <div className="avatar-actions">
                        <button type="button" onClick={handleDeleteAvatar} className="btn-danger">
                          Remover
                        </button>
                      </div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleUploadAvatar}
                    className="file-input"
                  />
                  <small>{user?.avatar ? 'Clique para trocar ou remova acima' : 'Selecione uma imagem'}</small>
                </div>

                <div className="form-group">
                  <label>Nome de exibição</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu nome"
                    maxLength="50"
                  />
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Escreva algo sobre você"
                    maxLength="500"
                    rows="4"
                  />
                  <small>{bio.length}/500</small>
                </div>

                <div className="form-group">
                  <label>Efeito de Fundo</label>
                  <select value={backgroundEffect} onChange={(e) => setBackgroundEffect(e.target.value)}>
                    <option value="none">Nenhum</option>
                    <option value="falling-stars">Estrelas Caindo ⭐</option>
                    <option value="floating-bubbles">Bolhas Flutuantes 🫧</option>
                    <option value="black-hole">Buraco Negro 🌌</option>
                    <option value="video">Vídeo Personalizado 🎬</option>
                  </select>
                  <small>As cores do efeito vão acompanhar seu banner</small>
                </div>

                {backgroundEffect === 'video' && (
                  <div className="upload-area">
                    <label>Upload de Vídeo de Fundo (máx 15 segundos)</label>
                    <input 
                      type="file" 
                      accept="video/*,.gif"
                      onChange={handleUploadBackgroundVideo}
                      className="file-input"
                    />
                    <small>Formatos: MP4, WEBM, GIF - Máximo 15 segundos - Vídeo roda mutado em loop no fundo</small>
                    {backgroundVideo && <p style={{color: '#43d17a', marginTop: '8px'}}>✓ Vídeo de fundo configurado</p>}
                  </div>
                )}

                {/* Badges do usuário (somente leitura) */}
                {user?.badges && user.badges.length > 0 && (
                  <div className="form-group">
                    <label>Insígnias de Perfil</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {user.badges.map((b) => {
                        const code = String(b.code || '').toLowerCase();
                        const defaultSrc = code.includes('nitro') && !code.includes('classic')
                          ? 'https://cdn.discordapp.com/badge-icons/0e291f67631e374140365a44a1574eae.png'
                          : code.includes('classic')
                            ? 'https://cdn.discordapp.com/badge-icons/7e46d5595367ef7588c4e87feba64666.png'
                            : 'https://cdn-icons-png.flaticon.com/512/7595/7595571.png';
                        const src = b.iconUrl || defaultSrc;
                        return (
                          <div key={b._id || b.code} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a2e', border: '1px solid #2d2d44', padding: '6px 10px', borderRadius: 999 }}>
                            <img
                              src={src}
                              alt={b.name}
                              style={{ width: 18, height: 18 }}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = defaultSrc;
                              }}
                            />
                            <span style={{ fontSize: 12 }}>{b.name}</span>
                          </div>
                        );
                      })}
                    </div>
                    <small>Insígnias atribuídas podem ser vistas no perfil público.</small>
                  </div>
                )}

                <button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Perfil'}
                </button>
              </form>
            </section>
          )}

          {activeTab === 'media' && (
            <section className="section">
              <h2>Sua Mídia</h2>
              
              <div className="upload-area">
                <label>🎵 Áudio Ambiente para {isMobile ? 'Celular' : 'Desktop'} (toca em segundo plano)</label>
                <input 
                  type="file" 
                  accept="audio/*"
                  onChange={handleUploadBackgroundAudio}
                  className="file-input"
                />
                <small>Formatos: MP3, WAV, OGG, M4A - O áudio será reproduzido automaticamente no perfil público em segundo plano</small>
                <small style={{display: 'block', marginTop: '8px', color: '#999'}}>💡 Você está acessando via {isMobile ? 'celular' : 'desktop'}, então este áudio será salvo para {isMobile ? 'dispositivos móveis' : 'computadores'}</small>
                {(isMobile ? backgroundAudioMobile : backgroundAudioDesktop) && <p style={{color: '#43d17a', marginTop: '8px'}}>✓ Áudio configurado para {isMobile ? 'mobile' : 'desktop'}</p>}
                {!isMobile && backgroundAudioMobile && <p style={{color: '#ffa500', marginTop: '8px', fontSize: '12px'}}>ℹ️ Seu celular tem um áudio diferente configurado</p>}
                {isMobile && backgroundAudioDesktop && <p style={{color: '#ffa500', marginTop: '8px', fontSize: '12px'}}>ℹ️ Seu desktop tem um áudio diferente configurado</p>}
              </div>

              <div className="upload-area">
                <label>Adicionar Imagem ou GIF para Galeria</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleUploadMedia}
                  className="file-input"
                />
                <small>Formatos: JPG, PNG, GIF (máx 50MB) - Aparece na galeria do perfil</small>
              </div>

              <button 
                type="button" 
                onClick={() => {
                  setMessage('Alterações salvas! As mídias são salvas automaticamente ao fazer upload.');
                  setTimeout(() => setMessage(''), 3000);
                }}
                style={{ marginTop: '16px', marginBottom: '16px' }}
              >
                Salvar Alterações
              </button>

              <div className="media-grid">
                {media.length === 0 ? (
                  <p>Nenhuma mídia adicionada ainda</p>
                ) : (
                  media.map((item, idx) => (
                    <div key={item._id || idx} className="media-card">
                      {item.type === 'audio' ? (
                        <audio controls src={item.url} />
                      ) : (
                        <img src={item.url} alt={item.title} />
                      )}
                      <h4>{item.title}</h4>
                      {item.description && <p>{item.description}</p>}
                      <div className="media-actions">
                        <button 
                          type="button"
                          onClick={() => handleDeleteMedia(item._id || idx)}
                          className="delete-btn"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === 'links' && (
            <section className="section">
              <h2>Seus Links</h2>
              
              <form onSubmit={handleAddLink} className="link-form">
                <input
                  type="text"
                  placeholder="Título do link"
                  value={newLink.title}
                  onChange={(e) => setNewLink({...newLink, title: e.target.value})}
                  required
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={newLink.url}
                  onChange={(e) => setNewLink({...newLink, url: e.target.value})}
                  required
                />
                <select 
                  value={newLink.platform}
                  onChange={(e) => {
                    const platform = e.target.value;
                    setNewLink({
                      ...newLink,
                      platform,
                      title: newLink.title || (platform !== 'custom' && platform !== 'website' ? platform.charAt(0).toUpperCase() + platform.slice(1) : newLink.title)
                    });
                  }}
                >
                  <option value="custom">Customizado</option>
                  <option value="website">Website</option>
                  <option value="github">GitHub</option>
                  <option value="instagram">Instagram</option>
                  <option value="youtube">YouTube</option>
                  <option value="reddit">Reddit</option>
                  <option value="discord">Discord</option>
                  <option value="x">X (Twitter)</option>
                  <option value="tiktok">TikTok</option>
                  <option value="facebook">Facebook</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="twitch">Twitch</option>
                </select>
                <button type="submit">Adicionar Link</button>
              </form>

              <div className="links-list">
                {links.length === 0 ? (
                  <p>Nenhum link adicionado ainda</p>
                ) : (
                  links.map((link, index) => (
                    <div key={link._id || `link-${index}`} className="link-item">
                      <h4>{link.title}</h4>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">{link.url}</a>
                      <button 
                        onClick={() => handleDeleteLink(link._id || index)}
                        className="delete-btn"
                      >
                        Deletar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === 'connections' && (
            <section className="section">
              <h2>Conexões</h2>
              <p>Vincule suas contas de jogos para enriquecer seu perfil.</p>
              <div className="connections-grid">
                <div className="connection-card">
                  <div className="connection-header">
                    <h3>Steam</h3>
                    <span className={`status ${connections.steam ? 'on' : 'off'}`}>{connections.steam ? 'Conectado' : 'Desconectado'}</span>
                  </div>
                  <div className="connection-actions">
                    {connections.steam ? (
                      <button className="disconnect-btn" onClick={() => handleDisconnectPlatform('steam')}>Remover conexão</button>
                    ) : (
                      <button className="connect-btn" onClick={() => handleConnectPlatform('steam')}>Conectar Steam</button>
                    )}
                  </div>
                </div>
              </div>

              {connections.steam && (
                <div className="featured-game-section">
                  <h3>Jogo em Destaque</h3>
                  <p>Escolha um jogo da sua biblioteca para destacar no perfil:</p>
                  
                  {loadingGames ? (
                    <div className="loading-games">Carregando jogos...</div>
                  ) : steamGames.length > 0 ? (
                    <div className="games-grid">
                      {steamGames.map(game => (
                        <div 
                          key={game.appid} 
                          className={`game-card ${selectedGame?.appid === game.appid ? 'selected' : ''}`}
                          onClick={() => handleSelectGame(game)}
                        >
                          <img 
                            src={`https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`}
                            alt={game.name}
                            onError={(e) => { e.target.src = '/favicon.png'; }}
                          />
                          <div className="game-info">
                            <h4>{game.name}</h4>
                            <p>{Math.round(game.playtime_forever / 60)} horas</p>
                          </div>
                          {selectedGame?.appid === game.appid && <span className="check-icon">✓</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-games">Nenhum jogo encontrado na sua biblioteca Steam.</p>
                  )}
                </div>
              )}
              <small style={{color:'#a0a0a0'}}>Obs: algumas conexões podem redirecionar para autenticação externa.</small>
            </section>
          )}

          {activeTab === 'preview' && (
            <section className="section">
              <h2>Pré-visualização do Perfil</h2>
              <iframe 
                src={profileUrl}
                title="Preview"
                className="preview-iframe"
              />
            </section>
          )}

          {activeTab === 'account' && (
            <section className="section account-section">
              <h2>Conta</h2>

              <div className="account-grid">
                <div className="account-card progress-card">
                  <div className="account-card-header">
                    <p className="card-title">Conclusão do perfil</p>
                    <span className="pill">{completionPercent}% concluído</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${completionPercent}%` }}></div>
                  </div>
                  <div className="alert">
                    <span className="dot warning"></span>
                    <div>
                      <p className="alert-title">Seu perfil ainda não está completo!</p>
                      <p className="alert-sub">Complete seu perfil para deixá-lo mais visível e atrativo.</p>
                    </div>
                  </div>
                  <div className="task-list">
                    {accountTasks.map(task => (
                      <div key={task.label} className={`task ${task.done ? 'done' : ''}`}>
                        <span className="dot success"></span>
                        <span>{task.label}</span>
                        <span className="chevron">›</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="account-card manage-card">
                  <p className="card-title">Gerencie sua conta</p>
                  <div className="manage-list">
                    <button className="manage-item">Alterar nome de usuário</button>
                    <button className="manage-item">Alterar nome exibido</button>
                    <button className="manage-item">Configurações da conta</button>
                  </div>
                  <p className="card-title">Conexões</p>
                  <div className="connections">
                    <p>Vincule sua conta do Discord à Vanta.io</p>
                    <button className="discord-btn" onClick={() => handleConnectDiscord()}>
                      {discordConnected ? `Discord conectado (${discordUsername || 'sucesso'})` : 'Conectar Discord'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="account-card account-info">
                <h3>Informações gerais</h3>
                <div className="info-row">
                  <label>Nome de usuário</label>
                  <span>{user?.username}</span>
                </div>
                <div className="info-row">
                  <label>Nome exibido</label>
                  <span>{displayName || 'Nome não definido'}</span>
                </div>
                <div className="info-row">
                  <label>Identificador</label>
                  <span className="pill">{uidTag}</span>
                </div>
                <div className="info-row">
                  <label>E-mail</label>
                  <span>{maskedEmail}</span>
                </div>
                {discordConnected && (
                  <div className="info-row">
                    <label>Discord</label>
                    <span>{discordUsername || 'Conectado'}</span>
                  </div>
                )}
              </div>

              <div className="account-card security">
                <h3>Configurações de segurança</h3>
                <div className="toggle-row">
                  <div>
                    <p>Autenticação multifator</p>
                    <small>A autenticação multifator adiciona uma camada de segurança à conta</small>
                  </div>
                  <button className="toggle disabled" disabled>Off</button>
                </div>
                <div className="toggle-row">
                  <div>
                    <p>Entrar com Discord</p>
                    <small>Permite acessar sua conta com o Discord depois de criada</small>
                  </div>
                  <button className={`toggle ${discordConnected ? 'on' : ''}`} onClick={() => handleConnectDiscord()}>
                    {discordConnected ? 'On' : 'Conectar'}
                  </button>
                </div>
              </div>

              <div className="account-card manage-card">
                <h3>Alterar email</h3>
                <form className="inline-form" onSubmit={handleUpdateEmail}>
                  <input
                    type="email"
                    placeholder="novoemail@exemplo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Senha atual"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    required
                  />
                  <button type="submit">Salvar</button>
                </form>

                <h3 style={{ marginTop: '12px' }}>Alterar senha</h3>
                <form className="inline-form" onSubmit={handleUpdatePassword}>
                  <input
                    type="password"
                    placeholder="Senha atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button type="submit">Salvar</button>
                </form>
              </div>

              <div className="account-card actions">
                <h3>Ações da conta</h3>
                <div className="actions-grid">
                  <button className="action-btn muted">Regenerar códigos de recuperação</button>
                  <button className="action-btn muted">Alterar e-mail</button>
                  <button className="action-btn muted">Alterar senha</button>
                  <button className="action-btn muted">Desvincular Discord</button>
                  <button className="action-btn danger" onClick={handleLogout}>Sair</button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
