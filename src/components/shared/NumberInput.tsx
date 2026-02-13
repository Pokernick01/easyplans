import { useCallback, useState, useEffect } from 'react';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function NumberInput({
  label,
  value,
  onChange,
  unit = 'm',
  min,
  max,
  step = 0.01,
  disabled = false,
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    setLocalValue(value.toString());
  }, [value]);

  const commit = useCallback(() => {
    let num = parseFloat(localValue);
    if (isNaN(num)) {
      setLocalValue(value.toString());
      return;
    }
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    setLocalValue(num.toString());
    if (num !== value) {
      onChange(num);
    }
  }, [localValue, value, min, max, onChange]);

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
          min={min}
          max={max}
          step={step}
          className="ep-input w-[4.5rem] px-2 py-1 text-xs text-right rounded"
        />
        {unit && (
          <span className="text-xs shrink-0" style={{ color: '#6b6560' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
