import { Request, Response, NextFunction } from "express";

/**
 * Standard global error handling middleware.
 */
export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error("[Global Error Handler]", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
    status,
    timestamp: new Date().toISOString()
  });
}

/**
 * Catch-all router fallback for undefined paths.
 */
export function notFoundMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.status(404).json({
    error: `Cannot ${req.method} ${req.originalUrl}`,
    status: 404,
    timestamp: new Date().toISOString()
  });
}
