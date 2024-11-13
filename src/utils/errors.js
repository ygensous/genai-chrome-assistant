export class APIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'APIError';
  }
}

export class ContentExtractionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ContentExtractionError';
  }
}
