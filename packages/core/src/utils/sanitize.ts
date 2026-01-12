/**
 * Input sanitization utilities
 */

/**
 * Escape special characters in Lucene queries
 */
export function escapeLuceneQuery(query: string): string {
  // Lucene special characters: + - && || ! ( ) { } [ ] ^ " ~ * ? : \ /
  const specialChars = /[+\-&|!(){}[\]^"~*?:\\/]/g;
  return query.replace(specialChars, '\\$&');
}

/**
 * Sanitize a search query string
 */
export function sanitizeSearchQuery(query: string, maxLength = 200): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .slice(0, maxLength);          // Limit length
}

/**
 * Sanitize a string for use in URL path
 */
export function sanitizeUrlPath(path: string): string {
  return encodeURIComponent(
    path
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, ''),
  );
}

/**
 * Sanitize string for use as Lucene field value
 */
export function sanitizeLuceneValue(value: string): string {
  // Escape backslashes first, then quotes
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Build safe Lucene query from parameters
 */
export function buildLuceneQuery(params: Record<string, string | undefined>): string {
  const parts: string[] = [];

  for (const [field, value] of Object.entries(params)) {
    if (value !== undefined && value.trim() !== '') {
      parts.push(`${field}:${sanitizeLuceneValue(value)}`);
    }
  }

  return parts.join(' AND ');
}

/**
 * Sanitize object by removing undefined/null values
 */
export function sanitizeParams<T extends Record<string, unknown>>(
  params: T,
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}

/**
 * Strip HTML tags from a string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}
