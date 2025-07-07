import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface LanguageIconProps {
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  opacity?: number;
  className?: string;
}

export const LanguageIcon: React.FC<LanguageIconProps> = ({
  width = 24,
  height = 24,
  stroke,
  fill,
  opacity = 1,
  className,
}) => {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      opacity={opacity}
      className={className}>
      <Path
        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9M21 12h-6m-6 4h7a3 3 0 003-3V9m-8 3v2m0-8v2"
        stroke={stroke || 'currentColor'}
        fill={fill || 'none'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};
