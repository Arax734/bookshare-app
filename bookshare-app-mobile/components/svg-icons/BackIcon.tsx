import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface BackIconProps {
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
}

export const BackIcon = ({
  width = 24,
  height = 24,
  fill = 'none',
  stroke = 'currentColor',
}: BackIconProps) => {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path d="M19 12H5" />
      <Path d="M12 19l-7-7 7-7" />
    </Svg>
  );
};
