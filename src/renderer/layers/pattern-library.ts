import type { FillPattern, WallFillPattern } from '@/types/elements';

// ---------------------------------------------------------------------------
// Pattern Library — reusable Canvas 2D pattern drawing functions
//
// All pattern functions draw into a pre-transformed canvas context where
// 1 unit = 1 meter.  `px` = 1 screen pixel in world coordinates.
//
// They draw semi-transparent overlays on top of the base fill color,
// so the pattern tints whatever color is already underneath.
// ---------------------------------------------------------------------------

// Line color constants (subtle overlays)
const LINE_W  = 'rgba(255,255,255,0.08)';
const LINE_W2 = 'rgba(255,255,255,0.06)';
const LINE_W3 = 'rgba(255,255,255,0.05)';
const LINE_D3 = 'rgba(0,0,0,0.04)';

// Safety limit for iteration counts to prevent DoS from huge rooms/walls
const MAX_ITERATIONS = 50000;

// ---------------------------------------------------------------------------
// Deterministic pseudo-random (for consistent pattern rendering)
// ---------------------------------------------------------------------------

function createRng(minX: number, minY: number): () => number {
  let seed = Math.round((minX + minY) * 1000) & 0xffff;
  return () => {
    seed = (seed * 16807 + 7) & 0x7fffffff;
    return (seed & 0xffff) / 0xffff;
  };
}

// ---------------------------------------------------------------------------
// Room / Floor Patterns
// ---------------------------------------------------------------------------

/** Diagonal hatch lines at 45 degrees. */
export function drawHatch(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const spacing = 0.15;
  ctx.strokeStyle = LINE_W;
  ctx.lineWidth = px;
  ctx.beginPath();
  const diag = (maxX - minX) + (maxY - minY);
  const startVal = minX + minY - spacing;
  for (let d = startVal; d <= minX + minY + diag + spacing; d += spacing) {
    ctx.moveTo(d - minY, minY);
    ctx.lineTo(d - maxY, maxY);
  }
  ctx.stroke();
}

/** Grid of squares representing tiles. */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const tileSize = 0.3;
  ctx.strokeStyle = LINE_W2;
  ctx.lineWidth = px;
  ctx.beginPath();
  const sX = Math.floor(minX / tileSize) * tileSize;
  const sY = Math.floor(minY / tileSize) * tileSize;
  for (let x = sX; x <= maxX; x += tileSize) {
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
  }
  for (let y = sY; y <= maxY; y += tileSize) {
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
  }
  ctx.stroke();
}

/** Parallel wavy lines representing wood grain. */
export function drawWood(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const spacing = 0.08;
  const waveAmp = 0.01;
  const waveFreq = 8;
  ctx.strokeStyle = LINE_W2;
  ctx.lineWidth = px;
  const sY = Math.floor(minY / spacing) * spacing;
  for (let y = sY; y <= maxY; y += spacing) {
    ctx.beginPath();
    const steps = Math.ceil((maxX - minX) / 0.02);
    const step = (maxX - minX) / steps;
    for (let i = 0; i <= steps; i++) {
      const x = minX + i * step;
      const yOff = Math.sin(x * waveFreq * Math.PI * 2) * waveAmp;
      if (i === 0) ctx.moveTo(x, y + yOff);
      else ctx.lineTo(x, y + yOff);
    }
    ctx.stroke();
  }
}

/** Random irregular rectangles representing stone pavers. */
export function drawStone(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const baseSize = 0.25;
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = px;
  const rand = createRng(minX, minY);
  const sX = Math.floor(minX / baseSize) * baseSize;
  const sY = Math.floor(minY / baseSize) * baseSize;
  ctx.beginPath();
  for (let y = sY; y < maxY; y += baseSize) {
    for (let x = sX; x < maxX; x += baseSize) {
      const jx = rand() * 0.05;
      const jy = rand() * 0.05;
      const w = baseSize * (0.7 + rand() * 0.25);
      const h = baseSize * (0.7 + rand() * 0.25);
      ctx.rect(x + jx, y + jy, w, h);
    }
  }
  ctx.stroke();
}

/** Running-bond brick pattern. */
export function drawBrick(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const brickW = 0.25;
  const brickH = 0.065;
  const mortarW = 0.01;
  ctx.strokeStyle = LINE_W;
  ctx.lineWidth = px;
  const sX = Math.floor(minX / brickW) * brickW;
  const sY = Math.floor(minY / (brickH + mortarW)) * (brickH + mortarW);
  let row = 0;
  ctx.beginPath();
  for (let y = sY; y <= maxY; y += brickH + mortarW) {
    // Horizontal mortar line
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    // Vertical mortar joints (staggered)
    const offset = (row % 2 === 0) ? 0 : brickW / 2;
    for (let x = sX + offset; x <= maxX; x += brickW) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + brickH);
    }
    row++;
  }
  ctx.stroke();
}

/** Marble: subtle diagonal veins with random variation. */
export function drawMarble(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const rand = createRng(minX, minY);
  ctx.strokeStyle = LINE_W3;
  ctx.lineWidth = px * 1.5;
  const veinCount = Math.min(MAX_ITERATIONS, Math.ceil(((maxX - minX) + (maxY - minY)) / 0.4));
  for (let i = 0; i < veinCount; i++) {
    const sx = minX + rand() * (maxX - minX);
    const sy = minY + rand() * (maxY - minY);
    const angle = (Math.PI / 4) + (rand() - 0.5) * 0.6;
    const veinLen = 0.3 + rand() * 0.8;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    let cx = sx, cy = sy;
    const segs = 5 + Math.floor(rand() * 5);
    for (let s = 0; s < segs; s++) {
      const dx = Math.cos(angle + (rand() - 0.5) * 0.3) * (veinLen / segs);
      const dy = Math.sin(angle + (rand() - 0.5) * 0.3) * (veinLen / segs);
      cx += dx;
      cy += dy;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
}

/** Concrete: fine stipple dots. */
export function drawConcrete(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const rand = createRng(minX, minY);
  ctx.fillStyle = LINE_D3;
  const spacing = 0.04;
  const sX = Math.floor(minX / spacing) * spacing;
  const sY = Math.floor(minY / spacing) * spacing;
  const dotR = px * 0.8;
  let count = 0;
  for (let y = sY; y <= maxY && count < MAX_ITERATIONS; y += spacing) {
    for (let x = sX; x <= maxX && count < MAX_ITERATIONS; x += spacing) {
      count++;
      if (rand() > 0.5) {
        const jx = (rand() - 0.5) * spacing * 0.6;
        const jy = (rand() - 0.5) * spacing * 0.6;
        ctx.beginPath();
        ctx.arc(x + jx, y + jy, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** Ceramic tiles with beveled edges. */
export function drawCeramic(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const tileSize = 0.25;
  const gap = 0.008;
  const sX = Math.floor(minX / tileSize) * tileSize;
  const sY = Math.floor(minY / tileSize) * tileSize;
  // Grout lines
  ctx.strokeStyle = LINE_W;
  ctx.lineWidth = px;
  ctx.beginPath();
  for (let x = sX; x <= maxX; x += tileSize) {
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
  }
  for (let y = sY; y <= maxY; y += tileSize) {
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
  }
  ctx.stroke();
  // Inner bevel highlight
  ctx.strokeStyle = LINE_W3;
  ctx.lineWidth = px * 0.5;
  ctx.beginPath();
  for (let y = sY; y < maxY; y += tileSize) {
    for (let x = sX; x < maxX; x += tileSize) {
      const inset = gap + px * 0.5;
      ctx.moveTo(x + inset, y + inset);
      ctx.lineTo(x + tileSize - inset, y + inset);
      ctx.moveTo(x + inset, y + inset);
      ctx.lineTo(x + inset, y + tileSize - inset);
    }
  }
  ctx.stroke();
}

/** Parquet (herringbone-like interlocking wood planks). */
export function drawParquet(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const plankW = 0.06;
  const plankL = 0.24;
  ctx.strokeStyle = LINE_W2;
  ctx.lineWidth = px;
  const sX = Math.floor(minX / plankL) * plankL;
  const sY = Math.floor(minY / plankL) * plankL;
  ctx.beginPath();
  let blockRow = 0;
  for (let by = sY; by <= maxY; by += plankL) {
    let blockCol = 0;
    for (let bx = sX; bx <= maxX; bx += plankL) {
      // Alternate vertical/horizontal planks in checkerboard
      const horiz = (blockRow + blockCol) % 2 === 0;
      if (horiz) {
        for (let p = 0; p <= plankL; p += plankW) {
          ctx.moveTo(bx, by + p);
          ctx.lineTo(bx + plankL, by + p);
        }
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by + plankL);
        ctx.moveTo(bx + plankL, by);
        ctx.lineTo(bx + plankL, by + plankL);
      } else {
        for (let p = 0; p <= plankL; p += plankW) {
          ctx.moveTo(bx + p, by);
          ctx.lineTo(bx + p, by + plankL);
        }
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + plankL, by);
        ctx.moveTo(bx, by + plankL);
        ctx.lineTo(bx + plankL, by + plankL);
      }
      blockCol++;
    }
    blockRow++;
  }
  ctx.stroke();
}

/** Classic herringbone pattern. */
export function drawHerringbone(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const plankW = 0.05;
  const plankL = 0.2;
  ctx.strokeStyle = LINE_W2;
  ctx.lineWidth = px;
  ctx.beginPath();
  const stepX = plankL;
  const stepY = plankW * 2;
  const sX = Math.floor(minX / stepX) * stepX - stepX;
  const sY = Math.floor(minY / stepY) * stepY - stepY;
  let row = 0;
  for (let y = sY; y <= maxY + plankL; y += stepY) {
    const offsetX = (row % 2) * (plankL / 2);
    for (let x = sX + offsetX; x <= maxX + plankL; x += stepX) {
      // Plank going right-down
      ctx.moveTo(x, y);
      ctx.lineTo(x + plankL / 2, y + plankW);
      ctx.lineTo(x + plankL, y);
      // Plank going right-up
      ctx.moveTo(x, y + plankW);
      ctx.lineTo(x + plankL / 2, y + plankW * 2);
      ctx.lineTo(x + plankL, y + plankW);
    }
    row++;
  }
  ctx.stroke();
}

/** Hexagonal tiles. */
export function drawHexagonal(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const size = 0.12; // hex "radius"
  const w = size * 2;
  const h = size * Math.sqrt(3);
  ctx.strokeStyle = LINE_W2;
  ctx.lineWidth = px;
  ctx.beginPath();
  const sX = Math.floor(minX / (w * 0.75)) * (w * 0.75) - w;
  const sY = Math.floor(minY / h) * h - h;
  let col = 0;
  for (let x = sX; x <= maxX + w; x += w * 0.75) {
    const yOff = (col % 2 === 0) ? 0 : h / 2;
    for (let y = sY + yOff; y <= maxY + h; y += h) {
      drawHex(ctx, x, y, size);
    }
    col++;
  }
  ctx.stroke();
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const nx = cx + r * Math.cos(angle);
    const ny = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(nx, ny);
    else ctx.lineTo(nx, ny);
  }
  ctx.closePath();
}

/** Carpet: dense cross-hatch at fine scale. */
export function drawCarpet(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const spacing = 0.03;
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = px * 0.7;
  ctx.beginPath();
  const sX = Math.floor(minX / spacing) * spacing;
  const sY = Math.floor(minY / spacing) * spacing;
  // Dense grid
  for (let x = sX; x <= maxX; x += spacing) {
    ctx.moveTo(x, minY);
    ctx.lineTo(x, maxY);
  }
  for (let y = sY; y <= maxY; y += spacing) {
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
  }
  ctx.stroke();
}

/** Grass: short random strokes. */
export function drawGrass(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const rand = createRng(minX, minY);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = px;
  const spacing = 0.06;
  const sX = Math.floor(minX / spacing) * spacing;
  const sY = Math.floor(minY / spacing) * spacing;
  ctx.beginPath();
  let grassCount = 0;
  for (let y = sY; y <= maxY && grassCount < MAX_ITERATIONS; y += spacing) {
    for (let x = sX; x <= maxX && grassCount < MAX_ITERATIONS; x += spacing) {
      grassCount++;
      if (rand() > 0.3) {
        const bx = x + (rand() - 0.5) * spacing * 0.8;
        const by = y + (rand() - 0.5) * spacing * 0.8;
        const bladeLen = 0.02 + rand() * 0.03;
        const angle = -Math.PI / 2 + (rand() - 0.5) * 0.8;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(angle) * bladeLen, by + Math.sin(angle) * bladeLen);
      }
    }
  }
  ctx.stroke();
}

/** Granite: small irregular dots and veins. */
export function drawGranite(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const rand = createRng(minX, minY);
  // Fine dots
  ctx.fillStyle = LINE_D3;
  const spacing = 0.025;
  const sX = Math.floor(minX / spacing) * spacing;
  const sY = Math.floor(minY / spacing) * spacing;
  let gCount = 0;
  for (let y = sY; y <= maxY && gCount < MAX_ITERATIONS; y += spacing) {
    for (let x = sX; x <= maxX && gCount < MAX_ITERATIONS; x += spacing) {
      gCount++;
      if (rand() > 0.4) {
        const jx = (rand() - 0.5) * spacing * 0.7;
        const jy = (rand() - 0.5) * spacing * 0.7;
        const r = px * (0.5 + rand() * 1.0);
        ctx.beginPath();
        ctx.arc(x + jx, y + jy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Subtle veins
  ctx.strokeStyle = LINE_W3;
  ctx.lineWidth = px * 0.8;
  const veinCount = Math.min(MAX_ITERATIONS, Math.ceil(((maxX - minX) * (maxY - minY)) / 0.5));
  for (let i = 0; i < veinCount; i++) {
    const sx = minX + rand() * (maxX - minX);
    const sy = minY + rand() * (maxY - minY);
    const angle = rand() * Math.PI * 2;
    const len = 0.05 + rand() * 0.15;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Wall-specific Patterns
// ---------------------------------------------------------------------------

/** Crosshatch (X pattern) for walls. */
export function drawCrosshatch(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const spacing = 0.08;
  ctx.strokeStyle = LINE_W;
  ctx.lineWidth = px;
  ctx.beginPath();
  // Forward diag
  const diag = (maxX - minX) + (maxY - minY);
  for (let d = minX + minY - spacing; d <= minX + minY + diag + spacing; d += spacing) {
    ctx.moveTo(d - minY, minY);
    ctx.lineTo(d - maxY, maxY);
  }
  // Backward diag
  for (let d = minX - maxY - spacing; d <= maxX - minY + spacing; d += spacing) {
    ctx.moveTo(d + minY, minY);
    ctx.lineTo(d + maxY, maxY);
  }
  ctx.stroke();
}

/** Drywall: very subtle horizontal lines. */
export function drawDrywall(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const spacing = 0.04;
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = px * 0.5;
  ctx.beginPath();
  const sY = Math.floor(minY / spacing) * spacing;
  for (let y = sY; y <= maxY; y += spacing) {
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
  }
  ctx.stroke();
}

/** CMU / concrete block pattern. */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const blockW = 0.4;
  const blockH = 0.2;
  ctx.strokeStyle = LINE_W;
  ctx.lineWidth = px;
  const sX = Math.floor(minX / blockW) * blockW;
  const sY = Math.floor(minY / blockH) * blockH;
  let row = 0;
  ctx.beginPath();
  for (let y = sY; y <= maxY; y += blockH) {
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    const offset = (row % 2 === 0) ? 0 : blockW / 2;
    for (let x = sX + offset; x <= maxX; x += blockW) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + blockH);
    }
    row++;
  }
  ctx.stroke();
}

/** Stucco: fine random bumps. */
export function drawStucco(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const rand = createRng(minX * 1.7, minY * 2.3);
  const spacing = 0.02;
  const sX = Math.floor(minX / spacing) * spacing;
  const sY = Math.floor(minY / spacing) * spacing;
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = px * 0.6;
  let stuccoCount = 0;
  for (let y = sY; y <= maxY && stuccoCount < MAX_ITERATIONS; y += spacing) {
    for (let x = sX; x <= maxX && stuccoCount < MAX_ITERATIONS; x += spacing) {
      stuccoCount++;
      if (rand() > 0.6) {
        const jx = (rand() - 0.5) * spacing;
        const jy = (rand() - 0.5) * spacing;
        const r = 0.003 + rand() * 0.005;
        ctx.moveTo(x + jx + r, y + jy);
        ctx.arc(x + jx, y + jy, r, 0, Math.PI * 2);
      }
    }
  }
  ctx.stroke();
}

/** Plaster: smooth subtle sweeping arcs. */
export function drawPlaster(
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
): void {
  const rand = createRng(minX * 0.7, minY * 1.3);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = px;
  const arcCount = Math.min(MAX_ITERATIONS, Math.ceil(((maxX - minX) * (maxY - minY)) / 0.15));
  for (let i = 0; i < arcCount; i++) {
    const sx = minX + rand() * (maxX - minX);
    const sy = minY + rand() * (maxY - minY);
    const radius = 0.02 + rand() * 0.06;
    const startAngle = rand() * Math.PI * 2;
    const sweep = 0.5 + rand() * 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, startAngle, startAngle + sweep);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Dispatch maps
// ---------------------------------------------------------------------------

type PatternFn = (
  ctx: CanvasRenderingContext2D,
  minX: number, minY: number, maxX: number, maxY: number, px: number,
) => void;

export const roomPatternFns: Record<FillPattern, PatternFn | null> = {
  solid: null,
  hatch: drawHatch,
  tile: drawTile,
  wood: drawWood,
  stone: drawStone,
  brick: drawBrick,
  marble: drawMarble,
  concrete: drawConcrete,
  ceramic: drawCeramic,
  parquet: drawParquet,
  herringbone: drawHerringbone,
  hexagonal: drawHexagonal,
  carpet: drawCarpet,
  grass: drawGrass,
  granite: drawGranite,
};

export const wallPatternFns: Record<WallFillPattern, PatternFn | null> = {
  solid: null,
  brick: drawBrick,
  concrete: drawConcrete,
  stone: drawStone,
  hatch: drawHatch,
  crosshatch: drawCrosshatch,
  drywall: drawDrywall,
  block: drawBlock,
  stucco: drawStucco,
  plaster: drawPlaster,
};
