/**
 * Barcode validation utilities
 * Supports: EAN-8, EAN-13, UPC-A, UPC-E
 */

export type BarcodeFormat = 'EAN-8' | 'EAN-13' | 'UPC-A' | 'UPC-E' | 'UNKNOWN';

/**
 * Validate barcode check digit using standard algorithm
 */
function validateCheckDigit(barcode: string): boolean {
  const digits = barcode.split('').map(Number);
  const checkDigit = digits.pop()!;

  let sum = 0;
  const isEven = digits.length % 2 === 0;

  for (let i = 0; i < digits.length; i++) {
    const digit = digits[i]!;
    // For EAN-13/UPC-A: odd positions (0,2,4...) multiply by 1, even by 3
    // For EAN-8: even positions multiply by 3, odd by 1
    const multiplier = isEven
      ? i % 2 === 0 ? 1 : 3
      : i % 2 === 0 ? 3 : 1;
    sum += digit * multiplier;
  }

  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
}

/**
 * Detect barcode format
 */
export function detectBarcodeFormat(barcode: string): BarcodeFormat {
  // Remove whitespace
  const cleaned = barcode.trim();

  // Must be all digits
  if (!/^\d+$/.test(cleaned)) {
    return 'UNKNOWN';
  }

  switch (cleaned.length) {
    case 8:
      return 'EAN-8';
    case 12:
      return 'UPC-A';
    case 13:
      return 'EAN-13';
    case 6:
    case 7:
      return 'UPC-E';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Validate a barcode (format and check digit)
 */
export function isValidBarcode(barcode: string): boolean {
  const format = detectBarcodeFormat(barcode);

  if (format === 'UNKNOWN') {
    return false;
  }

  // UPC-E doesn't have standard check digit validation
  if (format === 'UPC-E') {
    return true;
  }

  return validateCheckDigit(barcode.trim());
}

/**
 * Normalize barcode to EAN-13 format
 * - UPC-A (12 digits) -> add leading 0
 * - EAN-8 (8 digits) -> add 5 leading 0s
 * - EAN-13 (13 digits) -> unchanged
 */
export function normalizeToEAN13(barcode: string): string | null {
  const cleaned = barcode.trim();
  const format = detectBarcodeFormat(cleaned);

  switch (format) {
    case 'EAN-13':
      return cleaned;
    case 'UPC-A':
      return '0' + cleaned;
    case 'EAN-8':
      return '00000' + cleaned;
    case 'UPC-E':
      // UPC-E expansion is complex, return as-is
      return cleaned;
    default:
      return null;
  }
}

/**
 * Get barcode validation result with details
 */
export interface BarcodeValidationResult {
  valid: boolean;
  format: BarcodeFormat;
  normalized?: string;
  error?: string;
}

export function validateBarcode(barcode: string): BarcodeValidationResult {
  if (!barcode || typeof barcode !== 'string') {
    return {
      valid: false,
      format: 'UNKNOWN',
      error: 'Barcode must be a non-empty string',
    };
  }

  const cleaned = barcode.trim();

  if (!/^\d+$/.test(cleaned)) {
    return {
      valid: false,
      format: 'UNKNOWN',
      error: 'Barcode must contain only digits',
    };
  }

  const format = detectBarcodeFormat(cleaned);

  if (format === 'UNKNOWN') {
    return {
      valid: false,
      format: 'UNKNOWN',
      error: `Invalid barcode length: ${cleaned.length}. Expected 8, 12, or 13 digits`,
    };
  }

  if (format !== 'UPC-E' && !validateCheckDigit(cleaned)) {
    return {
      valid: false,
      format,
      error: 'Invalid check digit',
    };
  }

  return {
    valid: true,
    format,
    normalized: normalizeToEAN13(cleaned) ?? cleaned,
  };
}

/**
 * All equivalent GTIN spellings of a barcode (UPC-A, EAN-13, GTIN-14 and the
 * unpadded form). Data sources disagree on leading zeros: USDA often stores
 * 14-digit GTINs, Open Food Facts 13-digit EANs, retailers 12-digit UPCs.
 */
export function gtinVariants(barcode: string): string[] {
  const cleaned = barcode.trim();
  if (!/^\d+$/.test(cleaned)) return [];
  const core = cleaned.replace(/^0+/, '') || '0';
  const variants = new Set<string>([cleaned, core]);
  for (const length of [8, 12, 13, 14]) {
    if (core.length <= length) {
      variants.add(core.padStart(length, '0'));
    }
  }
  return [...variants];
}

/**
 * Whether two barcodes denote the same GTIN once leading zeros are ignored.
 */
export function sameGtin(a: string, b: string): boolean {
  const strip = (s: string): string => s.trim().replace(/^0+/, '');
  return /^\d+$/.test(a.trim()) && /^\d+$/.test(b.trim()) && strip(a) === strip(b);
}
