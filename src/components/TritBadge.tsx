/**
 * Trit visual badge component
 * @license Apache-2.0
 */

import React from 'react';
import { TritValue, DisplayMode } from '../types/ternary';
import { TRIT_INFO } from '../lib/taiXuanData';

interface TritBadgeProps {
  val: TritValue;
  mode?: DisplayMode;
  size?: 'sm' | 'md' | 'lg';
  showSymbol?: boolean;
  className?: string;
}

export const TritBadge: React.FC<TritBadgeProps> = ({
  val,
  mode = 'taixuan',
  size = 'md',
  showSymbol = true,
  className = '',
}) => {
  const info = TRIT_INFO[val];

  let displayLabel = info.name;
  if (mode === 'balanced') {
    displayLabel = info.balancedVal === 1 ? '+1' : info.balancedVal === -1 ? '-1' : '0';
  } else if (mode === 'standard') {
    displayLabel = val.toString();
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3.5 py-1.5 gap-2 font-semibold',
  }[size];

  const strokeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md font-mono-code border transition-colors ${info.bgLight} ${info.bgDark} ${info.borderLight} ${info.borderDark} ${sizeClasses} ${className}`}
      title={`${info.name} (三值: ${val}, 平衡值: ${info.balancedVal}) - ${info.desc}`}
    >
      {showSymbol && (
        <span className={`font-serif-tc select-none ${strokeClasses}`} aria-hidden="true">
          {info.symbol}
        </span>
      )}
      <span className="font-medium whitespace-nowrap">{displayLabel}</span>
    </span>
  );
};
