import type { StampDefinition } from '@/types/library';

export const decorationStamps: StampDefinition[] = [
  // -----------------------------------------------------------------------
  // potted-plant  0.3 x 0.3 m
  // Circle with radiating leaf lines (plan view of potted plant)
  // -----------------------------------------------------------------------
  {
    id: 'potted-plant',
    name: 'Potted Plant',
    nameEs: 'Planta en Maceta',
    category: 'decoration',
    width: 0.3,
    depth: 0.3,
    thumbnailColor: '#66bb6a',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - lw;

      // Pot circle
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      // Leaves radiating outward
      const leafCount = 6;
      for (let i = 0; i < leafCount; i++) {
        const angle = (Math.PI * 2 * i) / leafCount;
        const innerR = r * 0.4;
        const outerR = r * 0.95;
        const midR = (innerR + outerR) / 2;
        // Leaf shape: curved line from pot to outer edge
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        const cpAngle = angle + 0.3;
        ctx.quadraticCurveTo(
          cx + Math.cos(cpAngle) * midR * 1.2,
          cy + Math.sin(cpAngle) * midR * 1.2,
          cx + Math.cos(angle) * outerR,
          cy + Math.sin(angle) * outerR,
        );
        ctx.stroke();
      }
    },
  },

  // -----------------------------------------------------------------------
  // rug-rectangular  1.5 x 1.0 m
  // Double rectangle (rug with border pattern)
  // -----------------------------------------------------------------------
  {
    id: 'rug-rectangular',
    name: 'Rug',
    nameEs: 'Alfombra',
    category: 'decoration',
    width: 1.5,
    depth: 1.0,
    thumbnailColor: '#bcaaa4',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Outer edge
      ctx.strokeRect(0, 0, w, h);

      // Inner border (decorative pattern)
      const m = Math.min(w, h) * 0.12;
      ctx.strokeRect(m, m, w - m * 2, h - m * 2);
    },
  },

  // -----------------------------------------------------------------------
  // rug-round  1.2 x 1.2 m
  // Concentric circles
  // -----------------------------------------------------------------------
  {
    id: 'rug-round',
    name: 'Round Rug',
    nameEs: 'Alfombra Redonda',
    category: 'decoration',
    width: 1.2,
    depth: 1.2,
    thumbnailColor: '#bcaaa4',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - lw;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // painting  0.8 x 0.05 m
  // Rectangle with inner frame (wall painting plan view)
  // -----------------------------------------------------------------------
  {
    id: 'painting',
    name: 'Painting',
    nameEs: 'Cuadro',
    category: 'decoration',
    width: 0.8,
    depth: 0.05,
    thumbnailColor: '#90a4ae',
    draw(ctx, w, h) {
      const lw = 0.005;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Frame
      ctx.strokeRect(0, 0, w, h);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
    },
  },

  // -----------------------------------------------------------------------
  // mirror  0.6 x 0.05 m
  // Thin rectangle with diagonal line (indicates reflective surface)
  // -----------------------------------------------------------------------
  {
    id: 'mirror',
    name: 'Mirror',
    nameEs: 'Espejo',
    category: 'decoration',
    width: 0.6,
    depth: 0.05,
    thumbnailColor: '#b0bec5',
    draw(ctx, w, h) {
      const lw = 0.005;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      ctx.strokeRect(0, 0, w, h);
      // Diagonal line to indicate mirror
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(w, 0);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // vase  0.15 x 0.15 m
  // Small circle with a dot in the center (plan view of flower vase)
  // -----------------------------------------------------------------------
  {
    id: 'vase',
    name: 'Vase',
    nameEs: 'Florero',
    category: 'decoration',
    width: 0.15,
    depth: 0.15,
    thumbnailColor: '#ce93d8',
    draw(ctx, w, h) {
      const lw = 0.008;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - lw;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Center dot (opening)
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
    },
  },

  // -----------------------------------------------------------------------
  // clock  0.3 x 0.3 m
  // Circle with clock hands (plan view / decorative)
  // -----------------------------------------------------------------------
  {
    id: 'clock',
    name: 'Wall Clock',
    nameEs: 'Reloj de Pared',
    category: 'decoration',
    width: 0.3,
    depth: 0.3,
    thumbnailColor: '#fff59d',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - lw;

      // Circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Hour hand (short, pointing to 10)
      const hourAngle = -Math.PI / 3;
      ctx.lineWidth = lw * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(hourAngle) * r * 0.5, cy + Math.sin(hourAngle) * r * 0.5);
      ctx.stroke();

      // Minute hand (long, pointing to 2)
      const minAngle = Math.PI / 6;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(minAngle) * r * 0.75, cy + Math.sin(minAngle) * r * 0.75);
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
    },
  },

  // -----------------------------------------------------------------------
  // curtain  0.15 x 1.5 m
  // Wavy line pattern (curtain/drape plan view)
  // -----------------------------------------------------------------------
  {
    id: 'curtain',
    name: 'Curtain',
    nameEs: 'Cortina',
    category: 'decoration',
    width: 0.15,
    depth: 1.5,
    thumbnailColor: '#ef9a9a',
    draw(ctx, w, h) {
      const lw = 0.008;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Outer rectangle
      ctx.strokeRect(0, 0, w, h);

      // Wavy lines inside
      const waves = 6;
      const waveH = h / waves;
      ctx.beginPath();
      for (let i = 0; i < waves; i++) {
        const y = waveH * i;
        ctx.moveTo(0, y + waveH * 0.25);
        ctx.quadraticCurveTo(w / 2, y, w, y + waveH * 0.25);
        ctx.moveTo(w, y + waveH * 0.75);
        ctx.quadraticCurveTo(w / 2, y + waveH, 0, y + waveH * 0.75);
      }
      ctx.stroke();
    },
  },
];
