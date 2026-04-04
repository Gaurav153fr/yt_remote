import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isPlaying: boolean;
  accentColor: string;
  barCount?: number;
  gap?: number;
}

export const Visualizer: React.FC<VisualizerProps> = ({ 
  isPlaying, 
  accentColor, 
  barCount = 8,
  gap = 3
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bars = useRef<number[]>(new Array(barCount).fill(2));
  const targets = useRef<number[]>(new Array(barCount).fill(2));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = accentColor;
      
      const barWidth = (canvas.width - (barCount - 1) * gap) / barCount;

      for (let i = 0; i < barCount; i++) {
        // If playing, pick a new target height occasionally
        if (isPlaying && Math.random() > 0.85) {
          targets.current[i] = Math.random() * (canvas.height - 4) + 2;
        } else if (!isPlaying) {
          targets.current[i] = 2; // Flatline when stopped
        }

        // Smoothly interp towards target
        bars.current[i] += (targets.current[i] - bars.current[i]) * 0.15;

        // Draw pill-shaped bar
        const x = i * (barWidth + gap);
        const h = bars.current[i];
        const y = (canvas.height - h) / 2;
        
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, barWidth, h, 4);
        } else {
            ctx.rect(x, y, barWidth, h);
        }
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, accentColor, barCount, gap]);

  return (
    <canvas 
      ref={canvasRef} 
      width={barCount * 10} 
      height={30} 
      className="w-full h-full block opacity-70"
    />
  );
};
