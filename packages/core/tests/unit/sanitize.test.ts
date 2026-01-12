import { describe, it, expect } from 'vitest';
import {
  escapeLuceneQuery,
  sanitizeSearchQuery,
  sanitizeLuceneValue,
  buildLuceneQuery,
  stripHtml,
  truncate,
} from '../../src/utils/sanitize.js';

describe('Sanitization Utilities', () => {
  describe('escapeLuceneQuery', () => {
    it('should escape Lucene special characters', () => {
      expect(escapeLuceneQuery('test+query')).toBe('test\\+query');
      expect(escapeLuceneQuery('foo && bar')).toBe('foo \\&\\& bar');
      expect(escapeLuceneQuery('field:value')).toBe('field\\:value');
      expect(escapeLuceneQuery('test*')).toBe('test\\*');
    });

    it('should handle strings without special characters', () => {
      expect(escapeLuceneQuery('normal query')).toBe('normal query');
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should trim whitespace', () => {
      expect(sanitizeSearchQuery('  test  ')).toBe('test');
    });

    it('should normalize whitespace', () => {
      expect(sanitizeSearchQuery('test   multiple   spaces')).toBe('test multiple spaces');
    });

    it('should limit length', () => {
      const longQuery = 'a'.repeat(300);
      expect(sanitizeSearchQuery(longQuery).length).toBe(200);
    });
  });

  describe('sanitizeLuceneValue', () => {
    it('should wrap in quotes and escape inner quotes', () => {
      expect(sanitizeLuceneValue('test')).toBe('"test"');
      expect(sanitizeLuceneValue('test"value')).toBe('"test\\"value"');
    });

    it('should escape backslashes', () => {
      expect(sanitizeLuceneValue('test\\value')).toBe('"test\\\\value"');
    });
  });

  describe('buildLuceneQuery', () => {
    it('should build query from parameters', () => {
      const query = buildLuceneQuery({
        category: 'snacks',
        brand: 'test',
      });
      expect(query).toBe('category:"snacks" AND brand:"test"');
    });

    it('should skip undefined values', () => {
      const query = buildLuceneQuery({
        category: 'snacks',
        brand: undefined,
      });
      expect(query).toBe('category:"snacks"');
    });

    it('should return empty string for all undefined', () => {
      const query = buildLuceneQuery({
        category: undefined,
        brand: undefined,
      });
      expect(query).toBe('');
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
      expect(stripHtml('No tags here')).toBe('No tags here');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 8)).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });
  });
});
