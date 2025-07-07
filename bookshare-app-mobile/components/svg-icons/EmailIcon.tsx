import React from 'react';
import Svg, { Path } from 'react-native-svg';

export const EmailIcon = ({ width = 18, height = 18, fill = 'gray' }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"
        fill={fill}
      />
    </Svg>
  );
};
