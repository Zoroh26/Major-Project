import React, { useEffect, useRef } from 'react';

export const Heatmap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Create gradient heatmap
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    // Generate heatmap data with some realistic patterns
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        // Create multiple heat zones using distance formula
        const cx1 = canvas.width * 0.3;
        const cy1 = canvas.height * 0.4;
        const cx2 = canvas.width * 0.7;
        const cy2 = canvas.height * 0.6;
        const cx3 = canvas.width * 0.5;
        const cy3 = canvas.height * 0.8;

        const dist1 = Math.sqrt(Math.pow(x - cx1, 2) + Math.pow(y - cy1, 2));
        const dist2 = Math.sqrt(Math.pow(x - cx2, 2) + Math.pow(y - cy2, 2));
        const dist3 = Math.sqrt(Math.pow(x - cx3, 2) + Math.pow(y - cy3, 2));

        const maxDist = Math.sqrt(Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2)) * 0.4;

        const heat1 = Math.max(0, 1 - dist1 / maxDist);
        const heat2 = Math.max(0, 1 - dist2 / maxDist);
        const heat3 = Math.max(0, 1 - dist3 / maxDist);

        const intensity = Math.min(1, heat1 + heat2 * 0.7 + heat3 * 0.5);

        // Color mapping: blue -> cyan -> green -> yellow -> red
        let r, g, b;
        if (intensity < 0.25) {
          const t = intensity / 0.25;
          r = 0;
          g = Math.round(100 + 55 * t);
          b = Math.round(200 - 100 * t);
        } else if (intensity < 0.5) {
          const t = (intensity - 0.25) / 0.25;
          r = 0;
          g = Math.round(155 + 100 * t);
          b = Math.round(100 - 100 * t);
        } else if (intensity < 0.75) {
          const t = (intensity - 0.5) / 0.25;
          r = Math.round(255 * t);
          g = Math.round(255 - 100 * t);
          b = 0;
        } else {
          const t = (intensity - 0.75) / 0.25;
          r = Math.round(255);
          g = Math.round(155 - 155 * t);
          b = 0;
        }

        const index = (y * canvas.width + x) * 4;
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = 200;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Add overlay grid for reference
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 50;

    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      <canvas
        ref={canvasRef}
        className="w-full flex-1 rounded-lg bg-gradient-to-br from-blue-950 to-blue-900 shadow-lg"
      />
    </div>
  );
};
