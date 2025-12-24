// Extrai a cor dominante de uma imagem usando Canvas
export const extractColorsFromImage = async (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 100;
        canvas.height = 100;
        
        ctx.drawImage(img, 0, 0, 100, 100);
        
        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0;
        const pixelCount = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        
        r = Math.floor(r / pixelCount);
        g = Math.floor(g / pixelCount);
        b = Math.floor(b / pixelCount);
        
        const primaryColor = `rgb(${r}, ${g}, ${b})`;
        
        // Cor secundária: versão mais saturada
        const secondaryColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
        
        resolve({
          primary: primaryColor,
          secondary: secondaryColor,
          rgb: { r, g, b }
        });
      } catch (error) {
        console.error('Erro ao extrair cores:', error);
        resolve({
          primary: '#60a5fa',
          secondary: '#c084fc',
          rgb: { r: 96, g: 165, b: 250 }
        });
      }
    };
    
    img.onerror = () => {
      resolve({
        primary: '#60a5fa',
        secondary: '#c084fc',
        rgb: { r: 96, g: 165, b: 250 }
      });
    };
    
    img.src = imageUrl;
  });
};

// Converte RGB para HSL para melhor contraste
export const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
      default:
        h = 0;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};
