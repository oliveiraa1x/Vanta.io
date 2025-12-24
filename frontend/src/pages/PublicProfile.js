import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import FallingStars from '../components/FallingStars';
import FloatingBubbles from '../components/FloatingBubbles';
import BlackHole from '../components/BlackHole';
import { extractColorsFromImage } from '../utils/colorExtractor';
import './PublicProfile.css';

function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [colors, setColors] = useState({ primary: '#60a5fa', secondary: '#c084fc' });
  const [isMobile, setIsMobile] = useState(false);
  const audioRef = useRef(null);

  // Detectar mobile
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    setIsMobile(isMobileDevice);
  }, []);

  // Garantir que o fundo da página fique transparente/escuro para o efeito aparecer
  useEffect(() => {
    const prevBackground = document.body.style.background;
    const prevColor = document.body.style.color;

    document.body.style.background = 'transparent';
    document.body.style.color = '#fff';

    // Permitir áudio sem mute após interação
    const tryUnmute = () => {
      const el = audioRef.current;
      if (!el) return;
      try {
        el.muted = false;
        el.volume = 0.6;
        const p = el.play();
        if (p && typeof p.then === 'function') p.catch(() => {});
      } catch (_) {}
      window.removeEventListener('click', tryUnmute);
      window.removeEventListener('touchend', tryUnmute);
      window.removeEventListener('pointerdown', tryUnmute);
      window.removeEventListener('keydown', tryUnmute);
    };

    window.addEventListener('click', tryUnmute);
    window.addEventListener('touchend', tryUnmute);
    window.addEventListener('pointerdown', tryUnmute);
    window.addEventListener('keydown', tryUnmute);

    return () => {
      document.body.style.background = prevBackground;
      document.body.style.color = prevColor;
      window.removeEventListener('click', tryUnmute);
      window.removeEventListener('touchend', tryUnmute);
      window.removeEventListener('pointerdown', tryUnmute);
      window.removeEventListener('keydown', tryUnmute);
    };
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await axios.get(`/api/@${username}`);
      console.log('Perfil carregado:', response.data);
      setProfile(response.data);
      
      // Extrair cores do banner se existir
      if (response.data.profile.bannerImage) {
        const extractedColors = await extractColorsFromImage(response.data.profile.bannerImage);
        setColors(extractedColors);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return <div className="public-profile loading">Carregando perfil...</div>;
  }

  if (notFound || !profile || !profile.profile) {
    return (
      <div className="public-profile not-found">
        <div className="not-found-content">
          <h1>Perfil não encontrado</h1>
          <p>O perfil de @{username} não existe.</p>
          <Link to="/login">Voltar para login</Link>
        </div>
      </div>
    );
  }

  const { avatar, bannerImage, displayName, bio, theme, backgroundEffect, backgroundVideo, backgroundAudio, backgroundAudioDesktop, backgroundAudioMobile, links, media, connections, badges, discordAvatarDecoration } = profile.profile;

  // Selecionar áudio apropriado para o device
  const selectedAudio = isMobile ? (backgroundAudioMobile || backgroundAudio) : (backgroundAudioDesktop || backgroundAudio);

  // Normalizar áudio URL para HTTPS se necessário (sem hooks, função pura inline)
  const normalizedAudio = (() => {
    if (!selectedAudio) return '';
    try {
      let u = String(selectedAudio).trim();
      if (u.startsWith('http://')) u = 'https://' + u.slice(7);
      return u;
    } catch (_) { return selectedAudio; }
  })();

  const renderBackgroundEffect = () => {
    // Se houver vídeo de fundo, renderizar vídeo
    if (backgroundEffect === 'video' && backgroundVideo) {
      return (
        <video 
          key={`video-${backgroundVideo}`}
          className="background-video"
          autoPlay 
          loop 
          muted 
          playsInline
        >
          <source src={backgroundVideo} type="video/mp4" />
          <source src={backgroundVideo} type="video/webm" />
          <source src={backgroundVideo} type="image/gif" />
          Seu navegador não suporta vídeo
        </video>
      );
    }
    
    switch (backgroundEffect) {
      case 'falling-stars':
        return <FallingStars primaryColor={colors.primary} secondaryColor={colors.secondary} />;
      case 'floating-bubbles':
        return <FloatingBubbles primaryColor={colors.primary} secondaryColor={colors.secondary} />;
      case 'black-hole':
        return <BlackHole primaryColor={colors.primary} secondaryColor={colors.secondary} />;
      default:
        return null;
    }
  };

  const detectPlatform = (url) => {
    try {
      const host = new URL(url).hostname.replace('www.', '').toLowerCase();
      if (host.includes('github.com')) return 'github';
      if (host.includes('instagram.com')) return 'instagram';
      if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
      if (host.includes('reddit.com')) return 'reddit';
      if (host.includes('discord.gg') || host.includes('discord.com')) return 'discord';
      if (host.includes('tiktok.com')) return 'tiktok';
      if (host.includes('facebook.com')) return 'facebook';
      if (host.includes('linkedin.com')) return 'linkedin';
      if (host.includes('twitch.tv')) return 'twitch';
      if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
      return 'website';
    } catch (_) {
      return 'website';
    }
  };

  const getPlatformIcon = (platform) => {
    const size = 22;
    const commonProps = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor' };
    switch ((platform || '').toLowerCase()) {
      case 'github':
        return (<svg {...commonProps}><path d="M12 .5C5.73.5.98 5.25.98 11.53c0 4.86 3.15 8.98 7.52 10.43.55.1.75-.24.75-.54 0-.27-.01-1.16-.02-2.1-3.06.67-3.71-1.31-3.71-1.31-.5-1.27-1.22-1.61-1.22-1.61-.99-.68.07-.66.07-.66 1.1.08 1.68 1.13 1.68 1.13.98 1.68 2.57 1.2 3.2.92.1-.71.38-1.2.69-1.48-2.44-.28-5-1.22-5-5.45 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.41.11-2.94 0 0 .92-.29 3.01 1.13a10.4 10.4 0 0 1 5.48 0c2.08-1.42 3.01-1.13 3.01-1.13.6 1.53.22 2.66.11 2.94.7.77 1.12 1.75 1.12 2.95 0 4.24-2.57 5.16-5.01 5.44.39.33.73.98.73 1.98 0 1.43-.01 2.58-.01 2.94 0 .3.2.65.76.54A10.53 10.53 0 0 0 23.02 11.53C23.02 5.25 18.27.5 12 .5z"/></svg>);
      case 'instagram':
        return (<svg {...commonProps}><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM18 6.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"/></svg>);
      case 'youtube':
        return (<svg {...commonProps}><path d="M23.5 6.2s-.23-1.64-.95-2.36c-.9-.95-1.9-.96-2.36-1.01C16.7 2.5 12 2.5 12 2.5h-.01s-4.7 0-8.19.33c-.46.06-1.46.06-2.36 1.01C-.23 4.56 0 6.2 0 6.2S0 8.1 0 9.98v1.97c0 1.88 0 3.78.04 3.78s.23 1.64.95 2.36c.9.95 2.08.92 2.61 1.02 1.9.18 8.4.34 8.4.34s4.7-.01 8.2-.34c.46-.06 1.46-.06 2.36-1.01.72-.72.95-2.36.95-2.36s.04-1.88.04-3.77V9.98c0-1.88-.04-3.78-.04-3.78zM9.5 8.2l6 3.26-6 3.26V8.2z"/></svg>);
      case 'reddit':
        return (<svg {...commonProps}><path d="M22 12.07c0-1.02-.83-1.85-1.85-1.85-.5 0-.95.2-1.28.53-1.22-.86-2.84-1.41-4.63-1.48l.98-4.62 3.22.68c.03.83.71 1.49 1.54 1.49.85 0 1.54-.69 1.54-1.54s-.69-1.54-1.54-1.54c-.6 0-1.12.35-1.36.85l-3.76-.8a.77.77 0 0 0-.91.6l-1.11 5.23c-1.86.05-3.53.6-4.79 1.49-.32-.33-.77-.54-1.26-.54-1.02 0-1.85.83-1.85 1.85 0 .76.46 1.41 1.11 1.7-.04.24-.06.49-.06.75 0 2.72 3.13 4.93 7 4.93s7-2.21 7-4.93c0-.26-.02-.51-.06-.75.66-.29 1.12-.94 1.12-1.7zM8.64 14.3c-.6 0-1.09-.49-1.09-1.09 0-.6.49-1.09 1.09-1.09s1.09.49 1.09 1.09c0 .6-.49 1.09-1.09 1.09zm6.72 0c-.6 0-1.09-.49-1.09-1.09 0-.6.49-1.09 1.09-1.09s1.09.49 1.09 1.09c0 .6-.49 1.09-1.09 1.09zM12 19.03c-1.52 0-2.86-.47-3.77-1.22a.5.5 0 1 1 .62-.78c.72.57 1.85.92 3.15.92 1.3 0 2.43-.35 3.15-.92a.5.5 0 1 1 .62.78c-.91.75-2.25 1.22-3.77 1.22z"/></svg>);
      case 'discord':
        return (<svg {...commonProps}><path d="M20.3 4.4A18.2 18.2 0 0 0 15.9 3l-.2.4c1.98.48 3.1 1.17 3.1 1.17-1.35-.67-2.67-1-3.9-1.15a16.9 16.9 0 0 0-3.98 0c-1.23.15-2.55.48-3.9 1.15 0 0 1.12-.69 3.1-1.17L7.9 3a18.2 18.2 0 0 0-4.4 1.4C1.6 7.3 1 10.1 1 12.8 1 17.5 3.8 21 3.8 21a12.3 12.3 0 0 0 4.5 2.2l.9-2c-1.57-.5-2.9-1.3-2.9-1.3l.7.5c.5.28 1 .5 1.6.7 1.2.44 2.5.6 3.8.6s2.6-.2 3.8-.6c.57-.2 1.1-.42 1.6-.7l.7-.5s-1.32.8-2.9 1.3l.9 2a12.3 12.3 0 0 0 4.5-2.2s2.8-3.5 2.8-8.2c0-2.7-.6-5.5-2.6-8.4zM8.8 14.5c-.8 0-1.5-.75-1.5-1.7 0-.94.6-1.7 1.5-1.7.9 0 1.6.76 1.5 1.7 0 .94-.6 1.7-1.5 1.7zm6.4 0c-.8 0-1.5-.75-1.5-1.7 0-.94.6-1.7 1.5-1.7.9 0 1.6.76 1.5 1.7 0 .94-.6 1.7-1.5 1.7z"/></svg>);
      case 'x':
      case 'twitter':
        return (<svg {...commonProps}><path d="M18.2 2H21l-6.3 7.2L22 22h-6.8l-4.7-6.1L5 22H2.2l6.8-7.8L2 2h6.8l4.2 5.6L18.2 2zm-1.2 18h1.9L8.5 4H6.6l10.4 16z"/></svg>);
      case 'tiktok':
        return (<svg {...commonProps}><path d="M21 8.5a7.5 7.5 0 0 1-5-1.7v6.5a6 6 0 1 1-6-6c.5 0 1 .06 1.47.18v3.16a3 3 0 1 0 2 2.82V2h3a4.5 4.5 0 0 0 4.5 4.5v2z"/></svg>);
      case 'facebook':
        return (<svg {...commonProps}><path d="M13 22v-9h3l1-4h-4V6.5c0-1.16.32-1.95 2-1.95h2V1.14C16.65 1.1 15.3 1 14 1c-3.2 0-5 1.66-5 4.73V9H6v4h3v9h4z"/></svg>);
      case 'linkedin':
        return (<svg {...commonProps}><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0V8zm7.5 0H12v2.2h.07c.62-1.17 2.13-2.4 4.38-2.4 4.68 0 5.55 3.08 5.55 7.1V24h-5V16.4c0-1.81-.03-4.13-2.52-4.13-2.53 0-2.92 1.98-2.92 4v7.73H7.5V8z"/></svg>);
      case 'twitch':
        return (<svg {...commonProps}><path d="M4 2h16v10l-5 5h-4l-3 3H6v-3H2V2zm3 2v8h3V6h3v6h3V4H7z"/></svg>);
      case 'steam':
        return (<svg {...commonProps}><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10a9.95 9.95 0 0 1-7.8-3.8l2.7-1.1c.4 1.2 1.5 2 2.8 2 1.6 0 2.9-1.3 2.9-2.9s-1.3-2.9-2.9-2.9h-.1l-2.8 1.2a3.3 3.3 0 0 0-2.7-.2A8 8 0 1 0 12 20c4.4 0 8-3.6 8-8s-3.6-8-8-8zm-4.3 13.5a2 2 0 0 0 2.4-1.4 2 2 0 0 0-1.4-2.4L6.5 13a2 2 0 0 0 1.2 2.5zm9.6-5.4c0 1.6-1.3 2.9-2.9 2.9s-2.9-1.3-2.9-2.9 1.3-2.9 2.9-2.9 2.9 1.3 2.9 2.9zm-2.9-2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>);
      default:
        return (<svg {...commonProps}><path d="M4 4h16v16H4z"/></svg>);
    }
  };

  return (
    <div className="public-profile">
      {renderBackgroundEffect()}
      
      {/* Áudio ambiente em segundo plano */}
      {normalizedAudio && (
        <audio 
          key={`audio-${normalizedAudio}`}
          ref={audioRef}
          autoPlay 
          loop 
          muted
          preload="auto"
          crossOrigin="anonymous"
          style={{display: 'none'}}
          onCanPlay={() => { try { audioRef.current && audioRef.current.play(); } catch(_){} }}
        >
          <source src={normalizedAudio} type="audio/mpeg" />
          <source src={normalizedAudio} type="audio/wav" />
          <source src={normalizedAudio} type="audio/ogg" />
          <source src={normalizedAudio} type="audio/x-m4a" />
          <source src={normalizedAudio} type="video/mp4" />
          <source src={normalizedAudio} type="video/webm" />
        </audio>
      )}
      
      {bannerImage && (
        <div className="banner">
          <img src={bannerImage} alt="Banner" />
        </div>
      )}

      <div className="profile-content">
        <div className={`profile-header theme-${theme}`}>
          {/* Avatar com Decoração Discord e Badges */}
          <div className="avatar-section">
            {avatar && (
              <div className="avatar-wrapper">
                <img src={avatar} alt={displayName} className="avatar" />
                {discordAvatarDecoration && (
                  <img
                    src={discordAvatarDecoration}
                    alt="Discord Decoration"
                    className="avatar-decoration"
                    onError={(e) => {
                      // Se a decoração quebrar, esconda para não mostrar ícone quebrado
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
            )}
            
            {/* Badges em destaque */}
            {badges && badges.length > 0 && (
              <div className="badges-showcase">
                {badges.map((b) => {
                  const code = String(b.code || '').toLowerCase();
                  const defaultSrc = code.includes('nitro') && !code.includes('classic')
                    ? 'https://cdn.discordapp.com/badge-icons/0e291f67631e374140365a44a1574eae.png'
                    : code.includes('classic')
                      ? 'https://cdn.discordapp.com/badge-icons/7e46d5595367ef7588c4e87feba64666.png'
                      : 'https://cdn-icons-png.flaticon.com/512/7595/7595571.png';
                  const src = b.iconUrl || defaultSrc;
                  return (
                    <div key={b._id || b.code} className="badge-icon" title={b.description || b.name}>
                      <img
                        src={src}
                        alt={b.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = defaultSrc;
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nome e Info */}
          <h1>{displayName}</h1>
          <p className="username">@{profile.username}</p>
          
          {/* Bio */}
          {bio && <p className="bio">{bio}</p>}
          
          <p className="created-date">
            Membro desde {new Date(profile.createdAt).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Jogo em Destaque */}
        {connections?.steamFeaturedGame && (
          <div className="featured-game-section">
            <h2>Jogando Agora</h2>
            <div className="featured-game-card">
              <div className="game-banner">
                <img 
                  src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${connections.steamFeaturedGame.appid}/library_600x900.jpg`}
                  alt={connections.steamFeaturedGame.name}
                  onError={(e) => { 
                    e.target.src = `https://media.steampowered.com/steamcommunity/public/images/apps/${connections.steamFeaturedGame.appid}/${connections.steamFeaturedGame.img_logo_url}.jpg`;
                  }}
                />
              </div>
              <div className="game-details">
                <h3>{connections.steamFeaturedGame.name}</h3>
                <p className="game-hours">
                  {Math.round(connections.steamFeaturedGame.playtime_forever / 60)} horas jogadas
                </p>
                <a 
                  href={`https://store.steampowered.com/app/${connections.steamFeaturedGame.appid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-on-steam-btn"
                >
                  Ver na Steam
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Links Personalizados */}
        {(links && links.length > 0 || connections?.steam?.profileurl) && (
          <div className="links-section">
            <h2>Links</h2>
            <div className="social-icons">
              {/* Steam connection */}
              {connections?.steam?.profileurl && (
                <a
                  href={connections.steam.profileurl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon steam"
                  title="Steam"
                >
                  {getPlatformIcon('steam')}
                </a>
              )}
              
              {/* User links */}
              {links && links.map(link => {
                const platform = (link.platform || detectPlatform(link.url));
                const Icon = getPlatformIcon(platform);
                return (
                  <a
                    key={link._id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`social-icon ${platform}`}
                    title={link.title || platform}
                  >
                    {Icon}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="footer">
          <p>Criado com ❤️ em Vanta.io</p>
          <Link to="/register">Crie seu perfil</Link>
        </div>
      </div>
    </div>
  );
}

export default PublicProfile;
