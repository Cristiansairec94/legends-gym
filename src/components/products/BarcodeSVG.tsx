import React, { useMemo } from 'react';
import { encodeBarcodeCode128 } from '../../utils/barcode';

interface BarcodeSVGProps {
  value: string;
  height?: number;
  showText?: boolean;
  className?: string;
  barColor?: string;
  textColor?: string;
  fontSize?: number;
}

export const BarcodeSVG: React.FC<BarcodeSVGProps> = ({
  value,
  height = 42,
  showText = true,
  className = '',
  barColor = '#000000',
  textColor = '#000000',
  fontSize = 11,
}) => {
  const encoded = useMemo(() => encodeBarcodeCode128(value), [value]);

  const svgHeight = height + (showText ? fontSize + 6 : 0);

  return (
    <svg
      viewBox={`0 0 ${encoded.totalWidth} ${svgHeight}`}
      className={`select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Bars */}
      {encoded.bars.map((bar, idx) => (
        <rect
          key={idx}
          x={bar.x}
          y={0}
          width={bar.width}
          height={height}
          fill={barColor}
        />
      ))}

      {/* Human Readable Text */}
      {showText && (
        <text
          x={encoded.totalWidth / 2}
          y={height + fontSize + 2}
          textAnchor="middle"
          fill={textColor}
          fontSize={fontSize}
          fontFamily="monospace"
          fontWeight="bold"
          letterSpacing="1px"
        >
          {encoded.text}
        </text>
      )}
    </svg>
  );
};
