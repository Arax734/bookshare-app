import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface FireIconProps {
  width?: number;
  height?: number;
  filled?: boolean;
  stroke?: string;
  fill?: string;
}

export function FireIcon({
  width = 24,
  height = 24,
  filled = true,
  stroke = 'currentColor',
  fill = 'currentColor',
}: FireIconProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      stroke={stroke}
      strokeWidth={filled ? '0' : '1.5'}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path
        fillRule="evenodd"
        fill={filled ? fill : 'none'}
        d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
        clipRule="evenodd"
      />
    </Svg>
  );
}
