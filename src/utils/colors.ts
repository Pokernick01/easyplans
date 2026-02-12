// ---------------------------------------------------------------------------
// Wall color palette
// ---------------------------------------------------------------------------

export const WALL_COLORS: readonly string[] = [
  '#808080', // Gray (default)
  '#a0a0a0', // Light gray
  '#606060', // Dark gray
  '#8B4513', // Saddle brown
  '#CD853F', // Peru
  '#D2691E', // Chocolate
  '#BC8F8F', // Rosy brown
  '#F5DEB3', // Wheat
] as const;

// ---------------------------------------------------------------------------
// Room color palette (semi-transparent fills with display names)
// ---------------------------------------------------------------------------

export interface RoomColor {
  name: string;
  color: string;
}

export const ROOM_COLORS: readonly RoomColor[] = [
  { name: 'Living Room', color: 'rgba(135,206,235,0.3)' },
  { name: 'Bedroom', color: 'rgba(255,182,193,0.3)' },
  { name: 'Kitchen', color: 'rgba(255,228,181,0.3)' },
  { name: 'Bathroom', color: 'rgba(173,216,230,0.3)' },
  { name: 'Office', color: 'rgba(144,238,144,0.3)' },
  { name: 'Dining', color: 'rgba(255,218,185,0.3)' },
  { name: 'Hallway', color: 'rgba(220,220,220,0.3)' },
  { name: 'Garage', color: 'rgba(169,169,169,0.3)' },
  { name: 'Custom', color: 'rgba(200,200,200,0.3)' },
] as const;

// ---------------------------------------------------------------------------
// Floor pattern / texture names
// ---------------------------------------------------------------------------

export const FLOOR_PATTERNS: readonly string[] = [
  'tile',
  'wood',
  'stone',
  'concrete',
  'carpet',
] as const;

// ---------------------------------------------------------------------------
// UI color tokens
// ---------------------------------------------------------------------------

export interface UiColors {
  background: string;
  sidebar: string;
  panel: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  hover: string;
  active: string;
  selection: string;
}

export const UI_COLORS: UiColors = {
  background: '#1e1e2e',
  sidebar: '#252536',
  panel: '#2a2a3c',
  accent: '#6c63ff',
  text: '#e0e0e0',
  textMuted: '#888899',
  border: '#3a3a4c',
  hover: '#33334a',
  active: '#3d3d5c',
  selection: 'rgba(108,99,255,0.25)',
};
