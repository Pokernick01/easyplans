import type { StampDefinition } from '@/types/library';

export const furnitureStamps: StampDefinition[] = [
  // -----------------------------------------------------------------------
  // bed-single  0.9 x 2.0 m
  // -----------------------------------------------------------------------
  {
    id: 'bed-single',
    name: 'Single Bed',
    nameEs: 'Cama Individual',
    category: 'furniture',
    width: 0.9,
    depth: 2.0,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Outer mattress rectangle
      ctx.strokeRect(0, 0, w, h);

      // Headboard — thick line at top
      ctx.lineWidth = lw * 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();
      ctx.lineWidth = lw;

      // Pillow outline (rounded rectangle near headboard)
      const pad = w * 0.1;
      const pillowY = 0.06;
      const pillowH = h * 0.12;
      const pillowW = w - pad * 2;
      const r = pillowH * 0.3;
      ctx.beginPath();
      ctx.roundRect(pad, pillowY, pillowW, pillowH, r);
      ctx.stroke();

      // Blanket fold line — a single horizontal line across the bed
      ctx.beginPath();
      ctx.moveTo(0, h * 0.45);
      ctx.lineTo(w, h * 0.45);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // bed-double  1.4 x 2.0 m
  // -----------------------------------------------------------------------
  {
    id: 'bed-double',
    name: 'Double Bed',
    nameEs: 'Cama Doble',
    category: 'furniture',
    width: 1.4,
    depth: 2.0,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Outer mattress rectangle
      ctx.strokeRect(0, 0, w, h);

      // Headboard — thick line at top
      ctx.lineWidth = lw * 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();
      ctx.lineWidth = lw;

      // Two pillows side by side
      const pad = w * 0.06;
      const gap = w * 0.04;
      const pillowW = (w - pad * 2 - gap) / 2;
      const pillowH = h * 0.12;
      const pillowY = 0.06;
      const r = pillowH * 0.3;

      // Left pillow
      ctx.beginPath();
      ctx.roundRect(pad, pillowY, pillowW, pillowH, r);
      ctx.stroke();

      // Right pillow
      ctx.beginPath();
      ctx.roundRect(pad + pillowW + gap, pillowY, pillowW, pillowH, r);
      ctx.stroke();

      // Center divider line (between two sleeping positions)
      ctx.setLineDash([lw * 4, lw * 4]);
      ctx.beginPath();
      ctx.moveTo(w / 2, pillowY + pillowH + 0.02);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Blanket fold line
      ctx.beginPath();
      ctx.moveTo(0, h * 0.45);
      ctx.lineTo(w, h * 0.45);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // sofa-2seat  1.6 x 0.8 m
  // -----------------------------------------------------------------------
  {
    id: 'sofa-2seat',
    name: '2-Seat Sofa',
    nameEs: 'Sofa 2 Plazas',
    category: 'furniture',
    width: 1.6,
    depth: 0.8,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const backD = h * 0.22;
      const armW = w * 0.08;

      // Backrest outline
      ctx.strokeRect(0, 0, w, backD);

      // Seat area outline (between armrests)
      ctx.strokeRect(armW, backD, w - armW * 2, h - backD);

      // Left armrest outline
      ctx.strokeRect(0, backD, armW, h - backD);

      // Right armrest outline
      ctx.strokeRect(w - armW, backD, armW, h - backD);

      // Seat divider line (center)
      ctx.beginPath();
      ctx.moveTo(w / 2, backD);
      ctx.lineTo(w / 2, h);
      ctx.stroke();

      // Backrest inner line (slight offset to show thickness)
      ctx.beginPath();
      ctx.moveTo(armW, backD * 0.35);
      ctx.lineTo(w - armW, backD * 0.35);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // sofa-3seat  2.2 x 0.8 m
  // -----------------------------------------------------------------------
  {
    id: 'sofa-3seat',
    name: '3-Seat Sofa',
    nameEs: 'Sofa 3 Plazas',
    category: 'furniture',
    width: 2.2,
    depth: 0.8,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const backD = h * 0.22;
      const armW = w * 0.06;

      // Backrest outline
      ctx.strokeRect(0, 0, w, backD);

      // Seat area outline
      ctx.strokeRect(armW, backD, w - armW * 2, h - backD);

      // Left armrest outline
      ctx.strokeRect(0, backD, armW, h - backD);

      // Right armrest outline
      ctx.strokeRect(w - armW, backD, armW, h - backD);

      // Seat divider lines (3 seats = 2 dividers)
      const seatW = (w - armW * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(armW + seatW, backD);
      ctx.lineTo(armW + seatW, h);
      ctx.moveTo(armW + seatW * 2, backD);
      ctx.lineTo(armW + seatW * 2, h);
      ctx.stroke();

      // Backrest inner line
      ctx.beginPath();
      ctx.moveTo(armW, backD * 0.35);
      ctx.lineTo(w - armW, backD * 0.35);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // armchair  0.8 x 0.8 m
  // -----------------------------------------------------------------------
  {
    id: 'armchair',
    name: 'Armchair',
    nameEs: 'Sillon',
    category: 'furniture',
    width: 0.8,
    depth: 0.8,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const backD = h * 0.22;
      const armW = w * 0.15;

      // Backrest outline
      ctx.strokeRect(0, 0, w, backD);

      // Seat area outline
      ctx.strokeRect(armW, backD, w - armW * 2, h - backD);

      // Left armrest outline
      ctx.strokeRect(0, backD, armW, h - backD);

      // Right armrest outline
      ctx.strokeRect(w - armW, backD, armW, h - backD);

      // Backrest inner line (cushion edge)
      ctx.beginPath();
      ctx.moveTo(armW, backD * 0.4);
      ctx.lineTo(w - armW, backD * 0.4);
      ctx.stroke();

      // Seat cushion rounded inset
      const inset = 0.02;
      const seatX = armW + inset;
      const seatY = backD + inset;
      const seatW = w - armW * 2 - inset * 2;
      const seatH = h - backD - inset * 2;
      const r = Math.min(seatW, seatH) * 0.1;
      ctx.beginPath();
      ctx.roundRect(seatX, seatY, seatW, seatH, r);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // dining-table  1.2 x 0.8 m
  // -----------------------------------------------------------------------
  {
    id: 'dining-table',
    name: 'Dining Table',
    nameEs: 'Mesa de Comedor',
    category: 'furniture',
    width: 1.2,
    depth: 0.8,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Table top outline
      ctx.strokeRect(0, 0, w, h);

      // Leg indications — small squares at each corner (inset)
      const legSize = 0.04;
      const legInset = 0.03;

      // Top-left leg
      ctx.strokeRect(legInset, legInset, legSize, legSize);
      // Top-right leg
      ctx.strokeRect(w - legInset - legSize, legInset, legSize, legSize);
      // Bottom-left leg
      ctx.strokeRect(legInset, h - legInset - legSize, legSize, legSize);
      // Bottom-right leg
      ctx.strokeRect(w - legInset - legSize, h - legInset - legSize, legSize, legSize);

      // Apron lines (inner edge detail) — slightly inset rectangle
      const apronInset = legInset + legSize;
      ctx.setLineDash([lw * 3, lw * 3]);
      ctx.strokeRect(apronInset, apronInset, w - apronInset * 2, h - apronInset * 2);
      ctx.setLineDash([]);
    },
  },

  // -----------------------------------------------------------------------
  // dining-table-round  1.0 x 1.0 m
  // -----------------------------------------------------------------------
  {
    id: 'dining-table-round',
    name: 'Round Table',
    nameEs: 'Mesa Redonda',
    category: 'furniture',
    width: 1.0,
    depth: 1.0,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - lw;

      // Table top circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Cross-hair center mark
      const markLen = 0.04;
      ctx.beginPath();
      ctx.moveTo(cx - markLen, cy);
      ctx.lineTo(cx + markLen, cy);
      ctx.moveTo(cx, cy - markLen);
      ctx.lineTo(cx, cy + markLen);
      ctx.stroke();

      // Central pedestal indication (small circle)
      const pedastalR = r * 0.15;
      ctx.beginPath();
      ctx.arc(cx, cy, pedastalR, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // desk  1.4 x 0.7 m
  // -----------------------------------------------------------------------
  {
    id: 'desk',
    name: 'Desk',
    nameEs: 'Escritorio',
    category: 'furniture',
    width: 1.4,
    depth: 0.7,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Desk surface outline
      ctx.strokeRect(0, 0, w, h);

      // Front edge detail — thicker line at bottom
      ctx.lineWidth = lw * 2;
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(w, h);
      ctx.stroke();
      ctx.lineWidth = lw;

      // Right-side drawer bank (typical Neufert desk plan)
      const drawerBankW = w * 0.3;
      const drawerBankX = w - drawerBankW;
      const drawerBankY = 0.03;
      const drawerBankH = h - 0.06;

      // Drawer bank outer rectangle
      ctx.strokeRect(drawerBankX, drawerBankY, drawerBankW - 0.03, drawerBankH);

      // Individual drawers (3 drawers)
      const drawerCount = 3;
      const drawerH = drawerBankH / drawerCount;
      for (let i = 1; i < drawerCount; i++) {
        ctx.beginPath();
        ctx.moveTo(drawerBankX, drawerBankY + drawerH * i);
        ctx.lineTo(drawerBankX + drawerBankW - 0.03, drawerBankY + drawerH * i);
        ctx.stroke();
      }

      // Drawer handles — small horizontal lines centered in each drawer
      for (let i = 0; i < drawerCount; i++) {
        const handleY = drawerBankY + drawerH * i + drawerH / 2;
        const handleCx = drawerBankX + (drawerBankW - 0.03) / 2;
        const handleHalfW = 0.03;
        ctx.beginPath();
        ctx.moveTo(handleCx - handleHalfW, handleY);
        ctx.lineTo(handleCx + handleHalfW, handleY);
        ctx.stroke();
      }

      // Knee-space indication — dashed line for left open section
      ctx.setLineDash([lw * 3, lw * 3]);
      ctx.beginPath();
      ctx.moveTo(drawerBankX, 0);
      ctx.lineTo(drawerBankX, h);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },

  // -----------------------------------------------------------------------
  // chair  0.45 x 0.45 m
  // -----------------------------------------------------------------------
  {
    id: 'chair',
    name: 'Chair',
    nameEs: 'Silla',
    category: 'furniture',
    width: 0.45,
    depth: 0.45,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Seat outline (slightly below top to leave room for backrest)
      const backrestH = h * 0.12;
      ctx.strokeRect(0, backrestH, w, h - backrestH);

      // Backrest — thick line at top edge
      ctx.lineWidth = lw * 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();
      ctx.lineWidth = lw;

      // Backrest side lines connecting to seat
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, backrestH);
      ctx.moveTo(w, 0);
      ctx.lineTo(w, backrestH);
      ctx.stroke();

      // Leg indications — small marks at corners
      const legMark = 0.02;
      // Front-left
      ctx.beginPath();
      ctx.moveTo(legMark, h);
      ctx.lineTo(legMark, h - legMark);
      ctx.lineTo(0, h - legMark);
      ctx.stroke();
      // Front-right
      ctx.beginPath();
      ctx.moveTo(w - legMark, h);
      ctx.lineTo(w - legMark, h - legMark);
      ctx.lineTo(w, h - legMark);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // wardrobe  1.8 x 0.6 m
  // -----------------------------------------------------------------------
  {
    id: 'wardrobe',
    name: 'Wardrobe',
    nameEs: 'Armario',
    category: 'furniture',
    width: 1.8,
    depth: 0.6,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Body outline
      ctx.strokeRect(0, 0, w, h);

      // Center vertical divider
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();

      // Door swing arcs (quarter circles showing door opening)
      // Left door swings open to the left from center
      ctx.beginPath();
      ctx.arc(w / 2, h, w / 2, Math.PI * 1.5, Math.PI, true);
      ctx.stroke();

      // Right door swings open to the right from center
      ctx.beginPath();
      ctx.arc(w / 2, h, w / 2, Math.PI * 1.5, Math.PI * 2, false);
      ctx.stroke();

      // 45-degree hatching inside to indicate section (Neufert convention)
      ctx.lineWidth = lw * 0.5;
      const spacing = 0.05;
      ctx.beginPath();
      for (let x = spacing; x < w; x += spacing) {
        // Diagonal lines from bottom-left to top-right direction
        const startX = x;
        const startY = 0;
        const endX = x - h;
        const endY = h;

        // Clip to rectangle bounds
        let x0 = startX;
        let y0 = startY;
        let x1 = endX;
        let y1 = endY;

        if (x1 < 0) {
          y1 = startY + startX; // y where line hits x=0
          x1 = 0;
        }
        if (y1 > h) {
          y1 = h;
          x1 = startX - h;
          if (x1 < 0) { x1 = 0; y1 = startX; }
        }

        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
      }
      // Additional lines starting from top edge
      for (let y = spacing; y < h; y += spacing) {
        const startX = w;
        const startY = y;
        const endX = w - (h - y);
        const endY = h;

        let x1 = endX;
        let y1 = endY;
        if (x1 < 0) { x1 = 0; y1 = startY + startX; if (y1 > h) continue; }

        ctx.moveTo(startX, startY);
        ctx.lineTo(x1, y1);
      }
      ctx.stroke();
      ctx.lineWidth = lw;
    },
  },

  // -----------------------------------------------------------------------
  // bookshelf  1.0 x 0.35 m
  // -----------------------------------------------------------------------
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    nameEs: 'Estanteria',
    category: 'furniture',
    width: 1.0,
    depth: 0.35,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Body outline
      ctx.strokeRect(0, 0, w, h);

      // Side panels (thicker representation of cabinet sides)
      const sideW = 0.02;
      ctx.strokeRect(0, 0, sideW, h);
      ctx.strokeRect(w - sideW, 0, sideW, h);

      // Horizontal shelf lines (4 shelves dividing into 5 bays)
      for (let i = 1; i <= 4; i++) {
        const y = (h / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Back panel indication — dashed line at rear
      ctx.setLineDash([lw * 2, lw * 2]);
      ctx.beginPath();
      ctx.moveTo(sideW, lw * 2);
      ctx.lineTo(w - sideW, lw * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },

  // -----------------------------------------------------------------------
  // tv-stand  1.2 x 0.4 m
  // -----------------------------------------------------------------------
  {
    id: 'tv-stand',
    name: 'TV Stand',
    nameEs: 'Mueble de TV',
    category: 'furniture',
    width: 1.2,
    depth: 0.4,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Cabinet body outline
      ctx.strokeRect(0, 0, w, h);

      // Center vertical divider (two compartments)
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();

      // Horizontal center shelf line
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // TV screen indication on top — thin rectangle centered
      const tvW = w * 0.6;
      const tvD = 0.02;
      const tvX = (w - tvW) / 2;
      const tvY = -tvD - 0.01;
      ctx.strokeRect(tvX, tvY, tvW, tvD);

      // TV base/stand small line
      ctx.beginPath();
      ctx.moveTo(w / 2 - 0.04, 0);
      ctx.lineTo(w / 2 - 0.04, tvY + tvD);
      ctx.moveTo(w / 2 + 0.04, 0);
      ctx.lineTo(w / 2 + 0.04, tvY + tvD);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // coffee-table  0.8 x 0.5 m
  // -----------------------------------------------------------------------
  {
    id: 'coffee-table',
    name: 'Coffee Table',
    nameEs: 'Mesa de Centro',
    category: 'furniture',
    width: 0.8,
    depth: 0.5,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Rounded rectangle outline for table top
      const r = Math.min(w, h) * 0.12;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, r);
      ctx.stroke();

      // Leg indications at corners (small circles, Neufert style)
      const legR = 0.015;
      const legInset = r * 0.7;

      ctx.beginPath();
      ctx.arc(legInset, legInset, legR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w - legInset, legInset, legR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(legInset, h - legInset, legR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w - legInset, h - legInset, legR, 0, Math.PI * 2);
      ctx.stroke();

      // Shelf below — inset rounded rectangle (dashed)
      const shelfInset = 0.05;
      const shelfR = r * 0.6;
      ctx.setLineDash([lw * 2, lw * 2]);
      ctx.beginPath();
      ctx.roundRect(shelfInset, shelfInset, w - shelfInset * 2, h - shelfInset * 2, shelfR);
      ctx.stroke();
      ctx.setLineDash([]);
    },
  },
];
