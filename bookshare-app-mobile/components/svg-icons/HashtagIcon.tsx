import React from 'react';
import Svg, { Line } from 'react-native-svg';

export const HashtagIcon = ({ width = 24, height = 24, stroke = 'currentColor' }) => (
  <Svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth="1.5">
    <Line x1="4" y1="9" x2="20" y2="9" />
    <Line x1="4" y1="15" x2="20" y2="15" />
    <Line x1="10" y1="3" x2="8" y2="21" />
    <Line x1="16" y1="3" x2="14" y2="21" />
  </Svg>
);
