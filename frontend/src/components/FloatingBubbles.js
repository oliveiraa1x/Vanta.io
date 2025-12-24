import React, { useEffect, useRef } from 'react';

function FloatingBubbles({ primaryColor, secondaryColor }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const bubbles = [];
    const bubbleCount = 30;

    // Criar bolhas
    for (let i = 0; i < bubbleCount; i++) {
      bubbles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 30 + 10,
        velocityX: (Math.random() - 0.5) * 1,
        velocityY: (Math.random() - 0.5) * 1,
        opacity: Math.random() * 0.3 + 0.1,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.02
      });
    }

    const colors = [primaryColor || '#06b6d4', secondaryColor || '#8b5cf6'];

    let animationId;
    const animate = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      bubbles.forEach((bubble, index) => {
        bubble.x += bubble.velocityX;
        bubble.y += bubble.velocityY;
        bubble.rotation += bubble.rotationSpeed;

        // Bounce nas bordas
        if (bubble.x - bubble.radius < 0 || bubble.x + bubble.radius > canvas.width) {
          bubble.velocityX *= -1;
        }
        if (bubble.y - bubble.radius < 0 || bubble.y + bubble.radius > canvas.height) {
          bubble.velocityY *= -1;
        }

        ctx.save();
        ctx.translate(bubble.x, bubble.y);
        ctx.rotate(bubble.rotation);

        ctx.strokeStyle = colors[index % colors.length];
        ctx.lineWidth = 2;
        ctx.globalAlpha = bubble.opacity;
        ctx.beginPath();
        ctx.arc(0, 0, bubble.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Shine/brilho
        ctx.fillStyle = colors[index % colors.length];
        ctx.globalAlpha = bubble.opacity * 0.5;
        ctx.beginPath();
        ctx.arc(-bubble.radius * 0.3, -bubble.radius * 0.3, bubble.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

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

export default FloatingBubbles;
