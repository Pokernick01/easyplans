import { useCallback, useState, useEffect } from 'react';
import { useProjectStore } from '@/store/project-store.ts';
import {
  metersToUnit,
  unitToMeters,
  unitDecimals,
  unitStep,
  UNIT_LABELS,
  type DisplayUnit,
} from '@/utils/units.ts';

// ---------------------------------------------------------------------------
// UnitNumberInput — a NumberInput that auto-converts between meters and
// the project's display unit
// ---------------------------------------------------------------------------

interface UnitNumberInputProps {
  label: string;
  /** Value in METERS (internal). */
  value: number;
  /** Called with the new value in METERS. */
  onChange: (meters: number) => void;
  /** Min/max in METERS. Converted to display unit for the input. */
  min?: number;
  max?: number;
  /** Override step (in display units). If not set, uses a sensible default. */
  step?: number;
  disabled?: boolean;
}

export function UnitNumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step: stepOverride,
  disabled = false,
}: UnitNumberInputProps) {
  const displayUnit: DisplayUnit = useProjectStore((s) => s.project.displayUnit) || 'm';

  const dec = unitDecimals(displayUnit);
  const uLabel = UNIT_LABELS[displayUnit];
  const stpVal = stepOverride ?? unitStep(displayUnit);

  // Convert meters -> display unit
  const displayValue = metersToUnit(value, displayUnit);
  const displayMin = min !== undefined ? metersToUnit(min, displayUnit) : undefined;
  const displayMax = max !== undefined ? metersToUnit(max, displayUnit) : undefined;

  const [localValue, setLocalValue] = useState(
    Number(displayValue.toFixed(dec)).toString(),
  );

  useEffect(() => {
    setLocalValue(Number(displayValue.toFixed(dec)).toString());
  }, [displayValue, dec]);

  const commit = useCallback(() => {
    let num = parseFloat(localValue);
    if (isNaN(num)) {
      setLocalValue(Number(displayValue.toFixed(dec)).toString());
      return;
    }
    if (displayMin !== undefined) num = Math.max(displayMin, num);
    if (displayMax !== undefined) num = Math.min(displayMax, num);
    setLocalValue(num.toString());
    // Convert back to meters
    const meters = unitToMeters(num, displayUnit);
    if (Math.abs(meters - value) > 1e-9) {
      onChange(meters);
    }
  }, [localValue, displayValue, dec, displayMin, displayMax, displayUnit, value, onChange]);

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <label
        className="text-xs shrink-0"
        style={{ color: '#6b6560' }}
      >
        {label}
      </label>
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
          }}
          disabled={disabled}
          min={displayMin}
          max={displayMax}
          step={stpVal}
          className="ep-input w-[4.5rem] px-2 py-1 text-xs text-right rounded"
        />
        <span className="text-xs shrink-0" style={{ color: '#6b6560', minWidth: '1rem' }}>
          {uLabel}
        </span>
      </div>
    </div>
  );
}
