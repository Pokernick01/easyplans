/** A 2D point in meters. */
export interface Point {
  x: number; // meters
  y: number; // meters
}

/** A line segment defined by two endpoints. */
export interface Line {
  start: Point;
  end: Point;
}

/** An axis-aligned rectangle. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A closed polygon defined by an ordered list of vertices. */
export interface Polygon {
  points: Point[];
}
