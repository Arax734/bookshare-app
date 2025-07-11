import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface CalendarIconProps {
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string; // Add fill prop
}

export const CalendarIcon: React.FC<CalendarIconProps> = ({
  width = 24,
  height = 24,
  stroke,
  fill,
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke={stroke || 'currentColor'}
        fill={fill || 'none'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
