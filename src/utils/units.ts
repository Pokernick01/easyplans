import type { ScaleRatio } from '../types/project.ts';

// ---------------------------------------------------------------------------
// Display units
// ---------------------------------------------------------------------------

/** All supported display units. Internal storage is always meters. */
export type DisplayUnit = 'mm' | 'cm' | 'm' | 'ft' | 'in' | 'ft-in';

/** Conversion factors from meters to each display unit. */
const TO_UNIT: Record<DisplayUnit, number> = {
  mm: 1000,
  cm: 100,
  m: 1,
  ft: 3.28084,
  in: 39.3701,
  'ft-in': 3.28084, // handled specially in formatting
};

/** Conversion factors from each display unit to meters. */
const FROM_UNIT: Record<DisplayUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  ft: 0.3048,
  in: 0.0254,
  'ft-in': 0.3048, // handled specially
};

/** Short labels for each unit. */
export const UNIT_LABELS: Record<DisplayUnit, string> = {
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  ft: 'ft',
  in: 'in',
  'ft-in': 'ft-in',
};

/** Human-readable names for the unit dropdown. */
export const UNIT_NAMES: Record<DisplayUnit, { en: string; es: string }> = {
  mm: { en: 'Millimeters (mm)', es: 'Milimetros (mm)' },
  cm: { en: 'Centimeters (cm)', es: 'Centimetros (cm)' },
  m: { en: 'Meters (m)', es: 'Metros (m)' },
  ft: { en: 'Feet (ft)', es: 'Pies (ft)' },
  in: { en: 'Inches (in)', es: 'Pulgadas (in)' },
  'ft-in': { en: 'Feet & Inches', es: 'Pies y Pulgadas' },
};

/** All display units for iteration. */
export const DISPLAY_UNITS: DisplayUnit[] = ['mm', 'cm', 'm', 'ft', 'in', 'ft-in'];

/**
 * Convert meters to a display unit value.
 */
export function metersToUnit(meters: number, unit: DisplayUnit): number {
  return meters * TO_UNIT[unit];
}

/**
 * Convert a display unit value back to meters.
 */
export function unitToMeters(value: number, unit: DisplayUnit): number {
  return value * FROM_UNIT[unit];
}

/**
 * Get the appropriate number of decimal places for a unit.
 */
export function unitDecimals(unit: DisplayUnit): number {
  switch (unit) {
    case 'mm': return 0;
    case 'cm': return 1;
    case 'm': return 3;
    case 'ft': return 2;
    case 'in': return 1;
    case 'ft-in': return 0;
  }
}

/**
 * Get a reasonable step value for a NumberInput in the given unit.
 */
export function unitStep(unit: DisplayUnit): number {
  switch (unit) {
    case 'mm': return 1;
    case 'cm': return 0.5;
    case 'm': return 0.01;
    case 'ft': return 0.05;
    case 'in': return 0.5;
    case 'ft-in': return 0.1;
  }
}

/**
 * Format a length (in meters) for display in the given unit.
 * Returns a string like "150 mm", "15.0 cm", "1.500 m", "4.92 ft", etc.
 */
export function formatInUnit(meters: number, unit: DisplayUnit): string {
  if (unit === 'ft-in') {
    const totalInches = meters * 39.3701;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches - feet * 12;
    return `${feet}' ${inches.toFixed(1)}"`;
  }
  const val = metersToUnit(meters, unit);
  const dec = unitDecimals(unit);
  return `${val.toFixed(dec)} ${UNIT_LABELS[unit]}`;
}

/**
 * Format an area (in m^2) for display in the given unit.
 * Returns something like "15000.0 cm^2", "2.500 m^2", "26.91 ft^2", etc.
 */
export function formatAreaInUnit(areaM2: number, unit: DisplayUnit): string {
  if (unit === 'ft-in' || unit === 'ft') {
    const areaFt2 = areaM2 * 10.7639;
    return `${areaFt2.toFixed(2)} ft\u00B2`;
  }
  if (unit === 'in') {
    const areaIn2 = areaM2 * 1550.0031;
    return `${areaIn2.toFixed(1)} in\u00B2`;
  }
  // Metric: use m^2 always (standard in architecture)
  return `${areaM2.toFixed(2)} m\u00B2`;
}

// ---------------------------------------------------------------------------
// Scale factors — how many real-world meters one paper-meter represents
// ---------------------------------------------------------------------------

export const SCALE_FACTORS: Record<ScaleRatio, number> = {
  '1:50': 50,
  '1:100': 100,
  '1:200': 200,
};

// ---------------------------------------------------------------------------
// Conversion helpers (scale / pixel related)
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
 * Format a length value for display (legacy — uses project display unit).
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
