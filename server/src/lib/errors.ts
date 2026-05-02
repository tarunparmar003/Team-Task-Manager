export class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export const BadRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, details);
export const Unauthorized = (message = 'Unauthorized') => new HttpError(401, message);
export const Forbidden = (message = 'Forbidden') => new HttpError(403, message);
export const NotFound = (message = 'Not found') => new HttpError(404, message);
export const Conflict = (message: string) => new HttpError(409, message);
