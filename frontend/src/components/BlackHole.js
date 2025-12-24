import React, { useEffect, useRef } from 'react';

function BlackHole({ primaryColor, secondaryColor }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 300;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const blackHoleRadius = 50;
    const accretionDiskRadius = 250;

    // Criar partículas para o disco de acreção
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * accretionDiskRadius + blackHoleRadius;
      const speed = (1 - distance / accretionDiskRadius) * 0.03 + 0.005;
      
      particles.push({
        angle: angle,
        distance: distance,
        speed: speed,
        size: Math.random() * 4 + 2,
        opacity: Math.random() * 0.9 + 0.3,
        color: i % 3 === 0 ? primaryColor || '#ff6b35' : 
               i % 3 === 1 ? secondaryColor || '#f7931e' : '#ffd700'
      });
    }

    const color1 = primaryColor || '#ff6b35';
    const color2 = secondaryColor || '#f7931e';
    const color3 = '#ffd700';

    let rotation = 0;

    let animationId;
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 20, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      rotation += 0.001;

      // Desenhar nebulosa roxa de fundo (universo)
      const nebulaGradient = ctx.createRadialGradient(centerX, centerY, accretionDiskRadius, centerX, centerY, canvas.width);
      nebulaGradient.addColorStop(0, 'rgba(138, 43, 226, 0.3)'); // Roxo
      nebulaGradient.addColorStop(0.3, 'rgba(75, 0, 130, 0.2)'); // Índigo
      nebulaGradient.addColorStop(0.6, 'rgba(138, 43, 226, 0.1)'); // Roxo mais claro
      nebulaGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = nebulaGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;

      // Adicionar brilho roxo pulsante
      const pulseIntensity = Math.sin(Date.now() * 0.001) * 0.3 + 0.5;
      const purpleGlow = ctx.createRadialGradient(centerX, centerY, accretionDiskRadius * 0.8, centerX, centerY, accretionDiskRadius * 1.5);
      purpleGlow.addColorStop(0, `rgba(138, 43, 226, ${pulseIntensity * 0.2})`);
      purpleGlow.addColorStop(0.5, `rgba(75, 0, 130, ${pulseIntensity * 0.15})`);
      purpleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = purpleGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Desenhar disco de acreção com gradiente
      for (let radius = accretionDiskRadius; radius > blackHoleRadius; radius -= 5) {
        const intensity = 1 - (radius - blackHoleRadius) / (accretionDiskRadius - blackHoleRadius);
        const alpha = intensity * 0.3;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation + radius * 0.01);
        
        const gradient = ctx.createRadialGradient(0, 0, radius - 5, 0, 0, radius);
        gradient.addColorStop(0, color1 + Math.floor(alpha * 100).toString(16).padStart(2, '0'));
        gradient.addColorStop(0.5, color2 + Math.floor(alpha * 80).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, color3 + Math.floor(alpha * 60).toString(16).padStart(2, '0'));
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }

      // Desenhar partículas orbitando
      particles.forEach((particle) => {
        particle.angle += particle.speed;
        
        // Espiral lentamente para dentro
        if (particle.distance > blackHoleRadius) {
          particle.distance -= particle.speed * 0.3;
        } else {
          // Reseta na borda externa
          particle.distance = accretionDiskRadius;
          particle.angle = Math.random() * Math.PI * 2;
        }

        const x = centerX + Math.cos(particle.angle) * particle.distance;
        const y = centerY + Math.sin(particle.angle) * particle.distance * 0.3; // Achatado

        // Brilho baseado na distância
        const distanceFromCenter = particle.distance - blackHoleRadius;
        const brightness = 1 - (distanceFromCenter / (accretionDiskRadius - blackHoleRadius));
        
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity * brightness;
        
        // Adicionar brilho ao redor das partículas
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size * 3);
        glowGradient.addColorStop(0, particle.color);
        glowGradient.addColorStop(0.5, particle.color + '80');
        glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Desenhar partícula sólida no centro
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(x, y, particle.size * (1 + brightness * 0.5), 0, Math.PI * 2);
        ctx.fill();
      });

      // Desenhar brilho intenso ao redor do buraco negro
      const glowGradient = ctx.createRadialGradient(centerX, centerY, blackHoleRadius * 0.5, centerX, centerY, blackHoleRadius * 3);
      glowGradient.addColorStop(0, color1 + 'ff');
      glowGradient.addColorStop(0.3, color2 + 'aa');
      glowGradient.addColorStop(0.6, color3 + '44');
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, blackHoleRadius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Desenhar horizonte de eventos (círculo negro central)
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(centerX, centerY, blackHoleRadius, 0, Math.PI * 2);
      ctx.fill();

      // Borda luminosa do horizonte
      ctx.strokeStyle = color1;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, blackHoleRadius + 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [primaryColor, secondaryColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
}

export default BlackHole;
