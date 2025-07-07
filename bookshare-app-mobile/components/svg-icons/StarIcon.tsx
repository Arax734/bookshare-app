import React from 'react';
import Svg, { Path } from 'react-native-svg';

export function StarIcon({ width = 24, height = 24, fill = 'currentColor' }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill={fill}>
      <Path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27z" />
    </Svg>
  );
}
