/** Thrown by the API client whenever a request completes with a non-2xx status. */
export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    super(`API request failed: ${status} ${statusText}`);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}
