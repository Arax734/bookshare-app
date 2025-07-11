import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

export const MapPinIcon = ({ width = 24, height = 24, fill = 'none' }) => (
  <Svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth="1.5">
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <Circle cx="12" cy="10" r="3" />
  </Svg>
);
