import type { StampDefinition } from '@/types/library';

export const kitchenStamps: StampDefinition[] = [
  // -----------------------------------------------------------------------
  // stove-4burner  0.6 x 0.6 m
  // -----------------------------------------------------------------------
  {
    id: 'stove-4burner',
    name: '4-Burner Stove',
    nameEs: 'Cocina 4 Fuegos',
    category: 'kitchen',
    width: 0.6,
    depth: 0.6,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Outer rectangle
      ctx.strokeRect(0, 0, w, h);

      // 4 burners in 2x2 grid
      const outerR = Math.min(w, h) * 0.15;
      const innerR = outerR * 0.5;
      const padX = w * 0.25;
      const padY = h * 0.25;
      const positions: [number, number][] = [
        [padX, padY],
        [w - padX, padY],
        [padX, h - padY],
        [w - padX, h - padY],
      ];

      for (const [bx, by] of positions) {
        // Outer ring
        ctx.beginPath();
        ctx.arc(bx, by, outerR, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        ctx.beginPath();
        ctx.arc(bx, by, innerR, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  },

  // -----------------------------------------------------------------------
  // stove-6burner  0.9 x 0.6 m
  // -----------------------------------------------------------------------
  {
    id: 'stove-6burner',
    name: '6-Burner Stove',
    nameEs: 'Cocina 6 Fuegos',
    category: 'kitchen',
    width: 0.9,
    depth: 0.6,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Outer rectangle
      ctx.strokeRect(0, 0, w, h);

      // 6 burners in 3 cols x 2 rows
      const cols = 3;
      const rows = 2;
      const cellW = w / cols;
      const cellH = h / rows;
      const outerR = Math.min(cellW, cellH) * 0.3;
      const innerR = outerR * 0.5;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = cellW * c + cellW / 2;
          const by = cellH * r + cellH / 2;

          // Outer ring
          ctx.beginPath();
          ctx.arc(bx, by, outerR, 0, Math.PI * 2);
          ctx.stroke();

          // Inner ring
          ctx.beginPath();
          ctx.arc(bx, by, innerR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    },
  },

  // -----------------------------------------------------------------------
  // fridge  0.7 x 0.7 m
  // -----------------------------------------------------------------------
  {
    id: 'fridge',
    name: 'Fridge',
    nameEs: 'Refrigerador',
    category: 'kitchen',
    width: 0.7,
    depth: 0.7,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Outer rectangle
      ctx.strokeRect(0, 0, w, h);

      // Freezer divider at ~30% from top
      const divY = h * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, divY);
      ctx.lineTo(w, divY);
      ctx.stroke();

      // Handle indicators on right side (small circles)
      const handleR = Math.min(w, h) * 0.025;

      // Freezer handle
      ctx.beginPath();
      ctx.arc(w * 0.88, divY * 0.5, handleR, 0, Math.PI * 2);
      ctx.stroke();

      // Fridge handle
      ctx.beginPath();
      ctx.arc(w * 0.88, divY + (h - divY) * 0.3, handleR, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // kitchen-sink  0.8 x 0.5 m
  // -----------------------------------------------------------------------
  {
    id: 'kitchen-sink',
    name: 'Kitchen Sink',
    nameEs: 'Fregadero',
    category: 'kitchen',
    width: 0.8,
    depth: 0.5,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Outer counter rectangle
      ctx.strokeRect(0, 0, w, h);

      // Inner basin (rounded rectangle)
      const padX = w * 0.1;
      const padTop = h * 0.22;
      const padBot = h * 0.1;
      const basinW = w - padX * 2;
      const basinH = h - padTop - padBot;
      const radius = Math.min(basinW, basinH) * 0.1;
      ctx.beginPath();
      ctx.roundRect(padX, padTop, basinW, basinH, radius);
      ctx.stroke();

      // Drain (small circle in basin center)
      const drainR = Math.min(w, h) * 0.03;
      ctx.beginPath();
      ctx.arc(w / 2, padTop + basinH * 0.55, drainR, 0, Math.PI * 2);
      ctx.stroke();

      // Faucet cross mark at top center
      const cx = w / 2;
      const cy = h * 0.1;
      const crossSize = Math.min(w, h) * 0.06;

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
  // counter  1.0 x 0.6 m
  // -----------------------------------------------------------------------
  {
    id: 'counter',
    name: 'Counter',
    nameEs: 'Encimera',
    category: 'kitchen',
    width: 1.0,
    depth: 0.6,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';

      // Main rectangle outline (thin line)
      ctx.lineWidth = 0.01;
      ctx.strokeRect(0, 0, w, h);

      // Thicker front edge (bottom edge)
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(w, h);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // dishwasher  0.6 x 0.6 m
  // -----------------------------------------------------------------------
  {
    id: 'dishwasher',
    name: 'Dishwasher',
    nameEs: 'Lavavajillas',
    category: 'kitchen',
    width: 0.6,
    depth: 0.6,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Outer rectangle
      ctx.strokeRect(0, 0, w, h);

      // Horizontal panel line at ~20% from top
      const lineY = h * 0.2;
      ctx.beginPath();
      ctx.moveTo(0, lineY);
      ctx.lineTo(w, lineY);
      ctx.stroke();

      // Small circle button above the line
      const btnR = Math.min(w, h) * 0.035;
      ctx.beginPath();
      ctx.arc(w / 2, lineY * 0.5, btnR, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // microwave  0.5 x 0.35 m
  // -----------------------------------------------------------------------
  {
    id: 'microwave',
    name: 'Microwave',
    nameEs: 'Microondas',
    category: 'kitchen',
    width: 0.5,
    depth: 0.35,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Outer body rectangle
      ctx.strokeRect(0, 0, w, h);

      // Inner window/door rectangle on left ~60%
      const pad = Math.min(w, h) * 0.1;
      const windowW = w * 0.6 - pad;
      ctx.strokeRect(pad, pad, windowW, h - pad * 2);

      // Dial circle on right side
      const dialR = Math.min(w, h) * 0.08;
      const rightZoneX = pad + windowW;
      const dialX = rightZoneX + (w - rightZoneX) / 2;
      ctx.beginPath();
      ctx.arc(dialX, h / 2, dialR, 0, Math.PI * 2);
      ctx.stroke();
    },
  },
];
