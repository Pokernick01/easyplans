import { useState } from 'react';

interface IconButtonProps {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  size?: 'sm' | 'md';
  tooltip?: string;
  disabled?: boolean;
}

export function IconButton({
  icon,
  label,
  active = false,
  onClick,
  size = 'md',
  tooltip,
  disabled = false,
}: IconButtonProps) {
  const [hovered, setHovered] = useState(false);

  const sizeClasses = size === 'sm'
    ? 'w-7 h-7 text-sm'
    : 'w-9 h-9 text-base';

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`
          ep-tool-btn ${active ? 'active' : ''}
          ${sizeClasses}
          flex items-center justify-center rounded-md
          select-none
          ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label={label}
        title={tooltip ?? label}
      >
        <span className="leading-none">{icon}</span>
      </button>
      {hovered && tooltip && (
        <div
          className="ep-tooltip absolute z-50"
          style={{
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(4px)',
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
