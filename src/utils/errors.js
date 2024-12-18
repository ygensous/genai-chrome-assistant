export class APIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

export class ContentExtractionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContentExtractionError';
  }
}
