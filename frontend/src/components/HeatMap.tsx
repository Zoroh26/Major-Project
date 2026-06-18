import { useEffect, useRef } from 'react';
import type { MlHeatmapPayload } from '../services/api';

interface HeatMapProps {
  heatmap?: MlHeatmapPayload | null;
}

const intensityToColor = (intensity: number) => {
  if (intensity < 0.25) {
    const t = intensity / 0.25;
    return `rgba(0, ${Math.round(100 + 55 * t)}, ${Math.round(200 - 100 * t)}, 0.78)`;
  }

  if (intensity < 0.5) {
    const t = (intensity - 0.25) / 0.25;
    return `rgba(0, ${Math.round(155 + 100 * t)}, ${Math.round(100 - 100 * t)}, 0.8)`;
  }

  if (intensity < 0.75) {
    const t = (intensity - 0.5) / 0.25;
    return `rgba(${Math.round(255 * t)}, ${Math.round(255 - 100 * t)}, 0, 0.84)`;
  }

  const t = (intensity - 0.75) / 0.25;
  return `rgba(255, ${Math.round(155 - 155 * t)}, 0, 0.9)`;
};

const HeatMap = ({ heatmap }: HeatMapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(6, 12, 28, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!heatmap || heatmap.values.length === 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = '600 14px sans-serif';
      ctx.fillText('Waiting for ML heatmap data...', 16, 24);
      return;
    }

    const cellWidth = canvas.width / heatmap.width;
    const cellHeight = canvas.height / heatmap.height;

    for (let y = 0; y < heatmap.height; y += 1) {
      for (let x = 0; x < heatmap.width; x += 1) {
        const idx = y * heatmap.width + x;
        const intensity = Math.max(0, Math.min(1, heatmap.values[idx] ?? 0));
        if (intensity <= 0) {
          continue;
        }

        ctx.fillStyle = intensityToColor(intensity);
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= heatmap.width; x += 1) {
      const xPos = x * cellWidth;
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= heatmap.height; y += 1) {
      const yPos = y * cellHeight;
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(canvas.width, yPos);
      ctx.stroke();
    }
  }, [heatmap]);

  return (
    <div className="h-full w-full flex flex-col">
      <canvas
        ref={canvasRef}
        className="w-full flex-1 rounded-lg bg-card border-2 border-primary"
      />
    </div>
  );
};

export default HeatMap;
