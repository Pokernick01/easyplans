import type { StampDefinition } from '@/types/library';

export const bathroomStamps: StampDefinition[] = [
  // -----------------------------------------------------------------------
  // toilet  0.4 x 0.65 m
  // -----------------------------------------------------------------------
  {
    id: 'toilet',
    name: 'Toilet',
    nameEs: 'Inodoro',
    category: 'bathroom',
    width: 0.4,
    depth: 0.65,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Wall-mount line at very top
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();

      // Tank rectangle outline at top ~30% of height
      const tankH = h * 0.28;
      const tankPad = w * 0.06;
      ctx.beginPath();
      ctx.rect(tankPad, 0, w - tankPad * 2, tankH);
      ctx.stroke();

      // Bowl: ellipse outline below the tank
      const bowlTop = tankH;
      const bowlH = h - tankH;
      const cx = w / 2;
      const cy = bowlTop + bowlH * 0.52;
      const rx = w / 2 - 0.01;
      const ry = bowlH * 0.48;

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner smaller ellipse for water line
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.05, rx * 0.58, ry * 0.52, 0, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // sink  0.5 x 0.4 m
  // -----------------------------------------------------------------------
  {
    id: 'sink',
    name: 'Sink',
    nameEs: 'Lavabo',
    category: 'bathroom',
    width: 0.5,
    depth: 0.4,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Wall-mount thick line at top
      ctx.save();
      ctx.lineWidth = 0.025;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w, 0);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Basin: rounded rectangle outline
      const basinPad = w * 0.06;
      const basinTop = 0.03;
      const basinW = w - basinPad * 2;
      const basinH = h - basinTop - basinPad;
      const r = Math.min(basinW, basinH) * 0.15;
      ctx.beginPath();
      ctx.roundRect(basinPad, basinTop, basinW, basinH, r);
      ctx.stroke();

      // Drain: small circle at center of basin
      const drainR = 0.015;
      ctx.beginPath();
      ctx.arc(w / 2, basinTop + basinH * 0.55, drainR, 0, Math.PI * 2);
      ctx.stroke();

      // Faucet: small cross mark at top center
      const fCx = w / 2;
      const fCy = basinTop + 0.03;
      const fSize = 0.018;
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
  // bathtub  1.7 x 0.75 m
  // -----------------------------------------------------------------------
  {
    id: 'bathtub',
    name: 'Bathtub',
    nameEs: 'Banera',
    category: 'bathroom',
    width: 1.7,
    depth: 0.75,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';

      // Outer thick outline (double-line effect: thick outer)
      const outerR = Math.min(w, h) * 0.12;
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, outerR);
      ctx.stroke();

      // Inner thin outline offset inward
      const inset = 0.05;
      const innerR = outerR * 0.6;
      ctx.lineWidth = 0.01;
      ctx.beginPath();
      ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, innerR);
      ctx.stroke();

      // Drain circle at the right end
      const drainR = 0.025;
      const drainX = w - inset - drainR * 2.5;
      const drainY = h / 2;
      ctx.beginPath();
      ctx.arc(drainX, drainY, drainR, 0, Math.PI * 2);
      ctx.stroke();

      // Faucet indicators at left end: two small cross marks
      const fX = inset + 0.06;
      const fSize = 0.02;

      // Hot tap
      const fY1 = h / 2 - 0.06;
      ctx.beginPath();
      ctx.moveTo(fX - fSize, fY1);
      ctx.lineTo(fX + fSize, fY1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fX, fY1 - fSize);
      ctx.lineTo(fX, fY1 + fSize);
      ctx.stroke();

      // Cold tap
      const fY2 = h / 2 + 0.06;
      ctx.beginPath();
      ctx.moveTo(fX - fSize, fY2);
      ctx.lineTo(fX + fSize, fY2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fX, fY2 - fSize);
      ctx.lineTo(fX, fY2 + fSize);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // shower  0.9 x 0.9 m
  // -----------------------------------------------------------------------
  {
    id: 'shower',
    name: 'Shower',
    nameEs: 'Ducha',
    category: 'bathroom',
    width: 0.9,
    depth: 0.9,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Square tray outline
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.stroke();

      // Drain circle at center
      const drainR = 0.025;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, drainR, 0, Math.PI * 2);
      ctx.stroke();

      // Glass door: solid line from top-left corner along top edge
      ctx.lineWidth = 0.015;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.75, 0);
      ctx.stroke();

      // Glass door: solid line from top-left corner along left edge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, h * 0.75);
      ctx.stroke();

      // Swing arc: dashed quarter-circle from door endpoint
      ctx.lineWidth = 0.01;
      ctx.setLineDash([0.03, 0.03]);
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.75, 0, Math.PI / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Shower head: small circle at top-left area
      const shR = 0.03;
      ctx.beginPath();
      ctx.arc(w * 0.2, h * 0.2, shR, 0, Math.PI * 2);
      ctx.stroke();
    },
  },

  // -----------------------------------------------------------------------
  // bidet  0.4 x 0.55 m
  // -----------------------------------------------------------------------
  {
    id: 'bidet',
    name: 'Bidet',
    nameEs: 'Bide',
    category: 'bathroom',
    width: 0.4,
    depth: 0.55,
    thumbnailColor: '#e0e0e0',
    draw(ctx, w, h) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.01;

      // Outer oval outline
      const cx = w / 2;
      const cy = h / 2;
      const rx = w / 2 - 0.01;
      const ry = h / 2 - 0.01;

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner smaller oval
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.08, rx * 0.55, ry * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Faucet: cross mark at top
      const fCx = cx;
      const fCy = cy - ry * 0.55;
      const fSize = 0.018;
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
];
