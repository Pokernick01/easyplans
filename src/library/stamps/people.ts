import type { StampDefinition } from '@/types/library';

export const peopleStamps: StampDefinition[] = [
  // -----------------------------------------------------------------------
  // person-standing  0.5 x 0.5 m
  // Neufert plan-view: body circle outline, filled black head circle offset
  // toward facing direction, shoulder line, small direction triangle.
  // -----------------------------------------------------------------------
  {
    id: 'person-standing',
    name: 'Person (Standing)',
    nameEs: 'Persona (De Pie)',
    category: 'people',
    width: 0.5,
    depth: 0.5,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const bodyR = Math.min(w, h) * 0.30;

      // Body circle outline
      ctx.beginPath();
      ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
      ctx.stroke();

      // Shoulder line — horizontal line across the body circle
      ctx.beginPath();
      ctx.moveTo(cx - bodyR * 0.75, cy);
      ctx.lineTo(cx + bodyR * 0.75, cy);
      ctx.stroke();

      // Head — small filled black circle, offset upward (facing direction)
      const headR = bodyR * 0.28;
      ctx.beginPath();
      ctx.arc(cx, cy - bodyR * 0.38, headR, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();

      // Direction triangle pointer — pointing upward (facing direction)
      const triBase = bodyR * 0.28;
      const triTip = cy - bodyR - bodyR * 0.22;
      const triY = cy - bodyR + lw;
      ctx.beginPath();
      ctx.moveTo(cx, triTip);
      ctx.lineTo(cx - triBase, triY);
      ctx.lineTo(cx + triBase, triY);
      ctx.closePath();
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // person-sitting  0.45 x 0.45 m
  // Neufert sitting person: body circle outline, filled black head circle,
  // two short leg lines extending forward, horizontal seat reference line.
  // -----------------------------------------------------------------------
  {
    id: 'person-sitting',
    name: 'Person (Sitting)',
    nameEs: 'Persona (Sentada)',
    category: 'people',
    width: 0.45,
    depth: 0.45,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h * 0.45;
      const bodyR = Math.min(w, h) * 0.26;

      // Body circle outline
      ctx.beginPath();
      ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
      ctx.stroke();

      // Head — small filled black circle, offset upward
      const headR = bodyR * 0.30;
      ctx.beginPath();
      ctx.arc(cx, cy - bodyR * 0.35, headR, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();

      // Two leg lines extending downward (forward from seated position)
      const legStart = cy + bodyR;
      const legEnd = h * 0.92;
      const legSpread = bodyR * 0.45;
      ctx.beginPath();
      ctx.moveTo(cx - legSpread, legStart);
      ctx.lineTo(cx - legSpread, legEnd);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + legSpread, legStart);
      ctx.lineTo(cx + legSpread, legEnd);
      ctx.stroke();

      // Horizontal seat/chair reference line
      const seatY = cy + bodyR + lw;
      ctx.beginPath();
      ctx.moveTo(cx - bodyR * 1.2, seatY);
      ctx.lineTo(cx + bodyR * 1.2, seatY);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // wheelchair  0.7 x 0.7 m
  // Neufert wheelchair plan symbol: large wheel circle, inner tire circle,
  // person as small filled circle, footrest lines at front, handle at back.
  // -----------------------------------------------------------------------
  {
    id: 'wheelchair',
    name: 'Wheelchair',
    nameEs: 'Silla de Ruedas',
    category: 'people',
    width: 0.7,
    depth: 0.7,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h * 0.48;
      const wheelR = Math.min(w, h) * 0.34;

      // Main wheel circle outline
      ctx.beginPath();
      ctx.arc(cx, cy, wheelR, 0, Math.PI * 2);
      ctx.stroke();

      // Inner tire circle
      ctx.beginPath();
      ctx.arc(cx, cy, wheelR * 0.82, 0, Math.PI * 2);
      ctx.stroke();

      // Person — small filled black circle inside the wheelchair
      const personR = wheelR * 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy - wheelR * 0.12, personR, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();

      // Footrest lines at front (bottom) — two short angled lines
      const footY = cy + wheelR;
      const footLen = h * 0.10;
      const footSpread = wheelR * 0.35;
      ctx.beginPath();
      ctx.moveTo(cx - footSpread, footY);
      ctx.lineTo(cx - footSpread * 0.6, footY + footLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + footSpread, footY);
      ctx.lineTo(cx + footSpread * 0.6, footY + footLen);
      ctx.stroke();

      // Footrest crossbar
      ctx.beginPath();
      ctx.moveTo(cx - footSpread * 0.6, footY + footLen);
      ctx.lineTo(cx + footSpread * 0.6, footY + footLen);
      ctx.stroke();

      // Handle lines at back (top) — vertical stem and crossbar
      const handleTop = cy - wheelR - h * 0.12;
      ctx.beginPath();
      ctx.moveTo(cx, cy - wheelR);
      ctx.lineTo(cx, handleTop);
      ctx.stroke();

      // Handle crossbar (grip)
      const gripHalf = w * 0.07;
      ctx.beginPath();
      ctx.moveTo(cx - gripHalf, handleTop);
      ctx.lineTo(cx + gripHalf, handleTop);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // person-walking  0.5 x 0.6 m
  // Neufert walking person: body circle, head, two leg lines spread apart
  // -----------------------------------------------------------------------
  {
    id: 'person-walking',
    name: 'Person (Walking)',
    nameEs: 'Persona (Caminando)',
    category: 'people',
    width: 0.5,
    depth: 0.6,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h * 0.4;
      const bodyR = Math.min(w, h) * 0.25;

      // Body circle outline
      ctx.beginPath();
      ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
      ctx.stroke();

      // Head
      const headR = bodyR * 0.28;
      ctx.beginPath();
      ctx.arc(cx, cy - bodyR * 0.38, headR, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();

      // Direction triangle
      const triTip = cy - bodyR - bodyR * 0.22;
      const triY = cy - bodyR + lw;
      const triBase = bodyR * 0.25;
      ctx.beginPath();
      ctx.moveTo(cx, triTip);
      ctx.lineTo(cx - triBase, triY);
      ctx.lineTo(cx + triBase, triY);
      ctx.closePath();
      ctx.stroke();

      // Walking legs (spread apart)
      const legStart = cy + bodyR;
      const legEnd = h * 0.95;
      ctx.beginPath();
      ctx.moveTo(cx, legStart);
      ctx.lineTo(cx - bodyR * 0.6, legEnd);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, legStart);
      ctx.lineTo(cx + bodyR * 0.6, legEnd);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // person-child  0.35 x 0.35 m
  // Smaller person symbol
  // -----------------------------------------------------------------------
  {
    id: 'person-child',
    name: 'Child',
    nameEs: 'Ni\u00f1o',
    category: 'people',
    width: 0.35,
    depth: 0.35,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.008;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const bodyR = Math.min(w, h) * 0.28;

      // Body circle
      ctx.beginPath();
      ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
      ctx.stroke();

      // Head
      const headR = bodyR * 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy - bodyR * 0.3, headR, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
    },
  },

  // -----------------------------------------------------------------------
  // group-people  1.0 x 0.8 m
  // Three overlapping person circles
  // -----------------------------------------------------------------------
  {
    id: 'group-people',
    name: 'Group of People',
    nameEs: 'Grupo de Personas',
    category: 'people',
    width: 1.0,
    depth: 0.8,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const r = Math.min(w, h) * 0.2;
      const positions = [
        { x: w * 0.3, y: h * 0.45 },
        { x: w * 0.5, y: h * 0.35 },
        { x: w * 0.7, y: h * 0.45 },
      ];

      for (const p of positions) {
        // Body circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Head
        const headR = r * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y - r * 0.35, headR, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();

        // Shoulder line
        ctx.beginPath();
        ctx.moveTo(p.x - r * 0.65, p.y);
        ctx.lineTo(p.x + r * 0.65, p.y);
        ctx.stroke();
      }
    },
  },
];
