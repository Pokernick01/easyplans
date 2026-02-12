import type { StampDefinition } from '@/types/library';

export const accessoriesStamps: StampDefinition[] = [
  // -----------------------------------------------------------------------
  // floor-lamp  0.3 x 0.3 m
  // Circle with a cross/plus inside (plan view of floor lamp base)
  // -----------------------------------------------------------------------
  {
    id: 'floor-lamp',
    name: 'Floor Lamp',
    nameEs: 'Lampara de Pie',
    category: 'accessories',
    width: 0.3,
    depth: 0.3,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - lw;

      // Outer circle — lamp base footprint
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Cross / plus inside — indicates floor lamp symbol
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.7, cy);
      ctx.lineTo(cx + r * 0.7, cy);
      ctx.moveTo(cx, cy - r * 0.7);
      ctx.lineTo(cx, cy + r * 0.7);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // table-lamp  0.2 x 0.2 m
  // Circle with a smaller filled circle inside (lampshade plan view)
  // -----------------------------------------------------------------------
  {
    id: 'table-lamp',
    name: 'Table Lamp',
    nameEs: 'Lampara de Mesa',
    category: 'accessories',
    width: 0.2,
    depth: 0.2,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - lw;

      // Outer circle — lampshade outline
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Inner filled circle — lamp base/bulb
      const innerR = r * 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
    },
  },

  // -----------------------------------------------------------------------
  // ceiling-lamp  0.4 x 0.4 m
  // Dashed circle (above, convention for ceiling elements) with solid center
  // -----------------------------------------------------------------------
  {
    id: 'ceiling-lamp',
    name: 'Ceiling Lamp',
    nameEs: 'Lampara de Techo',
    category: 'accessories',
    width: 0.4,
    depth: 0.4,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - lw;

      // Outer dashed circle — ceiling element convention
      ctx.setLineDash([lw * 3, lw * 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Small solid center circle — fixture point
      const centerR = r * 0.2;
      ctx.beginPath();
      ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // chandelier  0.6 x 0.6 m
  // Dashed circle with radiating dashed lines and a center circle
  // -----------------------------------------------------------------------
  {
    id: 'chandelier',
    name: 'Chandelier',
    nameEs: 'Candelabro',
    category: 'accessories',
    width: 0.6,
    depth: 0.6,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - lw;

      // Outer dashed circle — ceiling element
      ctx.setLineDash([lw * 3, lw * 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // Radiating dashed lines — starburst pattern (8 rays)
      const innerGap = r * 0.3;
      const rayCount = 8;
      for (let i = 0; i < rayCount; i++) {
        const angle = (Math.PI * 2 * i) / rayCount;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * innerGap, cy + Math.sin(angle) * innerGap);
        ctx.lineTo(cx + Math.cos(angle) * r * 0.85, cy + Math.sin(angle) * r * 0.85);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Center solid circle — chandelier hub
      const centerR = r * 0.18;
      ctx.beginPath();
      ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // wall-sconce  0.15 x 0.1 m
  // Half-circle attached to a thick line (representing wall mount)
  // -----------------------------------------------------------------------
  {
    id: 'wall-sconce',
    name: 'Wall Sconce',
    nameEs: 'Aplique de Pared',
    category: 'accessories',
    width: 0.15,
    depth: 0.1,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;

      // Thick line at top — wall mount / wall edge
      ctx.lineWidth = lw * 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();
      ctx.lineWidth = lw;

      // Half-circle projecting downward from wall
      const radius = Math.min(w / 2, h) - lw;
      ctx.beginPath();
      ctx.arc(cx, 0, radius, 0, Math.PI);
      ctx.stroke();

      // Small line connecting half-circle ends to wall line
      ctx.beginPath();
      ctx.moveTo(cx - radius, 0);
      ctx.lineTo(cx + radius, 0);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // recessed-light  0.15 x 0.15 m
  // Concentric circles (outer dashed for ceiling recess, inner solid)
  // -----------------------------------------------------------------------
  {
    id: 'recessed-light',
    name: 'Recessed Light',
    nameEs: 'Luz Empotrada',
    category: 'accessories',
    width: 0.15,
    depth: 0.15,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const outerR = Math.min(w, h) / 2 - lw;

      // Outer dashed circle — ceiling recess cut-out
      ctx.setLineDash([lw * 2, lw * 2]);
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Inner solid circle — light aperture
      const innerR = outerR * 0.55;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // pendant-light  0.3 x 0.3 m
  // Dashed circle with a filled dot in center
  // -----------------------------------------------------------------------
  {
    id: 'pendant-light',
    name: 'Pendant Light',
    nameEs: 'Luz Colgante',
    category: 'accessories',
    width: 0.3,
    depth: 0.3,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - lw;

      // Outer dashed circle — pendant shade projection
      ctx.setLineDash([lw * 4, lw * 2]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center filled dot — cord / attachment point
      const dotR = r * 0.15;
      ctx.beginPath();
      ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
    },
  },

  // -----------------------------------------------------------------------
  // track-light  0.8 x 0.1 m
  // Long rectangle with evenly spaced small circles (track with spots)
  // -----------------------------------------------------------------------
  {
    id: 'track-light',
    name: 'Track Light',
    nameEs: 'Luz de Riel',
    category: 'accessories',
    width: 0.8,
    depth: 0.1,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      // Track body — dashed rectangle (ceiling-mounted)
      ctx.setLineDash([lw * 3, lw * 3]);
      ctx.strokeRect(0, 0, w, h);
      ctx.setLineDash([]);

      // Center line along track length
      const cy = h / 2;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      // Evenly spaced spot positions (small circles along the track)
      const spotCount = 4;
      const spotR = Math.min(h * 0.25, 0.02);
      const padding = w * 0.1;
      const spacing = (w - padding * 2) / (spotCount - 1);

      for (let i = 0; i < spotCount; i++) {
        const sx = padding + spacing * i;
        ctx.beginPath();
        ctx.arc(sx, cy, spotR, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  },

  // -----------------------------------------------------------------------
  // light-dome  0.8 x 0.8 m
  // Rectangular frame with X crosshatch and corner light-ray marks (tragaluz)
  // -----------------------------------------------------------------------
  {
    id: 'light-dome',
    name: 'Light Dome',
    nameEs: 'Tragaluz / Domo de Luz',
    category: 'accessories',
    width: 0.8,
    depth: 0.8,
    thumbnailColor: '#e8d44d',
    draw(ctx, w, h) {
      const lw = 0.01;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = lw;

      const pad = lw * 2;

      // Outer rectangle — dome frame / curb
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

      // Inner rectangle — glass panel edge (inset)
      const inset = Math.min(w, h) * 0.12;
      ctx.strokeRect(
        pad + inset,
        pad + inset,
        w - (pad + inset) * 2,
        h - (pad + inset) * 2,
      );

      // X crosshatch — indicates glazed / translucent panel
      const ix = pad + inset;
      const iy = pad + inset;
      const iw = w - (pad + inset) * 2;
      const ih = h - (pad + inset) * 2;

      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ix + iw, iy + ih);
      ctx.moveTo(ix + iw, iy);
      ctx.lineTo(ix, iy + ih);
      ctx.stroke();

      // Small diagonal light-ray marks at each corner of the outer frame
      // These short lines radiate outward from the corners to suggest light
      const rayLen = Math.min(w, h) * 0.08;
      const corners = [
        { x: pad, y: pad, dx: -1, dy: -1 },
        { x: w - pad, y: pad, dx: 1, dy: -1 },
        { x: w - pad, y: h - pad, dx: 1, dy: 1 },
        { x: pad, y: h - pad, dx: -1, dy: 1 },
      ];

      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      for (const c of corners) {
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + c.dx * rayLen, c.y + c.dy * rayLen);
      }
      ctx.stroke();

      // Additional short rays along each edge midpoint
      const midRayLen = rayLen * 0.7;
      const midpoints = [
        { x: w / 2, y: pad, dx: 0, dy: -1 },
        { x: w - pad, y: h / 2, dx: 1, dy: 0 },
        { x: w / 2, y: h - pad, dx: 0, dy: 1 },
        { x: pad, y: h / 2, dx: -1, dy: 0 },
      ];

      ctx.beginPath();
      for (const m of midpoints) {
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x + m.dx * midRayLen, m.y + m.dy * midRayLen);
      }
      ctx.stroke();
    },
  },
];
