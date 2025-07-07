import React from 'react';
import Svg, { Path, Line } from 'react-native-svg';

export const TagIcon = ({ width = 24, height = 24, fill = 'none' }) => (
  <Svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    stroke={fill}
    fill={'none'}
    strokeWidth="1.5">
    <Path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <Line x1="7" y1="7" x2="7.01" y2="7" />
  </Svg>
);
