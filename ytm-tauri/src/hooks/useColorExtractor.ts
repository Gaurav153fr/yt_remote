import { useCallback, useRef, useMemo } from 'react';

export interface ThemeColors {
  bg: string;
  bgExpanded: string;
  fg: string;
  accent: string;
  brightnessOverlay: string;
  accentRgb: string;
}

export function useColorExtractor() {
  const lastUrl = useRef<string>('');
  const lastResult = useRef<ThemeColors | null>(null);

  const extractColors = useCallback((src: string): Promise<ThemeColors> => {
    if (src === lastUrl.current && lastResult.current) {
      return Promise.resolve(lastResult.current);
    }

    return new Promise((resolve) => {
      const defaultTheme: ThemeColors = {
        bg: 'rgb(30,30,30)',
        bgExpanded: 'rgb(10,10,10)',
        fg: '#ffffff',
        accent: '#4285f4',
        accentRgb: '66,133,244',
        brightnessOverlay: 'rgba(0,0,0,0)',
      };

      if (!src || src === 'Unknown Image') {
        resolve(defaultTheme);
        return;
      }

      // Upgrade resolution for googleusercontent images
      const hd = src.includes('googleusercontent.com')
        ? src.split('=')[0] + '=s400-c'
        : src;

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = hd;

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(defaultTheme); return; }

          canvas.width = 40;
          canvas.height = 40;
          ctx.drawImage(img, 0, 0, 40, 40);

          const data = ctx.getImageData(0, 0, 40, 40).data;
          let rSum = 0, gSum = 0, bSum = 0, wSum = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            
            // Calculate saturation to weight vibrant colors more heavily than greys/low-saturation areas
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            const saturation = max === 0 ? 0 : delta / max;
            
            // Weight heavily towards saturated colors, but keep a baseline for low-saturation art
            const weight = Math.pow(saturation, 2) + 0.05;
            
            rSum += r * weight;
            gSum += g * weight;
            bSum += b * weight;
            wSum += weight;
          }

          const r = Math.round(rSum / wSum);
          const g = Math.round(gSum / wSum);
          const b = Math.round(bSum / wSum);
          const avgV = (r + g + b) / 3;

          const res = {
            bg: `rgb(${r}, ${g}, ${b})`,
            bgExpanded: `rgb(${Math.round(r * 0.15)}, ${Math.round(g * 0.15)}, ${Math.round(b * 0.15)})`,
            fg: avgV > 200 ? '#111111' : '#ffffff',
            accent: `rgb(${r}, ${g}, ${b})`,
            accentRgb: `${r},${g},${b}`,
            brightnessOverlay: avgV > 170 ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
          };

          lastUrl.current = src;
          lastResult.current = res;
          resolve(res);
        } catch {
          resolve(defaultTheme);
        }
      };

      img.onerror = () => resolve(defaultTheme);
    });
  }, []);

  return useMemo(() => ({ extractColors }), [extractColors]);
}
