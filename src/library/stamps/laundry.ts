import type { StampDefinition } from '@/types/library';

export const laundryStamps: StampDefinition[] = [
  // -----------------------------------------------------------------------
  // washer  0.6 x 0.6 m
  // Neufert plan-view: square with circle (drum) inside
  // -----------------------------------------------------------------------
  {
    id: 'washer',
    name: 'Washing Machine',
    nameEs: 'Lavadora',
    category: 'laundry',
    width: 0.6,
    depth: 0.6,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Outer rectangle
      ctx.strokeRect(0, 0, w, h);

      // Control panel strip at top
      const panelH = h * 0.15;
      ctx.beginPath();
      ctx.moveTo(0, panelH);
      ctx.lineTo(w, panelH);
      ctx.stroke();

      // Drum circle
      const cx = w / 2;
      const cy = panelH + (h - panelH) / 2;
      const r = Math.min(w, h - panelH) * 0.32;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Inner drum
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      // Control knobs
      const knobR = Math.min(w, h) * 0.03;
      ctx.beginPath();
      ctx.arc(w * 0.3, panelH * 0.5, knobR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.7, panelH * 0.5, knobR, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // dryer  0.6 x 0.6 m
  // Neufert plan-view: similar to washer but with vent pattern
  // -----------------------------------------------------------------------
  {
    id: 'dryer',
    name: 'Dryer',
    nameEs: 'Secadora',
    category: 'laundry',
    width: 0.6,
    depth: 0.6,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Outer rectangle
      ctx.strokeRect(0, 0, w, h);

      // Control panel strip at top
      const panelH = h * 0.15;
      ctx.beginPath();
      ctx.moveTo(0, panelH);
      ctx.lineTo(w, panelH);
      ctx.stroke();

      // Drum circle
      const cx = w / 2;
      const cy = panelH + (h - panelH) / 2;
      const r = Math.min(w, h - panelH) * 0.32;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Vent holes pattern (small circles inside drum)
      const ventR = r * 0.12;
      const ventCount = 5;
      for (let i = 0; i < ventCount; i++) {
        const angle = (Math.PI * 2 * i) / ventCount;
        const vx = cx + Math.cos(angle) * r * 0.45;
        const vy = cy + Math.sin(angle) * r * 0.45;
        ctx.beginPath();
        ctx.arc(vx, vy, ventR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Large control dial
      const dialR = Math.min(w, h) * 0.045;
      ctx.beginPath();
      ctx.arc(w * 0.5, panelH * 0.5, dialR, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // laundry-sink  0.6 x 0.5 m
  // Neufert plan-view: utility sink with deep basin
  // -----------------------------------------------------------------------
  {
    id: 'laundry-sink',
    name: 'Laundry Sink',
    nameEs: 'Lavadero',
    category: 'laundry',
    width: 0.6,
    depth: 0.5,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Outer rectangle
      ctx.strokeRect(0, 0, w, h);

      // Deep basin (inner rectangle with rounded corners)
      const padX = w * 0.1;
      const padTop = h * 0.2;
      const padBot = h * 0.1;
      const basinW = w - padX * 2;
      const basinH = h - padTop - padBot;
      const radius = Math.min(basinW, basinH) * 0.08;
      ctx.beginPath();
      ctx.roundRect(padX, padTop, basinW, basinH, radius);
      ctx.stroke();

      // Drain
      const drainR = Math.min(w, h) * 0.025;
      ctx.beginPath();
      ctx.arc(w / 2, padTop + basinH * 0.6, drainR, 0, Math.PI * 2);
      ctx.stroke();

      // Faucet cross at top
      const fCx = w / 2;
      const fCy = h * 0.1;
      const fSize = Math.min(w, h) * 0.05;
      ctx.beginPath();
      ctx.moveTo(fCx - fSize, fCy);
      ctx.lineTo(fCx + fSize, fCy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fCx, fCy - fSize);
      ctx.lineTo(fCx, fCy + fSize);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // ironing-board  1.2 x 0.35 m
  // Neufert plan-view: tapered rectangle (narrow at one end)
  // -----------------------------------------------------------------------
  {
    id: 'ironing-board',
    name: 'Ironing Board',
    nameEs: 'Tabla de Planchar',
    category: 'laundry',
    width: 1.2,
    depth: 0.35,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Tapered board shape (wide at left, pointed at right)
      ctx.beginPath();
      ctx.moveTo(0, h * 0.1);
      ctx.lineTo(w * 0.85, 0);
      // Rounded tip
      ctx.quadraticCurveTo(w, h * 0.5, w * 0.85, h);
      ctx.lineTo(0, h * 0.9);
      ctx.closePath();
      ctx.stroke();

      // Leg indicators (X cross)
      ctx.lineWidth = 0.005;
      ctx.setLineDash([0.02, 0.02]);
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.2);
      ctx.lineTo(w * 0.5, h * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.2);
      ctx.lineTo(w * 0.2, h * 0.8);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },
];
