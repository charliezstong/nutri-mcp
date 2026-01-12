import { describe, it, expect } from 'vitest';
import {
  isValidBarcode,
  detectBarcodeFormat,
  normalizeToEAN13,
  validateBarcode,
} from '../../src/utils/barcode.js';

describe('Barcode Utilities', () => {
  describe('detectBarcodeFormat', () => {
    it('should detect EAN-13', () => {
      expect(detectBarcodeFormat('5901234123457')).toBe('EAN-13');
    });

    it('should detect EAN-8', () => {
      expect(detectBarcodeFormat('96385074')).toBe('EAN-8');
    });

    it('should detect UPC-A', () => {
      expect(detectBarcodeFormat('012345678905')).toBe('UPC-A');
    });

    it('should detect UPC-E', () => {
      expect(detectBarcodeFormat('0123456')).toBe('UPC-E'); // 7 digits
      expect(detectBarcodeFormat('012345')).toBe('UPC-E');  // 6 digits
    });

    it('should return UNKNOWN for invalid length', () => {
      expect(detectBarcodeFormat('12345')).toBe('UNKNOWN');
      expect(detectBarcodeFormat('1234567890123456')).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for non-numeric', () => {
      expect(detectBarcodeFormat('123456789012A')).toBe('UNKNOWN');
    });
  });

  describe('isValidBarcode', () => {
    it('should validate correct EAN-13', () => {
      expect(isValidBarcode('5901234123457')).toBe(true);
      expect(isValidBarcode('4006381333931')).toBe(true);
    });

    it('should reject invalid EAN-13 check digit', () => {
      expect(isValidBarcode('5901234123456')).toBe(false);
    });

    it('should validate correct UPC-A', () => {
      expect(isValidBarcode('012345678905')).toBe(true);
    });

    it('should reject non-numeric barcodes', () => {
      expect(isValidBarcode('ABC123456789')).toBe(false);
    });
  });

  describe('normalizeToEAN13', () => {
    it('should return EAN-13 unchanged', () => {
      expect(normalizeToEAN13('5901234123457')).toBe('5901234123457');
    });

    it('should convert UPC-A to EAN-13', () => {
      expect(normalizeToEAN13('012345678905')).toBe('0012345678905');
    });

    it('should convert EAN-8 to EAN-13', () => {
      expect(normalizeToEAN13('96385074')).toBe('0000096385074');
    });

    it('should return null for invalid barcode', () => {
      expect(normalizeToEAN13('12345')).toBe(null);
    });
  });

  describe('validateBarcode', () => {
    it('should return detailed validation result', () => {
      const result = validateBarcode('5901234123457');
      expect(result.valid).toBe(true);
      expect(result.format).toBe('EAN-13');
      expect(result.normalized).toBe('5901234123457');
    });

    it('should provide error message for invalid barcode', () => {
      const result = validateBarcode('12345');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid barcode length');
    });

    it('should provide error for non-string input', () => {
      const result = validateBarcode('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-empty string');
    });
  });
});
