import type { Request, Response, NextFunction } from "express";
import { isIPBlocked } from "./blockManager.js";

export function securityBlockMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const ip =
    req.ip ||
    req.socket.remoteAddress ||
    "unknown";

  const normalizedIP = ip.replace(/^::ffff:/, "");

  if (isIPBlocked(normalizedIP)) {
    console.log(
      `🚫 BLOCKED REQUEST: ${normalizedIP} ${req.method} ${req.originalUrl}`,
    );

    return res.status(403).json({
      error: "Forbidden",
      message: "Your IP address has been temporarily blocked.",
      ip_address: normalizedIP,
    });
  }

  next();
}
