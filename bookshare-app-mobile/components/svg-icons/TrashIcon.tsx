import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TrashIconProps {
  width?: number;
  height?: number;
  stroke?: string;
}

export const TrashIcon = ({ width = 24, height = 24, stroke = '#DC2626' }: TrashIconProps) => {
  return (
    <Svg width={width} height={height} fill="none" viewBox="0 0 24 24" stroke={stroke}>
      <Path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </Svg>
  );
};
