/**
 * Lightweight Code 128 (Subset B) barcode encoder.
 * Generates exact bar and space coordinates for crisp SVG rendering.
 * 100% compatible with optical, laser, and camera barcode scanners.
 */

// Code 128 patterns for indices 0 to 106
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

export interface BarcodeBar {
  x: number;
  width: number;
}

export interface EncodedBarcode {
  bars: BarcodeBar[];
  totalWidth: number;
  text: string;
}

export function encodeBarcodeCode128(text: string): EncodedBarcode {
  const cleanText = text.trim() || '000000';
  const startCode = 104; // Code 128B start symbol
  const codes: number[] = [startCode];
  let checksum = startCode;

  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    // ASCII 32 to 127
    const code = charCode - 32;
    if (code >= 0 && code <= 95) {
      codes.push(code);
      checksum += code * (i + 1);
    }
  }

  const checkDigit = checksum % 103;
  codes.push(checkDigit);
  codes.push(106); // Stop symbol

  let patternStr = '';
  for (const c of codes) {
    patternStr += CODE128_PATTERNS[c];
  }

  // Convert pattern to bars
  // Characters alternate between bar and space
  const bars: BarcodeBar[] = [];
  let currentX = 10; // Quiet zone on left

  for (let i = 0; i < patternStr.length; i++) {
    const width = parseInt(patternStr[i], 10);
    const isBar = i % 2 === 0;
    if (isBar) {
      bars.push({ x: currentX, width });
    }
    currentX += width;
  }

  const totalWidth = currentX + 10; // Quiet zone on right

  return {
    bars,
    totalWidth,
    text: cleanText,
  };
}
