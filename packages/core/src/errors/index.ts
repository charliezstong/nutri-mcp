/**
 * Base error class for nutri-mcp
 */
export class NutriMcpError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.name = 'NutriMcpError';
    this.code = code;
    this.retryable = retryable;
  }
}

/**
 * Product not found error
 */
export class ProductNotFoundError extends NutriMcpError {
  readonly barcode: string;

  constructor(barcode: string) {
    super(`Product not found: ${barcode}`, 'PRODUCT_NOT_FOUND', false);
    this.name = 'ProductNotFoundError';
    this.barcode = barcode;
  }
}

/**
 * Invalid barcode error
 */
export class InvalidBarcodeError extends NutriMcpError {
  readonly barcode: string;
  readonly reason: string;

  constructor(barcode: string, reason: string) {
    super(`Invalid barcode "${barcode}": ${reason}`, 'INVALID_BARCODE', false);
    this.name = 'InvalidBarcodeError';
    this.barcode = barcode;
    this.reason = reason;
  }
}

/**
 * Validation error
 */
export class ValidationError extends NutriMcpError {
  readonly field: string;

  constructor(field: string, message: string) {
    super(`Validation error for "${field}": ${message}`, 'VALIDATION_ERROR', false);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Provider unavailable error
 */
export class ProviderUnavailableError extends NutriMcpError {
  readonly provider: string;

  constructor(provider: string) {
    super(`Provider "${provider}" is currently unavailable`, 'PROVIDER_UNAVAILABLE', true);
    this.name = 'ProviderUnavailableError';
    this.provider = provider;
  }
}

/**
 * API error
 */
export class ApiError extends NutriMcpError {
  readonly statusCode: number;
  readonly provider: string;

  constructor(provider: string, statusCode: number, message: string) {
    const retryable = [429, 500, 502, 503, 504].includes(statusCode);
    super(`${provider} API error (${statusCode}): ${message}`, 'API_ERROR', retryable);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.provider = provider;
  }
}

/**
 * Format error for MCP tool response
 */
export function formatErrorForMcp(error: unknown): { content: Array<{ type: 'text'; text: string }>; isError: true } {
  let message: string;

  if (error instanceof NutriMcpError) {
    message = `Error [${error.code}]: ${error.message}`;
  } else if (error instanceof Error) {
    message = `Error: ${error.message}`;
  } else {
    message = 'An unexpected error occurred';
  }

  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}
