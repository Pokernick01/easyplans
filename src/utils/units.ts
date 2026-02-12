import type { ScaleRatio } from '../types/project.ts';

// ---------------------------------------------------------------------------
// Scale factors — how many real-world meters one paper-meter represents
// ---------------------------------------------------------------------------

export const SCALE_FACTORS: Record<ScaleRatio, number> = {
  '1:50': 50,
  '1:100': 100,
  '1:200': 200,
};

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

/**
 * Convert a real-world distance in meters to screen pixels.
 *
 * @param meters  - Distance in meters.
 * @param scale   - Drawing scale ratio (e.g. '1:100').
 * @param zoom    - Current viewport zoom level (1 = 100 %).
 * @returns Equivalent distance in screen pixels.
 *
 * The base DPI used for conversion is 96 px/inch (CSS reference pixel).
 * 1 m on paper = 1000 mm / scaleFactor  ->  that many mm on paper
 * mm on paper * (96 / 25.4) = pixels at zoom 1
 */
export function metersToPixels(
  meters: number,
  scale: ScaleRatio,
  zoom: number,
): number {
  const factor = SCALE_FACTORS[scale];
  const mmOnPaper = (meters * 1000) / factor;
  const pxPerMm = 96 / 25.4; // ~3.7795 px/mm
  return mmOnPaper * pxPerMm * zoom;
}

/**
 * Convert a screen-pixel distance back to real-world meters.
 *
 * @param pixels  - Distance in screen pixels.
 * @param scale   - Drawing scale ratio.
 * @param zoom    - Current viewport zoom level.
 * @returns Equivalent distance in meters.
 */
export function pixelsToMeters(
  pixels: number,
  scale: ScaleRatio,
  zoom: number,
): number {
  const factor = SCALE_FACTORS[scale];
  const pxPerMm = 96 / 25.4;
  const mmOnPaper = pixels / (pxPerMm * zoom);
  return (mmOnPaper * factor) / 1000;
}

/**
 * Format a length value for display.
 *
 * Lengths >= 1 m are shown as e.g. "3.50 m".
 * Lengths < 1 m are shown as e.g. "75 cm".
 *
 * @param meters - Length in meters.
 * @returns Human-readable string.
 */
export function formatLength(meters: number): string {
  if (meters >= 1) {
    return `${meters.toFixed(2)} m`;
  }
  return `${Math.round(meters * 100)} cm`;
}
