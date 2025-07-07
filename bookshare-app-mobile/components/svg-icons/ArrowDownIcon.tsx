import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface ArrowDownIconProps {
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
}

export const ArrowDownIcon = ({
  width = 24,
  height = 24,
  fill = 'none',
  stroke = 'currentColor',
}: ArrowDownIconProps) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill={fill}>
      <Path
        d="m98 190.06 139.78 163.12a24 24 0 0 0 36.44 0L414 190.06c13.34-15.57 2.28-39.62-18.22-39.62h-279.6c-20.5 0-31.56 24.05-18.18 39.62z"
        opacity="1"
        data-original="#000000"
        stroke={stroke}
      />
    </Svg>
  );
};
