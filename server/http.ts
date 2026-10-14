import type { NextFunction, Request, RequestHandler, Response } from 'express';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export const notFound = (message: string) => new HttpError(404, message);
export const badRequest = (message: string) => new HttpError(400, message);

type Handler<Req extends Request> = (req: Req, res: Response) => unknown | Promise<unknown>;

/**
 * Wraps a route handler so every route shares one error path.
 * A returned object is sent as `{ success: true, ...object }`; handlers that
 * write the response themselves return nothing.
 */
export function route<Req extends Request = Request>(handler: Handler<Req>, fallbackMessage: string): RequestHandler {
  return async (req, res, _next: NextFunction) => {
    try {
      const result = await handler(req as Req, res);
      if (result !== undefined && !res.headersSent) {
        res.json({ success: true, ...(result as object) });
      }
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ success: false, code: err.code, message: err.message });
        return;
      }
      console.error(fallbackMessage, err);
      res.status(500).json({ success: false, message: fallbackMessage });
    }
  };
}
