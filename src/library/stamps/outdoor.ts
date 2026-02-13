import type { StampDefinition } from '@/types/library';

export const outdoorStamps: StampDefinition[] = [
  // -----------------------------------------------------------------------
  // tree-small  2.0 x 2.0 m
  // Neufert plan-view tree: canopy circle, filled trunk dot, 8 radial lines
  // -----------------------------------------------------------------------
  {
    id: 'tree-small',
    name: 'Small Tree',
    nameEs: 'Arbol Pequeno',
    category: 'outdoor',
    width: 2.0,
    depth: 2.0,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      const cx = w / 2;
      const cy = h / 2;
      const canopyR = Math.min(w, h) / 2 - 0.02;

      // Canopy outline circle
      ctx.beginPath();
      ctx.arc(cx, cy, canopyR, 0, Math.PI * 2);
      ctx.stroke();

      // Trunk - small filled black circle at center
      const trunkR = 0.06;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(cx, cy, trunkR, 0, Math.PI * 2);
      ctx.fill();

      // 8 radial lines from trunk outward (compass rose)
      const innerR = trunkR + 0.02;
      const outerR = canopyR * 0.65;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
        ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
        ctx.stroke();
      }
    },
  },

  // -----------------------------------------------------------------------
  // tree-large  4.0 x 4.0 m
  // Neufert large tree: wavy canopy outline, inner canopy circle,
  // filled trunk dot, radial branching lines
  // -----------------------------------------------------------------------
  {
    id: 'tree-large',
    name: 'Large Tree',
    nameEs: 'Arbol Grande',
    category: 'outdoor',
    width: 4.0,
    depth: 4.0,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      const cx = w / 2;
      const cy = h / 2;
      const canopyR = Math.min(w, h) / 2 - 0.03;

      // Wavy/organic canopy outline using overlapping arcs
      ctx.beginPath();
      const bumps = 12;
      const bumpDepth = canopyR * 0.08;
      for (let i = 0; i < bumps; i++) {
        const a0 = (Math.PI * 2 * i) / bumps;
        const a1 = (Math.PI * 2 * (i + 1)) / bumps;
        const midAngle = (a0 + a1) / 2;
        // Control point pushed inward to create scalloped edge
        const cpR = canopyR - bumpDepth;
        const cpx = cx + Math.cos(midAngle) * cpR;
        const cpy = cy + Math.sin(midAngle) * cpR;
        const x1 = cx + Math.cos(a1) * canopyR;
        const y1 = cy + Math.sin(a1) * canopyR;
        if (i === 0) {
          const x0 = cx + Math.cos(a0) * canopyR;
          const y0 = cy + Math.sin(a0) * canopyR;
          ctx.moveTo(x0, y0);
        }
        ctx.quadraticCurveTo(cpx, cpy, x1, y1);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner secondary canopy circle
      const innerR = canopyR * 0.55;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.stroke();

      // Trunk - small filled black circle at center
      const trunkR = 0.1;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(cx, cy, trunkR, 0, Math.PI * 2);
      ctx.fill();

      // Radial branching lines from trunk to inner canopy circle
      const branchInner = trunkR + 0.03;
      const branchOuter = innerR - 0.03;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * branchInner, cy + Math.sin(angle) * branchInner);
        ctx.lineTo(cx + Math.cos(angle) * branchOuter, cy + Math.sin(angle) * branchOuter);
        ctx.stroke();
      }

      // Secondary shorter branch lines between the main ones
      const secOuter = canopyR * 0.38;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + Math.PI / 8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * branchInner, cy + Math.sin(angle) * branchInner);
        ctx.lineTo(cx + Math.cos(angle) * secOuter, cy + Math.sin(angle) * secOuter);
        ctx.stroke();
      }
    },
  },

  // -----------------------------------------------------------------------
  // bush  1.0 x 1.0 m
  // Neufert plan-view bush: organic cloud-like outline of overlapping arcs,
  // small cross at center
  // -----------------------------------------------------------------------
  {
    id: 'bush',
    name: 'Bush',
    nameEs: 'Arbusto',
    category: 'outdoor',
    width: 1.0,
    depth: 1.0,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - 0.02;

      // Cloud-like outline: 5 overlapping arc bumps
      const lobes = 5;
      const lobeR = r * 0.52;
      ctx.beginPath();
      for (let i = 0; i < lobes; i++) {
        const angle = (Math.PI * 2 * i) / lobes - Math.PI / 2;
        const lobeCx = cx + Math.cos(angle) * (r - lobeR);
        const lobeCy = cy + Math.sin(angle) * (r - lobeR);
        ctx.moveTo(lobeCx + lobeR, lobeCy);
        ctx.arc(lobeCx, lobeCy, lobeR, 0, Math.PI * 2);
      }
      ctx.stroke();

      // Small cross at center
      const crossSize = 0.06;
      ctx.beginPath();
      ctx.moveTo(cx - crossSize, cy);
      ctx.lineTo(cx + crossSize, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - crossSize);
      ctx.lineTo(cx, cy + crossSize);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // car  4.5 x 1.8 m
  // Neufert plan-view car: rounded body, windshield/rear window, wheel
  // wells, side mirrors, door lines
  // -----------------------------------------------------------------------
  {
    id: 'car',
    name: 'Car',
    nameEs: 'Coche',
    category: 'outdoor',
    width: 4.5,
    depth: 1.8,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const bodyR = Math.min(w, h) * 0.12;

      // Car body outline - rounded rectangle
      ctx.lineWidth = lw * 1.5;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, bodyR);
      ctx.stroke();
      ctx.lineWidth = lw;

      // Windshield (angled line near front)
      const wsX = w * 0.22;
      const pad = h * 0.06;
      ctx.beginPath();
      ctx.moveTo(wsX - w * 0.015, pad);
      ctx.lineTo(wsX + w * 0.015, h - pad);
      ctx.stroke();

      // Rear window
      const rwX = w * 0.75;
      ctx.beginPath();
      ctx.moveTo(rwX + w * 0.015, pad);
      ctx.lineTo(rwX - w * 0.015, h - pad);
      ctx.stroke();

      // Wheel wells — rounded notches at four corners
      const wheelR = h * 0.15;
      const wheelInset = w * 0.16;

      ctx.lineWidth = lw * 1.2;
      // Front-left
      ctx.beginPath();
      ctx.arc(wheelInset, 0, wheelR, 0.2, Math.PI - 0.2);
      ctx.stroke();
      // Front-right
      ctx.beginPath();
      ctx.arc(wheelInset, h, wheelR, Math.PI + 0.2, -0.2);
      ctx.stroke();
      // Rear-left
      ctx.beginPath();
      ctx.arc(w - wheelInset, 0, wheelR, 0.2, Math.PI - 0.2);
      ctx.stroke();
      // Rear-right
      ctx.beginPath();
      ctx.arc(w - wheelInset, h, wheelR, Math.PI + 0.2, -0.2);
      ctx.stroke();
      ctx.lineWidth = lw;

      // Door lines (2 vertical lines between wheel wells)
      const doorX1 = w * 0.42;
      const doorX2 = w * 0.58;
      ctx.beginPath();
      ctx.moveTo(doorX1, pad);
      ctx.lineTo(doorX1, h - pad);
      ctx.moveTo(doorX2, pad);
      ctx.lineTo(doorX2, h - pad);
      ctx.stroke();

      // Side mirrors — small rectangles projecting from sides
      const mirrorW = 0.06;
      const mirrorH = 0.04;
      const mirrorX = wsX + w * 0.03;
      ctx.strokeRect(mirrorX, -mirrorH, mirrorW, mirrorH);
      ctx.strokeRect(mirrorX, h, mirrorW, mirrorH);

      // Hood/trunk center crease
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(w * 0.05, h * 0.5);
      ctx.lineTo(wsX - w * 0.02, h * 0.5);
      ctx.moveTo(rwX + w * 0.02, h * 0.5);
      ctx.lineTo(w * 0.95, h * 0.5);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // parking-spot  5.0 x 2.5 m
  // Dashed rectangle outline with "P" text in center
  // -----------------------------------------------------------------------
  {
    id: 'parking-spot',
    name: 'Parking Spot',
    nameEs: 'Plaza de Aparcamiento',
    category: 'outdoor',
    width: 5.0,
    depth: 2.5,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Dashed rectangle outline
      ctx.setLineDash([0.1, 0.08]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);

      // "P" text in center
      ctx.fillStyle = '#000';
      const fontSize = Math.min(w, h) * 0.35;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', w / 2, h / 2);
    },
  },

  // -----------------------------------------------------------------------
  // bench  1.5 x 0.5 m
  // Neufert plan-view bench: rectangle seat, thick backrest line,
  // horizontal slat lines
  // -----------------------------------------------------------------------
  {
    id: 'bench',
    name: 'Bench',
    nameEs: 'Banco',
    category: 'outdoor',
    width: 1.5,
    depth: 0.5,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Seat rectangle outline
      const backrestH = h * 0.2;
      ctx.strokeRect(0, backrestH, w, h - backrestH);

      // Thick backrest line at top
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.moveTo(0, backrestH * 0.5);
      ctx.lineTo(w, backrestH * 0.5);
      ctx.stroke();

      // Horizontal slat lines on seat
      ctx.lineWidth = 0.005;
      const seatTop = backrestH;
      const seatH = h - backrestH;
      const slats = 4;
      for (let i = 1; i < slats; i++) {
        const sy = seatTop + (seatH / slats) * i;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(w, sy);
        ctx.stroke();
      }
    },
  },

  // -----------------------------------------------------------------------
  // pool  4.0 x 2.5 m
  // Neufert plan-view pool: double-outline rounded rectangle, ladder
  // symbol at one end, wavy water ripple lines
  // -----------------------------------------------------------------------
  {
    id: 'pool',
    name: 'Pool',
    nameEs: 'Piscina',
    category: 'outdoor',
    width: 4.0,
    depth: 2.5,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      const r = Math.min(w, h) * 0.08;

      // Outer pool outline
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, r);
      ctx.stroke();

      // Inner pool outline (offset inward)
      const inset = 0.08;
      ctx.beginPath();
      ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, r * 0.6);
      ctx.stroke();

      // Ladder symbol at the right end
      const ladderX1 = w - inset - 0.15;
      const ladderX2 = w - inset - 0.05;
      const ladderTop = h * 0.3;
      const ladderBot = h * 0.7;

      // Ladder rails (two vertical lines)
      ctx.beginPath();
      ctx.moveTo(ladderX1, ladderTop);
      ctx.lineTo(ladderX1, ladderBot);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ladderX2, ladderTop);
      ctx.lineTo(ladderX2, ladderBot);
      ctx.stroke();

      // Ladder rungs (3 horizontal lines)
      for (let i = 0; i < 3; i++) {
        const ry = ladderTop + ((ladderBot - ladderTop) / 3) * (i + 0.5);
        ctx.beginPath();
        ctx.moveTo(ladderX1, ry);
        ctx.lineTo(ladderX2, ry);
        ctx.stroke();
      }

      // Water ripple lines - wavy horizontal lines
      const rippleCount = 3;
      const rippleLeft = inset + 0.15;
      const rippleRight = ladderX1 - 0.15;
      const rippleWidth = rippleRight - rippleLeft;
      for (let i = 0; i < rippleCount; i++) {
        const ry = h * (0.3 + (0.4 / (rippleCount + 1)) * (i + 1));
        ctx.beginPath();
        const segments = 8;
        for (let s = 0; s <= segments; s++) {
          const sx = rippleLeft + (rippleWidth / segments) * s;
          const sy = ry + Math.sin((s / segments) * Math.PI * 4) * 0.04;
          if (s === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
    },
  },
];
